const pool = require('../config/database');

try {
  const db = pool.raw;
  const insertMany = db.transaction(() => {
    // 種子使用者
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (employee_id, name, email, department, position, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('EMP001', '王大明', 'wang.dm@company.com', '法務部', '法務經理', 'admin');
    insertUser.run('EMP002', '李小華', 'li.xh@company.com', '採購部', '採購主管', 'manager');
    insertUser.run('EMP003', '張志偉', 'zhang.zw@company.com', '財務部', '財務經理', 'manager');
    insertUser.run('EMP004', '陳美玲', 'chen.ml@company.com', '業務部', '業務專員', 'user');
    insertUser.run('EMP005', '林建宏', 'lin.jh@company.com', '總經理室', '總經理', 'admin');

    // 種子合約範本
    const insertTemplate = db.prepare(`
      INSERT OR IGNORE INTO contract_templates (name, category, description, content, fields, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertTemplate.run(
      '標準採購合約', 'purchase', '一般採購用合約範本',
      '甲方：{{party_a}}\n乙方：{{party_b}}\n\n第一條 合約標的\n{{subject}}\n\n第二條 合約金額\n新台幣 {{amount}} 元整\n\n第三條 合約期間\n自 {{start_date}} 起至 {{end_date}} 止\n\n第四條 付款方式\n{{payment_terms}}\n\n第五條 違約責任\n任一方違反本合約之約定，應賠償他方因此所受之損害。',
      '[{"name":"subject","label":"合約標的","type":"text"},{"name":"payment_terms","label":"付款方式","type":"text"}]', 1
    );
    insertTemplate.run(
      '勞務委外合約', 'service', '委外服務用合約範本',
      '甲方：{{party_a}}\n乙方：{{party_b}}\n\n第一條 委託事項\n{{service_scope}}\n\n第二條 服務期間\n自 {{start_date}} 起至 {{end_date}} 止\n\n第三條 服務費用\n新台幣 {{amount}} 元整\n\n第四條 驗收標準\n{{acceptance_criteria}}',
      '[{"name":"service_scope","label":"服務範圍","type":"textarea"},{"name":"acceptance_criteria","label":"驗收標準","type":"textarea"}]', 1
    );
    insertTemplate.run(
      '保密協議 (NDA)', 'nda', '雙方保密協議範本',
      '甲方：{{party_a}}\n乙方：{{party_b}}\n\n雙方同意就合作事宜所接觸之機密資訊，遵守以下保密義務：\n\n第一條 機密資訊定義\n{{confidential_info}}\n\n第二條 保密期間\n自 {{start_date}} 起至 {{end_date}} 止\n\n第三條 違約罰則\n違約方應賠償新台幣 {{penalty_amount}} 元整。',
      '[{"name":"confidential_info","label":"機密資訊定義","type":"textarea"},{"name":"penalty_amount","label":"違約金額","type":"number"}]', 1
    );

    // 種子簽核流程
    const insertFlow = db.prepare(`
      INSERT OR IGNORE INTO approval_flows (name, category, description, steps)
      VALUES (?, ?, ?, ?)
    `);
    insertFlow.run(
      '標準採購簽核', 'purchase', '採購合約標準審核流程',
      '[{"order":1,"name":"部門主管審核","role":"manager","department":"採購部"},{"order":2,"name":"財務審核","role":"manager","department":"財務部"},{"order":3,"name":"總經理核准","role":"admin","department":"總經理室"}]'
    );
    insertFlow.run(
      '一般合約簽核', 'general', '一般合約審核流程',
      '[{"order":1,"name":"部門主管審核","role":"manager"},{"order":2,"name":"法務審核","role":"admin","department":"法務部"}]'
    );
    insertFlow.run(
      '高額合約簽核', 'high_value', '金額超過100萬之合約',
      '[{"order":1,"name":"部門主管審核","role":"manager"},{"order":2,"name":"財務審核","role":"manager","department":"財務部"},{"order":3,"name":"法務審核","role":"admin","department":"法務部"},{"order":4,"name":"總經理核准","role":"admin","department":"總經理室"}]'
    );

    // 種子合約資料
    const insertContract = db.prepare(`
      INSERT OR IGNORE INTO contracts (contract_no, title, category, party_a, party_b, amount, currency, start_date, end_date, description, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertContract.run('PUR-202604-0001', '辦公設備採購合約', 'purchase', '本公司', '大同電子股份有限公司', 580000, 'TWD', '2026-04-01', '2027-03-31', '年度辦公設備採購', 'active', 1);
    insertContract.run('SVC-202604-0001', 'IT系統維護委外合約', 'service', '本公司', '資訊科技服務有限公司', 1200000, 'TWD', '2026-01-01', '2026-12-31', 'IT基礎設施維護服務', 'active', 2);
    insertContract.run('NDA-202604-0001', '技術合作保密協議', 'nda', '本公司', '創新科技股份有限公司', null, 'TWD', '2026-03-01', '2028-02-28', '雙方技術合作保密約定', 'active', 1);
    insertContract.run('PUR-202604-0002', '原物料供應合約', 'purchase', '本公司', '永豐材料有限公司', 3500000, 'TWD', '2026-04-15', '2026-05-15', '年度原物料供應', 'draft', 4);
    insertContract.run('SAL-202604-0001', '產品銷售代理合約', 'sales', '本公司', '全球通路股份有限公司', 2000000, 'USD', '2026-06-01', '2027-05-31', '海外市場銷售代理', 'draft', 4);
  });

  insertMany();
  console.log('Seed data inserted successfully.');
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
}
