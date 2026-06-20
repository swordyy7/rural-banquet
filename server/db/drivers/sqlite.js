// SQLite 驱动（开发用，免安装）
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const defaultUsers = require('../defaultUsers');

const dbFile = path.join(__dirname, '..', 'data.sqlite');
const isNew = !fs.existsSync(dbFile);

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 首次运行时建表 + 演示数据 + 管理员
if (isNew) {
  const initSql = fs.readFileSync(path.join(__dirname, '..', 'schema.sqlite.sql'), 'utf8');
  db.exec(initSql);
  console.log('SQLite 数据库结构已初始化');
}

// 幂等地确保某账号存在（用于已有数据库补种子，不覆盖已有用户）
function ensureUser(username, password, role) {
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (!exists) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`)
      .run(username, hash, role);
    console.log(`已创建账号：${username} / ${password}（${role}）`);
  }
}

for (const user of defaultUsers) {
  ensureUser(user.username, user.password, user.role);
}

console.log('SQLite 默认账号已就绪：admin / admin123，staff / staff123');

// 把 PostgreSQL 的 $1, $2 占位符转换为 SQLite 的 ?
function translateSql(sql) {
  return sql.replace(/\$(\d+)/g, '?');
}

// 提供与 pg 兼容的接口：{ rows, rowCount }
function query(sql, params = []) {
  const translated = translateSql(sql);
  try {
    const stmt = db.prepare(translated);
    const trimmed = translated.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
    const hasReturning = /\bRETURNING\b/i.test(translated);

    if (isSelect || hasReturning) {
      return Promise.resolve({ rows: stmt.all(...params) });
    }
    const result = stmt.run(...params);
    return Promise.resolve({ rows: [], rowCount: result.changes });
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = { query, ready: Promise.resolve(), handle: db };
