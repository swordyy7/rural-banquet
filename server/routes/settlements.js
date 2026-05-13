const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/orders/:orderId/settlement
router.get('/:orderId/settlement', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM settlements WHERE order_id=$1', [req.params.orderId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:orderId/settlement
router.post('/:orderId/settlement', async (req, res) => {
  const { total_amount, actual_cost, received_amount, payment_method, notes } = req.body;
  try {
    const { rows } = await db.query(`
      INSERT INTO settlements (order_id,total_amount,actual_cost,received_amount,payment_method,notes)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (order_id) DO UPDATE SET
        total_amount    = excluded.total_amount,
        actual_cost     = excluded.actual_cost,
        received_amount = excluded.received_amount,
        payment_method  = excluded.payment_method,
        notes           = excluded.notes,
        settled_at      = datetime('now')
      RETURNING *
    `, [req.params.orderId, total_amount || 0, actual_cost || 0, received_amount || 0, payment_method || null, notes || null]);

    await db.query(
      `UPDATE banquet_orders SET status='completed', updated_at=datetime('now') WHERE id=$1`,
      [req.params.orderId]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
