const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM menus ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, scene, price, description } = req.body;
  if (!name) return res.status(400).json({ error: '菜单名称必填' });
  try {
    const { rows } = await db.query(
      'INSERT INTO menus (name,scene,price,description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, scene || null, price || null, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, scene, price, description } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE menus SET name=$1,scene=$2,price=$3,description=$4 WHERE id=$5 RETURNING *',
      [name, scene || null, price || null, description || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '菜单不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM menus WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
