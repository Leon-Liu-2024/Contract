const cron = require('node-cron');
const pool = require('../config/database');

function checkExpiringContracts() {
  try {
    const db = pool.raw;

    // 找出即將到期且尚未發送提醒的合約
    const reminders = db.prepare(`
      SELECT r.*, c.title, c.contract_no, c.end_date, c.created_by
      FROM reminders r
      JOIN contracts c ON r.contract_id = c.id
      WHERE r.is_sent = 0 AND r.reminder_date <= date('now')
        AND c.status = 'active'
    `).all();

    for (const reminder of reminders) {
      const recipients = JSON.parse(reminder.recipients || '[]');
      const userIds = recipients.length > 0 ? recipients : [reminder.created_by];
      for (const userId of userIds) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type, related_contract_id)
          VALUES (?, '合約到期提醒', ?, 'reminder', ?)
        `).run(userId, reminder.message, reminder.contract_id);
      }
      db.prepare("UPDATE reminders SET is_sent = 1, sent_at = datetime('now','localtime') WHERE id = ?")
        .run(reminder.id);
      console.log(`[提醒] 合約 ${reminder.contract_no} 到期提醒已發送`);
    }

    // 檢查已到期合約
    const expired = db.prepare(`
      SELECT id, contract_no, title FROM contracts
      WHERE status = 'active' AND end_date < date('now')
    `).all();

    for (const contract of expired) {
      db.prepare("UPDATE contracts SET status = 'expired', updated_at = datetime('now','localtime') WHERE id = ?")
        .run(contract.id);
      db.prepare("INSERT INTO audit_logs (contract_id, action, details) VALUES (?, 'auto_expire', ?)")
        .run(contract.id, JSON.stringify({ title: contract.title }));
      console.log(`[到期] 合約 ${contract.contract_no} 已自動標記為到期`);
    }

    // 自動續約
    const autoRenew = db.prepare(`
      SELECT * FROM contracts WHERE status = 'expired' AND is_auto_renew = 1 AND renewal_period IS NOT NULL
    `).all();

    for (const contract of autoRenew) {
      const newEndDate = new Date(contract.end_date);
      newEndDate.setMonth(newEndDate.getMonth() + contract.renewal_period);
      const newEndDateStr = newEndDate.toISOString().split('T')[0];

      db.prepare(`
        UPDATE contracts SET start_date = end_date, end_date = ?, status = 'active',
        updated_at = datetime('now','localtime') WHERE id = ?
      `).run(newEndDateStr, contract.id);

      const noticeDays = contract.renewal_notice_days || 30;
      db.prepare(`
        INSERT INTO reminders (contract_id, reminder_type, reminder_date, days_before, message, recipients)
        VALUES (?, 'renewal', date(?, '-' || ? || ' days'), ?, ?, ?)
      `).run(contract.id, newEndDateStr, noticeDays, noticeDays,
          `合約「${contract.title}」已自動續約，新到期日: ${newEndDateStr}`,
          JSON.stringify([contract.created_by]));

      console.log(`[續約] 合約 ${contract.contract_no} 已自動續約至 ${newEndDateStr}`);
    }
  } catch (err) {
    console.error('[提醒服務] 錯誤:', err.message);
  }
}

function startScheduler() {
  cron.schedule('0 8 * * *', () => {
    console.log('[排程] 執行到期檢查...');
    checkExpiringContracts();
  });
  console.log('[排程] 到期提醒排程已啟動 (每日 08:00)');
}

module.exports = { startScheduler, checkExpiringContracts };
