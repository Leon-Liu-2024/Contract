const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 取得簽核流程定義列表
router.get('/flows', (req, res) => {
  try {
    const result = pool.query('SELECT * FROM approval_flows WHERE is_active = 1 ORDER BY name');
    result.rows.forEach(r => {
      if (typeof r.steps === 'string') r.steps = JSON.parse(r.steps);
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 送簽
router.post('/submit', (req, res) => {
  try {
    const { contract_id, flow_id, created_by } = req.body;
    const db = pool.raw;

    const result = db.transaction(() => {
      // 驗證合約狀態
      const contract = db.prepare(
        "SELECT * FROM contracts WHERE id = ? AND status IN ('draft', 'rejected')"
      ).get(contract_id);
      if (!contract) throw new Error('合約狀態不允許送簽');

      // 取得流程定義
      const flow = db.prepare('SELECT * FROM approval_flows WHERE id = ? AND is_active = 1').get(flow_id);
      if (!flow) throw new Error('簽核流程不存在');

      const steps = JSON.parse(flow.steps);

      // 為每個步驟找到對應的簽核人
      const approvers = [];
      for (const step of steps) {
        let sql = 'SELECT id FROM users WHERE is_active = 1 AND role = ?';
        const params = [step.role];
        if (step.department) {
          sql += ' AND department = ?';
          params.push(step.department);
        }
        sql += ' LIMIT 1';
        const approver = db.prepare(sql).get(...params);
        if (!approver) throw new Error(`找不到步驟「${step.name}」的簽核人`);
        approvers.push({ ...step, approver_id: approver.id });
      }

      // 建立簽核記錄
      const recordInfo = db.prepare(`
        INSERT INTO approval_records (contract_id, flow_id, current_step, total_steps, status, created_by)
        VALUES (?, ?, 1, ?, 'in_progress', ?)
      `).run(contract_id, flow_id, steps.length, created_by);
      const recordId = recordInfo.lastInsertRowid;

      // 建立各步驟
      const insertStep = db.prepare(`
        INSERT INTO approval_steps (record_id, step_order, step_name, approver_id, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < approvers.length; i++) {
        insertStep.run(recordId, i + 1, approvers[i].name, approvers[i].approver_id,
          i === 0 ? 'pending' : 'waiting');
      }

      // 更新合約狀態
      db.prepare("UPDATE contracts SET status = 'in_review', updated_at = datetime('now','localtime') WHERE id = ?")
        .run(contract_id);

      // 通知第一位簽核人
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, related_contract_id)
        VALUES (?, '待審核合約', ?, 'approval', ?)
      `).run(approvers[0].approver_id, `合約「${contract.title}」需要您的審核`, contract_id);

      // 日誌
      db.prepare(`INSERT INTO audit_logs (contract_id, user_id, action, details) VALUES (?, ?, 'submit', ?)`)
        .run(contract_id, created_by, JSON.stringify({ flow_name: flow.name }));

      // 回傳完整記錄
      const record = db.prepare('SELECT * FROM approval_records WHERE id = ?').get(recordId);
      const stepsResult = db.prepare(`
        SELECT ast.*, u.name as approver_name
        FROM approval_steps ast LEFT JOIN users u ON ast.approver_id = u.id
        WHERE ast.record_id = ? ORDER BY ast.step_order
      `).all(recordId);
      record.steps = stepsResult;
      return record;
    })();

    res.status(201).json(result);
  } catch (err) {
    res.status(err.message.includes('不允許') || err.message.includes('不存在') || err.message.includes('找不到') ? 400 : 500)
      .json({ error: err.message });
  }
});

// 審核操作（核准/退回/拒絕）
router.post('/action', (req, res) => {
  try {
    const { step_id, action, comment, user_id } = req.body;
    if (!['approve', 'reject', 'return'].includes(action)) {
      return res.status(400).json({ error: '無效的操作' });
    }

    const db = pool.raw;

    db.transaction(() => {
      // 取得步驟資訊
      const step = db.prepare(`
        SELECT ast.*, ar.contract_id, ar.current_step, ar.total_steps, ar.id as record_id
        FROM approval_steps ast
        JOIN approval_records ar ON ast.record_id = ar.id
        WHERE ast.id = ? AND ast.approver_id = ? AND ast.status = 'pending'
      `).get(step_id, user_id);

      if (!step) throw new Error('此步驟不可操作（非待審核或非您的權限）');

      // 更新步驟狀態
      const stepStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned';
      db.prepare(`
        UPDATE approval_steps SET action=?, comment=?, status=?, acted_at=datetime('now','localtime')
        WHERE id = ?
      `).run(action, comment || null, stepStatus, step_id);

      if (action === 'approve') {
        if (step.current_step < step.total_steps) {
          const nextStep = step.current_step + 1;
          db.prepare("UPDATE approval_records SET current_step=?, updated_at=datetime('now','localtime') WHERE id=?")
            .run(nextStep, step.record_id);

          // 啟動下一步驟
          const nextStepRow = db.prepare(
            "UPDATE approval_steps SET status='pending' WHERE record_id=? AND step_order=? RETURNING approver_id"
          ).get(step.record_id, nextStep);

          if (nextStepRow) {
            const contractTitle = db.prepare('SELECT title FROM contracts WHERE id=?').get(step.contract_id);
            db.prepare(`
              INSERT INTO notifications (user_id, title, message, type, related_contract_id)
              VALUES (?, '待審核合約', ?, 'approval', ?)
            `).run(nextStepRow.approver_id, `合約「${contractTitle.title}」需要您的審核`, step.contract_id);
          }
        } else {
          // 全部核准
          db.prepare("UPDATE approval_records SET status='approved', updated_at=datetime('now','localtime') WHERE id=?")
            .run(step.record_id);
          db.prepare("UPDATE contracts SET status='active', updated_at=datetime('now','localtime') WHERE id=?")
            .run(step.contract_id);

          // 建立到期提醒
          const c = db.prepare('SELECT * FROM contracts WHERE id=?').get(step.contract_id);
          const noticeDays = c.renewal_notice_days || 30;
          db.prepare(`
            INSERT INTO reminders (contract_id, reminder_type, reminder_date, days_before, message, recipients)
            VALUES (?, 'expiry', date(?, '-' || ? || ' days'), ?, ?, ?)
          `).run(c.id, c.end_date, noticeDays, noticeDays,
              `合約「${c.title}」將於 ${c.end_date} 到期`, JSON.stringify([c.created_by]));
        }
      } else if (action === 'reject') {
        db.prepare("UPDATE approval_records SET status='rejected', updated_at=datetime('now','localtime') WHERE id=?")
          .run(step.record_id);
        db.prepare("UPDATE contracts SET status='rejected', updated_at=datetime('now','localtime') WHERE id=?")
          .run(step.contract_id);
      } else if (action === 'return') {
        db.prepare("UPDATE approval_records SET status='pending', current_step=1, updated_at=datetime('now','localtime') WHERE id=?")
          .run(step.record_id);
        db.prepare("UPDATE approval_steps SET status='waiting', action=NULL, comment=NULL, acted_at=NULL WHERE record_id=? AND step_order > 0")
          .run(step.record_id);
        db.prepare("UPDATE contracts SET status='draft', updated_at=datetime('now','localtime') WHERE id=?")
          .run(step.contract_id);
      }

      // 日誌
      db.prepare(`INSERT INTO audit_logs (contract_id, user_id, action, details) VALUES (?, ?, ?, ?)`)
        .run(step.contract_id, user_id, `approval_${action}`, JSON.stringify({ step_name: step.step_name, comment }));
    })();

    res.json({ success: true, action, step_id });
  } catch (err) {
    res.status(err.message.includes('不可操作') ? 400 : 500).json({ error: err.message });
  }
});

// 取得待我審核的項目
router.get('/pending/:userId', (req, res) => {
  try {
    const result = pool.query(`
      SELECT ast.id as step_id, ast.step_name, ast.step_order,
             c.id as contract_id, c.contract_no, c.title, c.category,
             c.party_a, c.party_b, c.amount, c.currency,
             ar.total_steps, ar.current_step,
             u.name as submitter_name, ar.created_at as submitted_at
      FROM approval_steps ast
      JOIN approval_records ar ON ast.record_id = ar.id
      JOIN contracts c ON ar.contract_id = c.id
      LEFT JOIN users u ON ar.created_by = u.id
      WHERE ast.approver_id = ? AND ast.status = 'pending'
      ORDER BY ar.created_at ASC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取得合約的簽核歷程
router.get('/history/:contractId', (req, res) => {
  try {
    const records = pool.query(`
      SELECT ar.*, af.name as flow_name
      FROM approval_records ar
      LEFT JOIN approval_flows af ON ar.flow_id = af.id
      WHERE ar.contract_id = ?
      ORDER BY ar.created_at DESC
    `, [req.params.contractId]);

    for (const record of records.rows) {
      const steps = pool.query(`
        SELECT ast.step_order, ast.step_name, u.name as approver_name, u.department as approver_department,
               ast.action, ast.comment, ast.status, ast.acted_at
        FROM approval_steps ast
        LEFT JOIN users u ON ast.approver_id = u.id
        WHERE ast.record_id = ?
        ORDER BY ast.step_order
      `, [record.id]);
      record.steps = steps.rows;
    }

    res.json(records.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
