const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

try {
  const sqlPath = path.join(__dirname, '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  pool.raw.exec(sql);
  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
