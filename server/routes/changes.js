const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/orders/:orderId/changes
router.get('/:orderId/changes', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM change_records WHERE order_id=$1 ORDER BY created_at DESC',
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:orderId/changes
router.post('/:orderId/changes', async (req, res) => {
  const { change_type, before_value, after_value, reason } = req.body;
  if (!change_type) return res.status(400).json({ error: '变更类型必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO change_records (order_id,change_type,before_value,after_value,reason,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.params.orderId, change_type, before_value || null, after_value || null, reason || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
