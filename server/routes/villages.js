const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// GET /api/villages —— 村列表（订单表单、价格带都要用，所有登录用户可读）
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM villages ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增村：任意登录用户可加（新建客户/订单时可能需要现场补村）；改名、删除仅管理员
router.post('/', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: '村名必填' });
  try {
    const { rows } = await db.query('INSERT INTO villages (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (/unique/i.test(err.message)) return res.status(400).json({ error: '该村已存在' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: '村名必填' });
  try {
    const { rows } = await db.query('UPDATE villages SET name=$1 WHERE id=$2 RETURNING *', [name, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '村不存在' });
    res.json(rows[0]);
  } catch (err) {
    if (/unique/i.test(err.message)) return res.status(400).json({ error: '该村已存在' });
    res.status(500).json({ error: err.message });
  }
});

// 删除村：订单与价格带的 village_id 会被置空（ON DELETE SET NULL）
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM villages WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
