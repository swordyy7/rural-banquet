require('dotenv').config();
const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// 让 pg 的返回类型与原先（better-sqlite3）保持一致，前端无需改动：
//   - bigint（COUNT(*) 等）默认返回字符串 -> 转成 JS number
//   - numeric（金额字段）默认返回字符串 -> 转成 JS number
types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));   // int8 / bigint
types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));   // numeric

// 云数据库（Neon / Supabase 等）通常强制 SSL；本地 PostgreSQL 可在 .env 设 PGSSL=false
const useSsl = process.env.PGSSL !== 'false';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// 与原接口保持一致：返回 { rows, rowCount }
function query(text, params = []) {
  return pool.query(text, params);
}

// 首次运行：建表 + 演示数据 + 管理员账号
async function init() {
  const { rows } = await pool.query(`SELECT to_regclass('public.users') AS t`);
  const exists = rows[0] && rows[0].t;
  if (!exists) {
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(initSql);

    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, 'admin')`,
      ['admin', hash]
    );
    console.log('Database initialized: admin / admin123');
  }
}

// 启动时执行初始化，app.js 会 await 这个 Promise 后再监听端口
const ready = init();

module.exports = { query, pool, ready };
