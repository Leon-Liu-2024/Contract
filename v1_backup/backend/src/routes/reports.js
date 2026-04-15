const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 儀表板統計
router.get('/dashboard', (req, res) => {
  try {
    const statusCounts = pool.query('SELECT status, COUNT(*) as count FROM contracts GROUP BY status');

    const categoryCounts = pool.query(`
      SELECT category, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
      FROM contracts WHERE status NOT IN ('draft', 'archived')
      GROUP BY category
    `);

    const monthlyTrend = pool.query(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM contracts
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `);

    const expiringContracts = pool.query(`
      SELECT id, contract_no, title, party_b, end_date, status,
             CAST(julianday(end_date) - julianday('now') AS INTEGER) as days_remaining
      FROM contracts
      WHERE status = 'active' AND end_date BETWEEN date('now') AND date('now', '+30 days')
      ORDER BY end_date ASC
      LIMIT 10
    `);

    const recentActivity = pool.query(`
      SELECT al.*, u.name as user_name, c.title as contract_title, c.contract_no
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN contracts c ON al.contract_id = c.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    const pendingApprovals = pool.query("SELECT COUNT(*) as count FROM approval_steps WHERE status = 'pending'");

    res.json({
      status_summary: statusCounts.rows,
      category_summary: categoryCounts.rows,
      monthly_trend: monthlyTrend.rows,
      expiring_contracts: expiringContracts.rows,
      recent_activity: recentActivity.rows,
      pending_approvals: parseInt(pendingApprovals.rows[0].count),
      total_contracts: statusCounts.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 合約金額統計
router.get('/amount-summary', (req, res) => {
  try {
    const { year } = req.query;
    let yearFilter = '';
    const params = [];
    if (year) {
      yearFilter = "AND strftime('%Y', created_at) = ?";
      params.push(year.toString());
    }

    const result = pool.query(`
      SELECT
        category,
        COUNT(*) as contract_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(MAX(amount), 0) as max_amount,
        COALESCE(MIN(amount), 0) as min_amount
      FROM contracts
      WHERE status NOT IN ('draft', 'archived') ${yearFilter}
      GROUP BY category
      ORDER BY total_amount DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 簽核效率統計
router.get('/approval-efficiency', (req, res) => {
  try {
    const result = pool.query(`
      SELECT
        af.name as flow_name,
        COUNT(ar.id) as total_records,
        COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN ar.status = 'rejected' THEN 1 END) as rejected_count,
        ROUND(AVG(CASE WHEN ar.status = 'approved'
          THEN (julianday(ar.updated_at) - julianday(ar.created_at)) * 24 END), 1) as avg_hours
      FROM approval_records ar
      LEFT JOIN approval_flows af ON ar.flow_id = af.id
      GROUP BY af.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
