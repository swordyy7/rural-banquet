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

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_dishes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id    INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    dish_id    INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL DEFAULT 1,
    notes      TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(menu_id, dish_id)
  );

  INSERT OR IGNORE INTO menu_dishes (menu_id, dish_id, quantity, sort_order)
  SELECT m.id, d.id, 1,
    CASE d.name
      WHEN '红烧肉' THEN 1
      WHEN '白切鸡' THEN 2
      WHEN '糖醋鲤鱼' THEN 3
      WHEN '凉拌黄瓜' THEN 4
      WHEN '蒸鸡蛋' THEN 5
      ELSE 99
    END
  FROM menus m
  JOIN dishes d ON (
    (m.name = '婚宴标准套餐' AND d.name IN ('红烧肉', '白切鸡', '糖醋鲤鱼', '凉拌黄瓜'))
    OR
    (m.name = '寿宴喜庆套餐' AND d.name IN ('白切鸡', '蒸鸡蛋', '红烧肉'))
  );
`);

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
