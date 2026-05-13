const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/statistics?from=&to=
router.get('/', async (req, res) => {
  const { from = '2000-01-01', to = '2099-12-31' } = req.query;
  try {
    const [overview, byType, recent] = await Promise.all([
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

      db.query(`
        SELECT
          TO_CHAR(event_date, 'YYYY-MM') AS month,
          COUNT(*) AS count,
          COALESCE(SUM(s.total_amount), 0) AS revenue
        FROM banquet_orders o
        LEFT JOIN settlements s ON o.id = s.order_id
        WHERE event_date >= NOW() - INTERVAL '5 months'
        GROUP BY month ORDER BY month
      `),
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
