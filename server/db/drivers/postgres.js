// PostgreSQL 驱动（生产 / 与论文一致）
const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

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

    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, 'admin')`,
      ['admin', hash]
    );
    console.log('PostgreSQL 数据库已初始化：admin / admin123');
  }
}

module.exports = { query, ready: init(), handle: pool };
