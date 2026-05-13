const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET /api/customers?search=
router.get('/', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM customers';
    let params = [];
    if (search) {
      query += ' WHERE name ILIKE $1 OR phone ILIKE $1';
      params = [`%${search}%`];
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id (含历史订单)
router.get('/:id', async (req, res) => {
  try {
    const { rows: cRows } = await db.query(
      'SELECT * FROM customers WHERE id = $1', [req.params.id]
    );
    if (!cRows[0]) return res.status(404).json({ error: '客户不存在' });
    const { rows: oRows } = await db.query(
      'SELECT id, order_no, banquet_type, event_date, table_count, status FROM banquet_orders WHERE customer_id = $1 ORDER BY event_date DESC',
      [req.params.id]
    );
    res.json({ ...cRows[0], orders: oRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和电话必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO customers (name, phone, address, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, phone, address || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '姓名和电话必填' });
  try {
    const { rows } = await db.query(
      'UPDATE customers SET name=$1, phone=$2, address=$3, notes=$4 WHERE id=$5 RETURNING *',
      [name, phone, address || null, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '客户不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id (仅 admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
