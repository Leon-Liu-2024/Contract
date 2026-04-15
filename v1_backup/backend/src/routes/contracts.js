const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const { generateContractNo } = require('../utils/contractNo');

// 檔案上傳設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// 取得合約列表
router.get('/', (req, res) => {
  try {
    const {
      page = 1, limit = 20, status, category,
      search, start_date, end_date, sort = 'created_at', order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) { conditions.push(`c.status = ?`); params.push(status); }
    if (category) { conditions.push(`c.category = ?`); params.push(category); }
    if (search) {
      conditions.push(`(c.title LIKE ? OR c.contract_no LIKE ? OR c.party_a LIKE ? OR c.party_b LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (start_date) { conditions.push(`c.start_date >= ?`); params.push(start_date); }
    if (end_date) { conditions.push(`c.end_date <= ?`); params.push(end_date); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['created_at', 'end_date', 'amount', 'title', 'contract_no'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = pool.query(`SELECT COUNT(*) as count FROM contracts c ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, parseInt(limit), offset];
    const result = pool.query(`
      SELECT c.*, u.name as creator_name, u.department as creator_department
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `, dataParams);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total, totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取得單一合約詳情
router.get('/:id', (req, res) => {
  try {
    const result = pool.query(`
      SELECT c.*, u.name as creator_name, u.department as creator_department,
             t.name as template_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN contract_templates t ON c.template_id = t.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '合約不存在' });
    }

    // 取得簽核記錄
    const approvalRecords = pool.query(`
      SELECT * FROM approval_records WHERE contract_id = ? ORDER BY created_at DESC
    `, [req.params.id]);

    // 為每筆記錄取得步驟
    for (const record of approvalRecords.rows) {
      const steps = pool.query(`
        SELECT ast.*, u.name as approver_name, u.department as approver_department
        FROM approval_steps ast
        LEFT JOIN users u ON ast.approver_id = u.id
        WHERE ast.record_id = ?
        ORDER BY ast.step_order
      `, [record.id]);
      record.steps = steps.rows;
    }

    // 取得操作日誌
    const logs = pool.query(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.contract_id = ?
      ORDER BY al.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json({
      ...result.rows[0],
      approval_records: approvalRecords.rows,
      audit_logs: logs.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 建立合約
router.post('/', upload.array('attachments', 5), (req, res) => {
  try {
    const {
      title, category, party_a, party_b, amount, currency,
      start_date, end_date, description, terms, template_id,
      is_auto_renew, renewal_period, renewal_notice_days, created_by
    } = req.body;

    const contractNo = generateContractNo(category);
    const attachments = req.files ? req.files.map(f => ({
      filename: f.originalname, path: f.filename, size: f.size
    })) : [];

    const db = pool.raw;
    const insertContract = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO contracts (contract_no, title, category, party_a, party_b, amount, currency,
          start_date, end_date, description, terms, template_id, is_auto_renew,
          renewal_period, renewal_notice_days, attachment_paths, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        contractNo, title, category, party_a, party_b, amount || null, currency || 'TWD',
        start_date, end_date, description || null, terms || null, template_id || null,
        is_auto_renew ? 1 : 0, renewal_period || null, renewal_notice_days || 30,
        JSON.stringify(attachments), created_by
      );

      // 記錄操作日誌
      db.prepare(`
        INSERT INTO audit_logs (contract_id, user_id, action, details)
        VALUES (?, ?, 'create', ?)
      `).run(info.lastInsertRowid, created_by, JSON.stringify({ title, contract_no: contractNo }));

      // 取得新建立的合約
      return db.prepare('SELECT * FROM contracts WHERE id = ?').get(info.lastInsertRowid);
    });

    const newContract = insertContract();
    res.status(201).json(newContract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新合約
router.put('/:id', (req, res) => {
  try {
    const {
      title, category, party_a, party_b, amount, currency,
      start_date, end_date, description, terms,
      is_auto_renew, renewal_period, renewal_notice_days, updated_by
    } = req.body;

    const result = pool.query(`
      UPDATE contracts SET
        title=?, category=?, party_a=?, party_b=?, amount=?, currency=?,
        start_date=?, end_date=?, description=?, terms=?,
        is_auto_renew=?, renewal_period=?, renewal_notice_days=?,
        updated_at=datetime('now','localtime')
      WHERE id=? AND status IN ('draft', 'rejected')
    `, [title, category, party_a, party_b, amount, currency,
        start_date, end_date, description, terms,
        is_auto_renew ? 1 : 0, renewal_period, renewal_notice_days, req.params.id]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: '合約無法編輯（僅草稿或已退回狀態可編輯）' });
    }

    pool.query(`
      INSERT INTO audit_logs (contract_id, user_id, action, details) VALUES (?, ?, 'update', ?)
    `, [req.params.id, updated_by, JSON.stringify({ title })]);

    const updated = pool.query('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 歸檔合約
router.post('/:id/archive', (req, res) => {
  try {
    const result = pool.query(`
      UPDATE contracts SET status = 'archived', updated_at = datetime('now','localtime')
      WHERE id = ? AND status IN ('expired', 'terminated', 'approved', 'active')
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: '此合約無法歸檔' });
    }

    pool.query(`INSERT INTO audit_logs (contract_id, user_id, action, details) VALUES (?, ?, 'archive', '{}')`,
      [req.params.id, req.body.user_id]);

    const updated = pool.query('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 終止合約
router.post('/:id/terminate', (req, res) => {
  try {
    const result = pool.query(`
      UPDATE contracts SET status = 'terminated', updated_at = datetime('now','localtime')
      WHERE id = ? AND status = 'active'
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: '僅生效中的合約可終止' });
    }

    pool.query(`INSERT INTO audit_logs (contract_id, user_id, action, details) VALUES (?, ?, 'terminate', ?)`,
      [req.params.id, req.body.user_id, JSON.stringify({ reason: req.body.reason })]);

    const updated = pool.query('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
