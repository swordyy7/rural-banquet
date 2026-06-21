const router = require('express').Router();
const db = require('../db');
const { authenticate, blockIfCompleted } = require('../middleware/auth');

router.use(authenticate);

// GET /api/orders/:orderId/labor
router.get('/:orderId/labor', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM labor_arrangements WHERE order_id=$1',
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:orderId/labor
router.post('/:orderId/labor', blockIfCompleted('orderId'), async (req, res) => {
  const { role, name, phone, fee, notes } = req.body;
  if (!role) return res.status(400).json({ error: '角色必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO labor_arrangements (order_id,role,name,phone,fee,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.params.orderId, role, name || null, phone || null, fee || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:orderId/labor/:laborId
router.delete('/:orderId/labor/:laborId', blockIfCompleted('orderId'), async (req, res) => {
  try {
    await db.query('DELETE FROM labor_arrangements WHERE id=$1 AND order_id=$2', [req.params.laborId, req.params.orderId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
