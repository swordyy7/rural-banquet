const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbFile = path.join(__dirname, 'data.sqlite');
const isNew = !fs.existsSync(dbFile);

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 首次运行时执行 init.sql + 创建管理员
if (isNew) {
  const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  db.exec(initSql);

  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')`)
    .run('admin', hash);

  console.log('Database initialized: admin / admin123');
}

// 把 PostgreSQL 的 $1, $2 占位符转换为 SQLite 的 ?
function translateSql(sql) {
  return sql.replace(/\$(\d+)/g, '?');
}

// 提供与 pg 兼容的 query 接口：{ rows: [...] }
function query(sql, params = []) {
  const translated = translateSql(sql);
  try {
    const stmt = db.prepare(translated);
    const trimmed = translated.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
    const hasReturning = /\bRETURNING\b/i.test(translated);

    if (isSelect || hasReturning) {
      const rows = stmt.all(...params);
      return Promise.resolve({ rows });
    } else {
      const result = stmt.run(...params);
      return Promise.resolve({ rows: [], rowCount: result.changes });
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = { query };
