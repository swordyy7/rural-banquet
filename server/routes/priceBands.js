const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// 价格带匹配：给 (村, 举办日期, 桌数) 返回命中的价格带（整单一口价）
// 命中规则：村相等或不限 ∧ 日期落在区间或不限 ∧ min_tables ≤ 桌数 < max_tables（半开区间）
// 多条命中 → 优先级高者 → 条件更具体者（不限项更少）→ id 大者
async function matchBand({ village_id, event_date, table_count }) {
  const { rows } = await db.query('SELECT * FROM price_bands WHERE enabled = 1');
  const tables = Number(table_count);
  const vid = village_id != null && village_id !== '' ? String(village_id) : null;

  const cands = rows.filter(b => {
    if (b.village_id != null && (vid === null || String(b.village_id) !== vid)) return false;
    if (b.start_date && (!event_date || event_date < b.start_date)) return false;
    if (b.end_date && (!event_date || event_date > b.end_date)) return false;
    if (b.min_tables != null && !(tables >= Number(b.min_tables))) return false;
    if (b.max_tables != null && !(tables < Number(b.max_tables))) return false;
    return true;
  });
  if (!cands.length) return null;

  const spec = b =>
    (b.village_id != null ? 1 : 0) + (b.start_date ? 1 : 0) + (b.end_date ? 1 : 0) +
    (b.min_tables != null ? 1 : 0) + (b.max_tables != null ? 1 : 0);
  cands.sort((a, b) =>
    (Number(b.priority) || 0) - (Number(a.priority) || 0) || spec(b) - spec(a) || b.id - a.id);
  return cands[0];
}

// 把表单字段规范化为存库值（空串/未填 -> null）
function normalize(body) {
  const n = v => (v === '' || v === undefined || v === null ? null : v);
  const num = v => (n(v) === null ? null : Number(v));
  return {
    name: (body.name || '').trim(),
    village_id: num(body.village_id),
    start_date: n(body.start_date),
    end_date: n(body.end_date),
    min_tables: num(body.min_tables),
    max_tables: num(body.max_tables),
    service_fee: Number(body.service_fee) || 0,
    priority: Number(body.priority) || 0,
    enabled: (body.enabled === false || body.enabled === 0 || body.enabled === '0') ? 0 : 1,
  };
}

// GET /api/price-bands/match?village_id=&date=&tables=  —— 订单表单预览用（所有登录用户可用）
router.get('/match', async (req, res) => {
  try {
    const band = await matchBand({
      village_id: req.query.village_id,
      event_date: req.query.date,
      table_count: req.query.tables,
    });
    res.json({ band: band || null, service_fee: band ? band.service_fee : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/price-bands —— 规则列表（带村名）
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT pb.*, v.name AS village_name
      FROM price_bands pb
      LEFT JOIN villages v ON pb.village_id = v.id
      ORDER BY pb.priority DESC, pb.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 价格带增删改仅管理员
router.post('/', requireAdmin, async (req, res) => {
  const b = normalize(req.body);
  if (!b.name) return res.status(400).json({ error: '规则名称必填' });
  try {
    const { rows } = await db.query(`
      INSERT INTO price_bands (name,village_id,start_date,end_date,min_tables,max_tables,service_fee,priority,enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [b.name, b.village_id, b.start_date, b.end_date, b.min_tables, b.max_tables, b.service_fee, b.priority, b.enabled]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const b = normalize(req.body);
  if (!b.name) return res.status(400).json({ error: '规则名称必填' });
  try {
    const { rows } = await db.query(`
      UPDATE price_bands SET
        name=$1, village_id=$2, start_date=$3, end_date=$4,
        min_tables=$5, max_tables=$6, service_fee=$7, priority=$8, enabled=$9
      WHERE id=$10 RETURNING *
    `, [b.name, b.village_id, b.start_date, b.end_date, b.min_tables, b.max_tables, b.service_fee, b.priority, b.enabled, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '价格带不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM price_bands WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.matchBand = matchBand;
