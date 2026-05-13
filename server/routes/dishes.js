const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM dishes ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, category, unit_price, description } = req.body;
  if (!name) return res.status(400).json({ error: '菜品名称必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO dishes (name,category,unit_price,description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, category || null, unit_price || null, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, category, unit_price, description } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE dishes SET name=$1,category=$2,unit_price=$3,description=$4 WHERE id=$5 RETURNING *',
      [name, category || null, unit_price || null, description || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '菜品不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM dishes WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
