-- 合約簽核管理系統 - SQLite 資料庫初始化
-- ==========================================

-- 使用者表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 合約範本表
CREATE TABLE IF NOT EXISTS contract_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  fields TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 合約主表
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_no TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  party_a TEXT NOT NULL,
  party_b TEXT NOT NULL,
  amount REAL,
  currency TEXT DEFAULT 'TWD',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  description TEXT,
  terms TEXT,
  template_id INTEGER REFERENCES contract_templates(id),
  status TEXT NOT NULL DEFAULT 'draft',
  is_auto_renew INTEGER DEFAULT 0,
  renewal_period INTEGER,
  renewal_notice_days INTEGER DEFAULT 30,
  attachment_paths TEXT DEFAULT '[]',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 簽核流程定義表
CREATE TABLE IF NOT EXISTS approval_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  steps TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 簽核記錄表
CREATE TABLE IF NOT EXISTS approval_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  flow_id INTEGER REFERENCES approval_flows(id),
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 簽核步驟詳情表
CREATE TABLE IF NOT EXISTS approval_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES approval_records(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  approver_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  acted_at TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 到期提醒表
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  reminder_date TEXT NOT NULL,
  days_before INTEGER,
  message TEXT,
  is_sent INTEGER DEFAULT 0,
  sent_at TEXT,
  recipients TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 操作日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER REFERENCES contracts(id),
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  related_contract_id INTEGER REFERENCES contracts(id),
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_no ON contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_approval_records_contract ON approval_records(contract_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status ON approval_records(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_record ON approval_steps(record_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON approval_steps(approver_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_contract ON reminders(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_contract ON audit_logs(contract_id);
