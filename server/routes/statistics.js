const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/statistics?from=&to=
router.get('/', async (req, res) => {
  const { from = '2000-01-01', to = '2099-12-31' } = req.query;
  try {
    const [overview, byType, recent] = await Promise.all([
      // 总览（PostgreSQL 支持聚合 FILTER 子句）
      db.query(`
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status='completed') AS completed_orders,
          COUNT(*) FILTER (WHERE status='cancelled') AS cancelled_orders,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue,
          COALESCE(SUM(s.actual_cost), 0) AS total_cost,
          COALESCE(SUM(s.received_amount), 0) AS total_received
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE o.event_date BETWEEN $1 AND $2
      `, [from, to]),

      db.query(`
        SELECT
          o.banquet_type,
          COUNT(*) AS count,
          COALESCE(SUM(s.total_amount), 0) AS revenue
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE o.event_date BETWEEN $1 AND $2
        GROUP BY o.banquet_type
        ORDER BY count DESC
      `, [from, to]),

      // 近 5 个月趋势（event_date 为 'YYYY-MM-DD' 文本，取前 7 位即 'YYYY-MM'）
      // substr 与 $1 参数两种数据库通用，截止日期在 JS 中算好传入
      db.query(`
        SELECT
          substr(event_date, 1, 7) AS month,
          COUNT(*) AS count,
          COALESCE(SUM(s.total_amount), 0) AS revenue
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE event_date >= $1
        GROUP BY month ORDER BY month
      `, [db.monthsAgoStr(5)]),
    ]);

    res.json({
      overview: overview.rows[0],
      by_type: byType.rows,
      monthly: recent.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
