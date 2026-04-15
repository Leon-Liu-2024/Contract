const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', (req, res) => {
  try {
    const { department, role, active_only = 'true' } = req.query;
    let query = 'SELECT id, employee_id, name, email, department, position, role, is_active FROM users';
    const conditions = [];
    const params = [];

    if (active_only === 'true') conditions.push('is_active = 1');
    if (department) { params.push(department); conditions.push('department = ?'); }
    if (role) { params.push(role); conditions.push('role = ?'); }
    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY department, name';

    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const result = pool.query(
      'SELECT id, employee_id, name, email, department, position, role, is_active FROM users WHERE id = ?',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '使用者不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
