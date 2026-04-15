const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/contract_system.db');

// 確保目錄存在
const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// 啟用 WAL 模式與外鍵約束
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 包裝成類似 pg Pool 的介面，讓路由程式碼改動最小
const pool = {
  // 將 $1, $2... 轉換為 ? 並執行
  query(sql, params = []) {
    // 轉換 PostgreSQL 風格的 $N 參數為 ?
    let convertedSql = sql;
    const paramMap = [];

    if (params.length > 0) {
      // 找出所有 $N 並按照出現順序替換為 ?
      convertedSql = sql.replace(/\$(\d+)/g, (match, num) => {
        paramMap.push(parseInt(num) - 1);
        return '?';
      });
    }

    // 按照替換順序重新排列參數
    const orderedParams = paramMap.length > 0
      ? paramMap.map(i => params[i] !== undefined ? params[i] : null)
      : params;

    // 清理 SQLite 不支援的語法
    convertedSql = convertedSql
      // ::date, ::numeric 等型別轉換
      .replace(/::\w+/g, '')
      // INTERVAL 'N days' → N (用在日期計算中)
      .replace(/INTERVAL\s+'(\d+)\s+\w+'/gi, '$1');

    const trimmed = convertedSql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
    const hasReturning = /RETURNING\s+/i.test(convertedSql);

    try {
      if (isSelect) {
        const rows = db.prepare(convertedSql).all(...orderedParams);
        return { rows };
      } else if (hasReturning) {
        // SQLite 的 RETURNING 支援 (better-sqlite3 >= 9.0)
        const rows = db.prepare(convertedSql).all(...orderedParams);
        return { rows };
      } else {
        const info = db.prepare(convertedSql).run(...orderedParams);
        return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
      }
    } catch (err) {
      throw err;
    }
  },

  // 模擬 pg 的 connect() 返回 client（用於事務）
  connect() {
    const client = {
      query: (sql, params) => pool.query(sql, params),
      release: () => {}  // SQLite 不需要釋放
    };
    return Promise.resolve(client);
  },

  // 提供原始 db 物件供需要時使用
  raw: db,

  end() {
    db.close();
  }
};

module.exports = pool;
