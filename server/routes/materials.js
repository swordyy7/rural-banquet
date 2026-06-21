const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM materials ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials/:id/orders —— 该物料库存被哪些订单占用（准备记录）
router.get('/:id/orders', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT om.id, om.order_id, om.planned_qty, om.actual_qty,
             o.order_no, o.banquet_type, o.event_date, o.status,
             c.name AS customer_name
      FROM order_materials om
      JOIN banquet_orders o ON om.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE om.material_id = $1
      ORDER BY o.event_date DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, category, unit, unit_price, stock, notes } = req.body;
  if (!name) return res.status(400).json({ error: '物料名称必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO materials (name,category,unit,unit_price,stock,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, category || null, unit || null, unit_price || null, stock || 0, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, category, unit, unit_price, stock, notes } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE materials SET name=$1,category=$2,unit=$3,unit_price=$4,stock=$5,notes=$6 WHERE id=$7 RETURNING *',
      [name, category || null, unit || null, unit_price || null, stock || 0, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '物料不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM materials WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
