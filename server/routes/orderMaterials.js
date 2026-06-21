const router = require('express').Router();
const db = require('../db');
const { authenticate, blockIfCompleted } = require('../middleware/auth');

router.use(authenticate);

// GET /api/orders/:orderId/materials —— 该订单的准备物料清单（带物料名/单位/当前库存）
router.get('/:orderId/materials', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT om.*, m.name AS material_name, m.unit AS unit, m.stock AS material_stock
      FROM order_materials om
      LEFT JOIN materials m ON om.material_id = m.id
      WHERE om.order_id = $1
      ORDER BY om.id
    `, [req.params.orderId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:orderId/materials —— 准备阶段：登记需要准备的物料数，并从库存扣减
router.post('/:orderId/materials', blockIfCompleted('orderId'), async (req, res) => {
  const { material_id, planned_qty } = req.body;
  const qty = Number(planned_qty);
  if (!material_id) return res.status(400).json({ error: '请选择物料' });
  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: '准备数量应大于 0' });
  try {
    const { rows: matRows } = await db.query('SELECT * FROM materials WHERE id=$1', [material_id]);
    const material = matRows[0];
    if (!material) return res.status(404).json({ error: '物料不存在' });
    if (Number(material.stock) < qty) {
      return res.status(400).json({ error: `库存不足，当前「${material.name}」库存为 ${material.stock} ${material.unit || ''}` });
    }

    // 先扣库存
    await db.query('UPDATE materials SET stock = stock - $1 WHERE id=$2', [qty, material_id]);

    // 同一订单已有该物料的准备记录则合并（每物料一条，避免重复行与损耗唯一约束冲突）
    const { rows: ex } = await db.query(
      'SELECT id FROM order_materials WHERE order_id=$1 AND material_id=$2', [req.params.orderId, material_id]
    );
    if (ex[0]) {
      const { rows } = await db.query(
        'UPDATE order_materials SET planned_qty = planned_qty + $1, unit_price=$2 WHERE id=$3 RETURNING *',
        [qty, material.unit_price || null, ex[0].id]
      );
      return res.json(rows[0]);
    }
    const { rows } = await db.query(
      'INSERT INTO order_materials (order_id,material_id,planned_qty,unit_price) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.orderId, material_id, qty, material.unit_price || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:orderId/materials/:itemId —— 移除准备物料，准备数回退库存
router.delete('/:orderId/materials/:itemId', blockIfCompleted('orderId'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM order_materials WHERE id=$1 AND order_id=$2',
      [req.params.itemId, req.params.orderId]
    );
    const item = rows[0];
    if (!item) return res.status(404).json({ error: '准备记录不存在' });

    if (item.material_id) {
      // 已结算时清点归还的部分已回库，这里只退还仍在外（未归还）的数量
      const planned = Number(item.planned_qty) || 0;
      const returned = item.actual_qty != null ? Number(item.actual_qty) : 0;
      const restore = planned - returned;
      if (restore !== 0) {
        await db.query('UPDATE materials SET stock = stock + $1 WHERE id=$2', [restore, item.material_id]);
      }
    }
    await db.query('DELETE FROM order_materials WHERE id=$1', [req.params.itemId]);
    // 同步清理可能已生成的损耗记录
    await db.query('DELETE FROM material_losses WHERE order_id=$1 AND material_id=$2', [req.params.orderId, item.material_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
