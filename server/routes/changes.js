const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// 订单状态的中文标签（用于退订记录的可读展示，与前端 STATUS_LABEL 保持一致）
const STATUS_LABEL = {
  pending: '待确认', confirmed: '已确认', in_progress: '执行中',
  completed: '已完成', cancelled: '已取消',
};

// GET /api/orders/:orderId/changes
router.get('/:orderId/changes', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM change_records WHERE order_id=$1 ORDER BY created_at DESC',
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:orderId/changes —— 记录变更并同步生效到订单
// before_value 一律由服务端按订单当前真实值推导，避免手填出错
router.post('/:orderId/changes', async (req, res) => {
  const { orderId } = req.params;
  const { change_type, reason } = req.body;
  if (!change_type) return res.status(400).json({ error: '变更类型必填' });

  try {
    // 取订单当前值，既用于校验订单存在，也用于推导“变更前”
    const { rows: orderRows } = await db.query('SELECT * FROM banquet_orders WHERE id=$1', [orderId]);
    const order = orderRows[0];
    if (!order) return res.status(404).json({ error: '订单不存在' });

    const after = req.body.after_value != null ? String(req.body.after_value).trim() : '';
    let before_value = null;
    let after_value = after;

    if (change_type === 'reschedule') {
      // 改期：同步更新 event_date
      if (!after) return res.status(400).json({ error: '请填写新的举办日期' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(after)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' });
      before_value = (order.event_date || '').slice(0, 10);
      await db.query('UPDATE banquet_orders SET event_date=$1, updated_at=$2 WHERE id=$3', [after, db.nowStr(), orderId]);

    } else if (change_type === 'table_count') {
      // 桌数变更：同步更新 table_count
      const n = parseInt(after, 10);
      if (!Number.isInteger(n) || n < 1) return res.status(400).json({ error: '桌数应为不小于 1 的整数' });
      before_value = String(order.table_count);
      after_value = String(n);
      await db.query('UPDATE banquet_orders SET table_count=$1, updated_at=$2 WHERE id=$3', [n, db.nowStr(), orderId]);

    } else if (change_type === 'cancellation') {
      // 退订：同步把订单状态置为已取消
      before_value = STATUS_LABEL[order.status] || order.status;
      after_value = STATUS_LABEL.cancelled;
      await db.query('UPDATE banquet_orders SET status=$1, updated_at=$2 WHERE id=$3', ['cancelled', db.nowStr(), orderId]);

    } else {
      // 换菜在“菜单”页单独维护，不再作为变更记录
      return res.status(400).json({ error: '未知的变更类型' });
    }

    const { rows } = await db.query(
      'INSERT INTO change_records (order_id,change_type,before_value,after_value,reason,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [orderId, change_type, before_value, after_value || null, reason || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
