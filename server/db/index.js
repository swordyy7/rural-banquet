require('dotenv').config();

// 通过 .env 的 DB_DRIVER 选择数据库：sqlite（默认，免安装）| postgres
const name = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
const isPg = name === 'postgres' || name === 'postgresql' || name === 'pg';

// 只 require 选中的驱动，未选中的不会加载（sqlite 模式下不会触碰 pg）
const driver = isPg ? require('./drivers/postgres') : require('./drivers/sqlite');

console.log(`数据库驱动：${isPg ? 'PostgreSQL' : 'SQLite'}`);

// 跨方言的“当前时间”字符串：'YYYY-MM-DD HH:MM:SS'
// 用 JS 生成后作为参数传入，避免 datetime('now') / to_char(now()) 的方言差异
function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 跨方言的“N 个月前”日期字符串：'YYYY-MM-DD'
function monthsAgoStr(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

module.exports = {
  query: driver.query,
  ready: driver.ready,
  handle: driver.handle,
  driver: isPg ? 'postgres' : 'sqlite',
  nowStr,
  monthsAgoStr,
};
