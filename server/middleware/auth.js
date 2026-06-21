const jwt = require('jsonwebtoken');
const db = require('../db');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
}

// 已完成订单锁定：禁止再修改菜单/准备/人工/结算
// orderIdParam 指定订单 id 在 req.params 中的字段名（不同路由可能是 id 或 orderId）
function blockIfCompleted(orderIdParam = 'orderId') {
  return async (req, res, next) => {
    try {
      const { rows } = await db.query(
        'SELECT status FROM banquet_orders WHERE id=$1', [req.params[orderIdParam]]
      );
      if (!rows[0]) return res.status(404).json({ error: '订单不存在' });
      if (rows[0].status === 'completed') {
        return res.status(403).json({ error: '订单已完成，不能再修改菜单/准备/人工/结算' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { authenticate, requireAdmin, blockIfCompleted };
