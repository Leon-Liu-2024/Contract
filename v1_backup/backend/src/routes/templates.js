const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 取得所有範本
router.get('/', (req, res) => {
  try {
    const { category, active_only = 'true' } = req.query;
    let query = 'SELECT t.*, u.name as creator_name FROM contract_templates t LEFT JOIN users u ON t.created_by = u.id';
    const conditions = [];
    const params = [];

    if (active_only === 'true') conditions.push('t.is_active = 1');
    if (category) { params.push(category); conditions.push('t.category = ?'); }
    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY t.created_at DESC';

    const result = pool.query(query, params);
    // 解析 fields JSON
    result.rows.forEach(r => {
      if (typeof r.fields === 'string') r.fields = JSON.parse(r.fields);
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取得單一範本
router.get('/:id', (req, res) => {
  try {
    const result = pool.query('SELECT * FROM contract_templates WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '範本不存在' });
    const row = result.rows[0];
    if (typeof row.fields === 'string') row.fields = JSON.parse(row.fields);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 建立範本
router.post('/', (req, res) => {
  try {
    const { name, category, description, content, fields, created_by } = req.body;
    const result = pool.query(`
      INSERT INTO contract_templates (name, category, description, content, fields, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, category, description, content, JSON.stringify(fields || []), created_by]);

    const newTemplate = pool.query('SELECT * FROM contract_templates WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newTemplate.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新範本
router.put('/:id', (req, res) => {
  try {
    const { name, category, description, content, fields, is_active } = req.body;
    pool.query(`
      UPDATE contract_templates SET
        name=?, category=?, description=?, content=?, fields=?,
        is_active=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `, [name, category, description, content, JSON.stringify(fields || []),
        is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id]);

    const updated = pool.query('SELECT * FROM contract_templates WHERE id = ?', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
