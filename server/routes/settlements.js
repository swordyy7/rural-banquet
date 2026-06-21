const router = require('express').Router();
const db = require('../db');
const { authenticate, requireAdmin, blockIfCompleted } = require('../middleware/auth');

router.use(authenticate);

// GET /api/orders/:orderId/settlement
router.get('/:orderId/settlement', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM settlements WHERE order_id=$1', [req.params.orderId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 结算时按清点结果计算损耗，写入损耗表（损耗 = 准备数 - 清点结果，下限 0）
// materials: [{ id, actual_qty }]  id 为 order_materials.id；actual_qty 为宴席后清点结果
async function reconcileMaterials(orderId, materials) {
  const actualMap = {};
  (materials || []).forEach(m => { if (m && m.id != null) actualMap[m.id] = m.actual_qty; });

  const { rows: items } = await db.query(`
    SELECT om.*, m.name AS material_name
    FROM order_materials om
    LEFT JOIN materials m ON om.material_id = m.id
    WHERE om.order_id = $1
  `, [orderId]);

  // 重算该订单损耗：先清空旧记录再按当前核对结果写入
  await db.query('DELETE FROM material_losses WHERE order_id=$1', [orderId]);

  // 逐条更新清点结果 + 回补库存，并按物料聚合损耗
  // （同一物料可能有多条准备记录，而损耗表对 (order_id, material_id) 唯一，故需聚合后再写入）
  const agg = new Map();
  for (const it of items) {
    const planned = Number(it.planned_qty) || 0;
    const prevActual = it.actual_qty != null ? Number(it.actual_qty) : 0; // 上次结算已归还入库的数量
    let actual = actualMap[it.id] != null ? Number(actualMap[it.id])
               : (it.actual_qty != null ? Number(it.actual_qty) : planned);
    if (!Number.isFinite(actual) || actual < 0) actual = 0;

    // 物料为可重复使用资源（桌椅等）：清点归还的数量回补库存，按增量更新以支持重复结算
    const delta = actual - prevActual;
    if (delta !== 0 && it.material_id) {
      await db.query('UPDATE materials SET stock = stock + $1 WHERE id=$2', [delta, it.material_id]);
    }
    await db.query('UPDATE order_materials SET actual_qty=$1 WHERE id=$2', [actual, it.id]);

    const unitPrice = Number(it.unit_price) || 0;
    const lossQty = Math.max(planned - actual, 0);
    const key = it.material_id == null ? `null-${it.id}` : `mat-${it.material_id}`;
    const cur = agg.get(key) || { material_id: it.material_id, material_name: null, planned: 0, actual: 0, lossQty: 0, lossAmount: 0, unit_price: unitPrice };
    cur.planned += planned;
    cur.actual += actual;
    cur.lossQty += lossQty;
    cur.lossAmount += lossQty * unitPrice;
    cur.unit_price = unitPrice;
    if (it.material_name) cur.material_name = it.material_name;
    agg.set(key, cur);
  }

  let totalLoss = 0;
  for (const v of agg.values()) {
    totalLoss += v.lossAmount;
    await db.query(`
      INSERT INTO material_losses
        (order_id,material_id,material_name,planned_qty,actual_qty,loss_qty,unit_price,loss_amount,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [orderId, v.material_id, v.material_name, v.planned, v.actual, v.lossQty, v.unit_price, v.lossAmount, db.nowStr()]);
  }
  return totalLoss;
}

// POST /api/orders/:orderId/settlement（结算涉及财务，仅管理员可保存）
// 财务模型：营收 = 实际收款；损耗合计 = 物料损耗费 + 额外损耗；利润 = 实收 − 损耗合计
// （帮厨费用为转付项，单独展示、不计入利润；total_amount/actual_cost 为兼容统计而派生存储）
router.post('/:orderId/settlement', requireAdmin, blockIfCompleted('orderId'), async (req, res) => {
  const { received_amount, extra_loss, payment_method, notes, materials } = req.body;
  try {
    // 先核对物料、算物料损耗（同时回补库存），再据此派生成本（总损耗）口径
    const materialLoss = await reconcileMaterials(req.params.orderId, materials);

    const received = Number(received_amount) || 0;
    const extraLoss = Number(extra_loss) || 0;
    const totalLoss = materialLoss + extraLoss; // 损耗合计 = 物料损耗 + 额外损耗
    const totalAmount = received;               // 营收 = 实际收款
    const actualCost = totalLoss;               // 成本 = 损耗合计

    const { rows } = await db.query(`
      INSERT INTO settlements (order_id,total_amount,actual_cost,received_amount,extra_loss,payment_method,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (order_id) DO UPDATE SET
        total_amount    = excluded.total_amount,
        actual_cost     = excluded.actual_cost,
        received_amount = excluded.received_amount,
        extra_loss      = excluded.extra_loss,
        payment_method  = excluded.payment_method,
        notes           = excluded.notes,
        settled_at      = $8
      RETURNING *
    `, [req.params.orderId, totalAmount, actualCost, received, extraLoss, payment_method || null, notes || null, db.nowStr()]);

    await db.query(
      `UPDATE banquet_orders SET status='completed', updated_at=$1 WHERE id=$2`,
      [db.nowStr(), req.params.orderId]
    );

    res.json({ ...rows[0], material_loss_amount: materialLoss, total_loss_amount: totalLoss, profit: received - totalLoss });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
