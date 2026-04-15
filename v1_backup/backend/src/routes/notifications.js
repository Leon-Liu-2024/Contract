const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/:userId', (req, res) => {
  try {
    const { unread_only = 'false', limit = 50 } = req.query;
    let query = `
      SELECT n.*, c.contract_no, c.title as contract_title
      FROM notifications n
      LEFT JOIN contracts c ON n.related_contract_id = c.id
      WHERE n.user_id = ?
    `;
    const params = [req.params.userId];
    if (unread_only === 'true') query += ' AND n.is_read = 0';
    query += ' ORDER BY n.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const result = pool.query(query, params);
    const unreadCount = pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.params.userId]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all/:userId', (req, res) => {
  try {
    pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
