const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// 档期冲突检测
async function checkSchedule(date, excludeOrderId = null) {
  let query = `SELECT COUNT(*) AS cnt FROM banquet_orders WHERE event_date = $1 AND status != 'cancelled'`;
  let params = [date];
  if (excludeOrderId) {
    query += ` AND id != $2`;
    params.push(excludeOrderId);
  }
  const { rows } = await db.query(query, params);
  return parseInt(rows[0].cnt);
}

// GET /api/orders/schedule-check?date=&orderId=
router.get('/schedule-check', async (req, res) => {
  const { date, orderId } = req.query;
  if (!date) return res.status(400).json({ error: '日期必填' });
  try {
    const count = await checkSchedule(date, orderId);
    let level = 'ok';
    let message = null;
    if (count >= 3) {
      level = 'warning';
      message = `当天已有 ${count} 场宴席，资源可能紧张，是否确认继续接单？`;
    } else if (count >= 1) {
      level = 'info';
      message = `当天已有 ${count} 场宴席，请注意资源安排`;
    }
    res.json({ level, count, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders?status=&from=&to=
router.get('/', async (req, res) => {
  const { status, from, to } = req.query;
  let query = `
    SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
    FROM banquet_orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { params.push(status); query += ` AND o.status = $${params.length}`; }
  if (from)   { params.push(from);   query += ` AND o.event_date >= $${params.length}`; }
  if (to)     { params.push(to);     query += ` AND o.event_date <= $${params.length}`; }
  query += ' ORDER BY o.event_date DESC';
  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
      FROM banquet_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '订单不存在' });

    const [details, labor, changes, settlement] = await Promise.all([
      db.query(`
        SELECT omd.*, m.name AS menu_name, d.name AS dish_name
        FROM order_menu_details omd
        LEFT JOIN menus m ON omd.menu_id = m.id
        LEFT JOIN dishes d ON omd.dish_id = d.id
        WHERE omd.order_id = $1
      `, [req.params.id]),
      db.query('SELECT * FROM labor_arrangements WHERE order_id = $1', [req.params.id]),
      db.query('SELECT * FROM change_records WHERE order_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM settlements WHERE order_id = $1', [req.params.id]),
    ]);

    res.json({
      ...rows[0],
      menu_details: details.rows,
      labor: labor.rows,
      changes: changes.rows,
      settlement: settlement.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 生成订单编号
async function genOrderNo() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM banquet_orders WHERE order_no LIKE $1`, [`BQ${today}%`]
  );
  const seq = String(parseInt(rows[0].cnt) + 1).padStart(3, '0');
  return `BQ${today}${seq}`;
}

// POST /api/orders
router.post('/', async (req, res) => {
  const { customer_id, banquet_type, event_date, location, table_count, guest_count, budget, notes } = req.body;
  if (!banquet_type || !event_date || !table_count) {
    return res.status(400).json({ error: '宴席类型、日期和桌数必填' });
  }
  try {
    const order_no = await genOrderNo();
    const { rows } = await db.query(`
      INSERT INTO banquet_orders
        (order_no, customer_id, banquet_type, event_date, location, table_count, guest_count, budget, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [order_no, customer_id || null, banquet_type, event_date, location || null, table_count, guest_count || null, budget || null, notes || null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  const { banquet_type, event_date, location, table_count, guest_count, budget, status, notes, customer_id } = req.body;
  try {
    const { rows } = await db.query(`
      UPDATE banquet_orders SET
        customer_id=$1, banquet_type=$2, event_date=$3, location=$4,
        table_count=$5, guest_count=$6, budget=$7, status=$8, notes=$9,
        updated_at=$10
      WHERE id=$11 RETURNING *
    `, [customer_id || null, banquet_type, event_date, location || null, table_count, guest_count || null, budget || null, status, notes || null, db.nowStr(), req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '订单不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id (仅 admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM banquet_orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/menu-details
router.post('/:id/menu-details', async (req, res) => {
  const { menu_id, dish_id, quantity, notes } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO order_menu_details (order_id,menu_id,dish_id,quantity,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, menu_id || null, dish_id || null, quantity || 1, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id/menu-details/:detailId
router.delete('/:id/menu-details/:detailId', async (req, res) => {
  try {
    await db.query('DELETE FROM order_menu_details WHERE id=$1 AND order_id=$2', [req.params.detailId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
