const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin, blockIfCompleted } = require('../middleware/auth');
const { matchBand } = require('./priceBands');

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
    SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, vi.name AS village_name
    FROM banquet_orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN villages vi ON o.village_id = vi.id
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
      SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, vi.name AS village_name
      FROM banquet_orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN villages vi ON o.village_id = vi.id
      WHERE o.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '订单不存在' });

    const [details, labor, changes, settlement, materials, losses] = await Promise.all([
      db.query(`
        SELECT omd.*, m.name AS menu_name, d.name AS dish_name
        FROM order_menu_details omd
        LEFT JOIN menus m ON omd.menu_id = m.id
        LEFT JOIN dishes d ON omd.dish_id = d.id
        WHERE omd.order_id = $1
        ORDER BY omd.id
      `, [req.params.id]),
      db.query('SELECT * FROM labor_arrangements WHERE order_id = $1', [req.params.id]),
      db.query('SELECT * FROM change_records WHERE order_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM settlements WHERE order_id = $1', [req.params.id]),
      db.query(`
        SELECT om.*, m.name AS material_name, m.unit AS unit, m.stock AS material_stock
        FROM order_materials om
        LEFT JOIN materials m ON om.material_id = m.id
        WHERE om.order_id = $1 ORDER BY om.id
      `, [req.params.id]),
      db.query('SELECT * FROM material_losses WHERE order_id = $1 ORDER BY loss_amount DESC', [req.params.id]),
    ]);

    res.json({
      ...rows[0],
      menu_details: details.rows,
      labor: labor.rows,
      changes: changes.rows,
      settlement: settlement.rows[0] || null,
      materials: materials.rows,
      losses: losses.rows,
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
  const { customer_id, banquet_type, event_date, location, table_count, guest_count, budget, notes, village_id, service_fee } = req.body;
  if (!banquet_type || !event_date || !table_count) {
    return res.status(400).json({ error: '宴席类型、日期和桌数必填' });
  }
  try {
    const vid = village_id || null;
    // 未传服务费时按价格带自动匹配带入（整单一口价）
    let fee = (service_fee === '' || service_fee == null) ? null : Number(service_fee);
    if (fee == null) {
      const band = await matchBand({ village_id: vid, event_date, table_count });
      fee = band ? Number(band.service_fee) : null;
    }
    const order_no = await genOrderNo();
    const { rows } = await db.query(`
      INSERT INTO banquet_orders
        (order_no, customer_id, banquet_type, event_date, village_id, location, table_count, guest_count, budget, service_fee, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [order_no, customer_id || null, banquet_type, event_date, vid, location || null, table_count, guest_count || null, budget || null, fee, notes || null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  const { banquet_type, event_date, location, table_count, guest_count, budget, status, notes, customer_id, village_id, service_fee } = req.body;
  try {
    const fee = (service_fee === '' || service_fee == null) ? null : Number(service_fee);
    const { rows } = await db.query(`
      UPDATE banquet_orders SET
        customer_id=$1, banquet_type=$2, event_date=$3, village_id=$4, location=$5,
        table_count=$6, guest_count=$7, budget=$8, service_fee=$9, status=$10, notes=$11,
        updated_at=$12
      WHERE id=$13 RETURNING *
    `, [customer_id || null, banquet_type, event_date, village_id || null, location || null, table_count, guest_count || null, budget || null, fee, status, notes || null, db.nowStr(), req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '订单不存在' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id (仅 admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // 删除订单前，把其准备物料仍在外（未归还）的数量退还库存——
    // 外键 CASCADE 会删除 order_materials，但不会触发库存回补，需在此手动处理
    const { rows: oms } = await db.query(
      'SELECT material_id, planned_qty, actual_qty FROM order_materials WHERE order_id=$1', [req.params.id]
    );
    for (const om of oms) {
      if (om.material_id == null) continue;
      const restore = (Number(om.planned_qty) || 0) - (om.actual_qty != null ? Number(om.actual_qty) : 0);
      if (restore !== 0) {
        await db.query('UPDATE materials SET stock = stock + $1 WHERE id=$2', [restore, om.material_id]);
      }
    }
    await db.query('DELETE FROM banquet_orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/menu-details
router.post('/:id/menu-details', blockIfCompleted('id'), async (req, res) => {
  const { menu_id, dish_id, quantity, notes } = req.body;
  try {
    if (menu_id) {
      const { rows: menuDishes } = await db.query(`
        SELECT dish_id, quantity, notes
        FROM menu_dishes
        WHERE menu_id = $1
        ORDER BY sort_order, id
      `, [menu_id]);
      if (menuDishes.length === 0) {
        return res.status(400).json({ error: '该菜单模板未关联菜品，请先在菜单管理中配置菜品' });
      }
      const inserted = [];
      for (const item of menuDishes) {
        const { rows } = await db.query(
          'INSERT INTO order_menu_details (order_id,menu_id,dish_id,quantity,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
          [
            req.params.id,
            menu_id,
            item.dish_id,
            (Number(item.quantity) || 1) * (Number(quantity) || 1),
            item.notes || notes || null,
          ]
        );
        inserted.push(rows[0]);
      }
      return res.status(201).json(inserted);
    }

    if (!dish_id) {
      return res.status(400).json({ error: '请选择菜单模板或菜品' });
    }

    const { rows } = await db.query(
      'INSERT INTO order_menu_details (order_id,menu_id,dish_id,quantity,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, null, dish_id, quantity || 1, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id/menu-details/:detailId
router.delete('/:id/menu-details/:detailId', blockIfCompleted('id'), async (req, res) => {
  try {
    await db.query('DELETE FROM order_menu_details WHERE id=$1 AND order_id=$2', [req.params.detailId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
