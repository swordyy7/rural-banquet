// PostgreSQL 驱动（生产 / 与论文一致）
const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const defaultUsers = require('../defaultUsers');

// 让 pg 的返回类型与 SQLite 行为一致，前端无需改动：
//   - bigint（COUNT(*) 等）默认返回字符串 -> 转成 JS number
//   - numeric（金额字段）默认返回字符串 -> 转成 JS number
types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));   // int8 / bigint
types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));   // numeric

// 本机 PostgreSQL 默认不开 SSL；云数据库（Neon/Supabase 等）在 .env 设 PGSSL=true
const useSsl = process.env.PGSSL === 'true';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

function query(text, params = []) {
  return pool.query(text, params);
}

// 首次运行：建表 + 演示数据 + 管理员
async function init() {
  const { rows } = await pool.query(`SELECT to_regclass('public.users') AS t`);
  const exists = rows[0] && rows[0].t;
  if (!exists) {
    const initSql = fs.readFileSync(path.join(__dirname, '..', 'schema.postgres.sql'), 'utf8');
    await pool.query(initSql);
    console.log('PostgreSQL 数据库结构已初始化');
  }

  await ensureMenuDishes();

  for (const user of defaultUsers) {
    await ensureUser(user.username, user.password, user.role);
  }

  console.log('PostgreSQL 默认账号已就绪：admin / admin123，staff / staff123');
}

// 幂等地确保默认账号存在（用于已有数据库补种子，不覆盖已有用户）
async function ensureUser(username, password, role) {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
  if (!rows[0]) {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`,
      [username, hash, role]
    );
    console.log(`已创建账号：${username} / ${password}（${role}）`);
  }
}

async function ensureMenuDishes() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_dishes (
      id         SERIAL PRIMARY KEY,
      menu_id    INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
      dish_id    INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
      quantity   INTEGER NOT NULL DEFAULT 1,
      notes      TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(menu_id, dish_id)
    )
  `);

  await pool.query(`
    INSERT INTO menu_dishes (menu_id, dish_id, quantity, sort_order)
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
    )
    ON CONFLICT DO NOTHING
  `);
}

module.exports = { query, ready: init(), handle: pool };
