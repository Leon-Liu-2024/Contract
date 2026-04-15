const pool = require('../config/database');

function generateContractNo(category) {
  const prefix = {
    purchase: 'PUR',
    service: 'SVC',
    nda: 'NDA',
    lease: 'LSE',
    sales: 'SAL',
    general: 'GEN',
  }[category] || 'CTR';

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const likePattern = `${prefix}-${year}${month}-%`;

  const result = pool.query(
    `SELECT COUNT(*) as count FROM contracts WHERE contract_no LIKE ?`,
    [likePattern]
  );
  const seq = String(parseInt(result.rows[0].count) + 1).padStart(4, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

module.exports = { generateContractNo };
