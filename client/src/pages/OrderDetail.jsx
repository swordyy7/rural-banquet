import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrder, updateOrder, addChange, addLabor, removeLabor,
  addMenuDetail, removeMenuDetail, saveSettlement, getDishes, getMenus,
  getMaterials, addOrderMaterial, removeOrderMaterial
} from '../api';
import StatusBadge from '../components/StatusBadge';
import ChangeLog from '../components/ChangeLog';
import { fmtDate, fmtMoney, STATUS_LABEL } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [order, setOrder] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus]   = useState([]);
  const [materials, setMaterials] = useState([]);
  const [tab, setTab]       = useState('info');

  const [changeForm, setChangeForm] = useState({ change_type: 'table_count', before_value: '', after_value: '', reason: '' });
  const [laborForm,  setLaborForm]  = useState({ role: '帮厨', name: '', phone: '', fee: '' });
  const [menuForm,   setMenuForm]   = useState({ menu_id: '', dish_id: '', quantity: 1, notes: '' });
  const [prepForm,   setPrepForm]   = useState({ material_id: '', planned_qty: '' });
  const [matActuals, setMatActuals] = useState({}); // 结算核对：order_material.id -> 清点结果
  const [settleForm, setSettleForm] = useState({ received_amount: '', extra_loss: '', payment_method: '现金', notes: '' });
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState(null);
  const [menuMsg, setMenuMsg]       = useState(null);
  const [changeMsg, setChangeMsg]   = useState(null);
  const [prepMsg, setPrepMsg]       = useState(null);

  function reload() {
    getOrder(id).then(o => {
      setOrder(o);
      // 结算物料核对默认清点结果 = 已清点值，否则等于准备数（默认无损耗）
      const am = {};
      (o.materials || []).forEach(m => { am[m.id] = m.actual_qty != null ? m.actual_qty : m.planned_qty; });
      setMatActuals(am);
      if (o.settlement) {
        setSettleForm({
          received_amount: o.settlement.received_amount,
          extra_loss: o.settlement.extra_loss ?? '',
          payment_method: o.settlement.payment_method || '现金',
          notes: o.settlement.notes || '',
        });
      }
    });
  }

  useEffect(() => {
    reload();
    getDishes().then(setDishes);
    getMenus().then(setMenus);
    getMaterials().then(setMaterials);
  }, [id]);

  async function handleStatusChange(newStatus) {
    await updateOrder(id, { ...order, status: newStatus });
    reload();
  }

  // 按变更类型带出订单当前值，作为“变更前”只读展示
  function currentValue(type) {
    if (!order) return '';
    if (type === 'reschedule')   return fmtDate(order.event_date);
    if (type === 'table_count')  return `${order.table_count} 桌`;
    if (type === 'cancellation') return STATUS_LABEL[order.status] || order.status;
    return '';
  }

  async function handleAddChange() {
    const t = changeForm.change_type;
    if (t === 'cancellation') {
      if (!confirm('确认将该订单改为「已取消」？此操作会同步更新订单状态。')) return;
    } else if (!changeForm.after_value) {
      setChangeMsg({ ok: false, text: '请填写「变更后」的值' });
      return;
    }
    setChangeMsg(null);
    try {
      await addChange(id, changeForm);
      setChangeForm({ change_type: 'table_count', before_value: '', after_value: '', reason: '' });
      reload();
      setChangeMsg({ ok: true, text: '变更已记录并同步到订单' });
    } catch (err) {
      setChangeMsg({ ok: false, text: err.error || err.message || '记录失败，请重试' });
    }
  }

  async function handleAddLabor() {
    await addLabor(id, { ...laborForm, fee: laborForm.fee ? Number(laborForm.fee) : null });
    setLaborForm({ role: '帮厨', name: '', phone: '', fee: '' });
    reload();
  }

  async function handleAddMenuItem() {
    if (!menuForm.menu_id && !menuForm.dish_id) return;
    setMenuMsg(null);
    try {
      await addMenuDetail(id, { ...menuForm, quantity: Number(menuForm.quantity) || 1 });
      setMenuForm({ menu_id: '', dish_id: '', quantity: 1, notes: '' });
      reload();
    } catch (err) {
      setMenuMsg(err.error || err.message || '添加失败，请重试');
    }
  }

  async function handleAddPrep() {
    if (!prepForm.material_id || !prepForm.planned_qty) {
      setPrepMsg({ ok: false, text: '请选择物料并填写准备数量' });
      return;
    }
    setPrepMsg(null);
    try {
      await addOrderMaterial(id, {
        material_id: Number(prepForm.material_id),
        planned_qty: Number(prepForm.planned_qty),
      });
      setPrepForm({ material_id: '', planned_qty: '' });
      reload();
      getMaterials().then(setMaterials); // 库存已扣减，刷新物料目录
      setPrepMsg({ ok: true, text: '已登记并扣减库存' });
    } catch (err) {
      setPrepMsg({ ok: false, text: err.error || err.message || '登记失败，请重试' });
    }
  }

  async function handleRemovePrep(itemId) {
    await removeOrderMaterial(id, itemId);
    reload();
    getMaterials().then(setMaterials); // 准备数已回退库存，刷新物料目录
  }

  async function handleSaveSettlement() {
    if (order.settlement && !confirm('该订单已结算，确认覆盖原结算信息？')) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await saveSettlement(id, {
        received_amount: Number(settleForm.received_amount) || 0,
        extra_loss: Number(settleForm.extra_loss) || 0,
        payment_method: settleForm.payment_method,
        notes: settleForm.notes,
        materials: (order.materials || []).map(m => ({ id: m.id, actual_qty: Number(matActuals[m.id]) || 0 })),
      });
      reload();
      const lossText = res.total_loss_amount ? `，本单物料损耗 ${fmtMoney(res.total_loss_amount)}` : '';
      setSaveMsg({ ok: true, text: `结算已保存，订单已标记为已完成${lossText}` });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.error || err.message || '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <div className="p-8 text-gray-400">加载中...</div>;

  // 已完成订单：菜单/准备/人工/结算锁定，不可再修改
  const isCompleted = order.status === 'completed';
  const lockedNotice = (
    <div className="mb-4 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500">
      订单已完成，内容已锁定，不可修改。如需调整请先在右上角将状态改回非「已完成」。
    </div>
  );

  // 结算页损耗实时预览：合计 = Σ max(准备数 - 清点结果, 0) × 单价
  const totalLossPreview = (order.materials || []).reduce((sum, m) => {
    const actual = Number(matActuals[m.id]) || 0;
    return sum + Math.max((Number(m.planned_qty) || 0) - actual, 0) * (Number(m.unit_price) || 0);
  }, 0);

  // 结算财务派生（实时预览）
  const serviceFee = Number(order.service_fee) || 0;
  const received   = Number(settleForm.received_amount) || 0;
  const extraLoss  = Number(settleForm.extra_loss) || 0; // 额外损耗（人工估损等）
  const totalLoss  = totalLossPreview + extraLoss;       // 损耗合计 = 物料损耗 + 额外损耗
  const helperFee  = (order.labor || []).reduce((s, l) => s + (Number(l.fee) || 0), 0); // 帮厨费用：人工费用合计
  const discount   = serviceFee - received;             // >0 折扣；<0 额外收入
  const profit     = received - totalLoss;

  const TABS = [
    { key: 'info',       label: '基本信息' },
    { key: 'menu',       label: `菜单（${order.menu_details?.length || 0}）` },
    { key: 'prepare',    label: `准备（${order.materials?.length || 0}）` },
    { key: 'labor',      label: `人工（${order.labor?.length || 0}）` },
    { key: 'changes',    label: `变更（${order.changes?.length || 0}）` },
    ...(isAdmin ? [{ key: 'settlement', label: '结算' }] : []),
  ];

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate('/orders')} className="text-sm text-gray-400 hover:text-gray-600 mb-2">← 返回订单列表</button>
          <h2 className="text-xl font-bold text-gray-900">{order.order_no}</h2>
          <p className="text-sm text-gray-500">{order.banquet_type} · {fmtDate(order.event_date)} · {order.location || '地点未填'}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={order.status}
            onChange={e => handleStatusChange(e.target.value)}
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t.key ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">

        {tab === 'info' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['客户', order.customer_name || '-'],
              ['客户电话', order.customer_phone || '-'],
              ['宴席类型', order.banquet_type],
              ['举办日期', fmtDate(order.event_date)],
              ['村', order.village_name || '-'],
              ['详细地址', order.location || '-'],
              ['桌数', order.table_count + ' 桌'],
              ['人数', order.guest_count ? order.guest_count + ' 人' : '-'],
              ['预算', fmtMoney(order.budget)],
              ['服务费', fmtMoney(order.service_fee)],
              ['创建时间', fmtDate(order.created_at)],
            ].map(([l, v]) => (
              <div key={l} className="border-b border-gray-50 pb-3">
                <div className="text-xs text-gray-400 mb-0.5">{l}</div>
                <div className="font-medium text-gray-800">{v}</div>
              </div>
            ))}
            {order.notes && (
              <div className="col-span-2 border-b border-gray-50 pb-3">
                <div className="text-xs text-gray-400 mb-0.5">备注</div>
                <div className="text-gray-700">{order.notes}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'menu' && (
          <div>
            {isCompleted && lockedNotice}
            {!isCompleted && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={menuForm.menu_id} onChange={e => setMenuForm({ ...menuForm, menu_id: e.target.value, dish_id: '' })}>
                <option value="">选菜单模板</option>
                {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={menuForm.dish_id} onChange={e => setMenuForm({ ...menuForm, dish_id: e.target.value, menu_id: '' })}>
                <option value="">或选单个菜品</option>
                {dishes.map(d => <option key={d.id} value={d.id}>{d.name}（¥{d.unit_price}）</option>)}
              </select>
              <input type="number" min="1" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                placeholder="数量" value={menuForm.quantity} onChange={e => setMenuForm({ ...menuForm, quantity: e.target.value })} />
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
                placeholder="备注" value={menuForm.notes} onChange={e => setMenuForm({ ...menuForm, notes: e.target.value })} />
              <button onClick={handleAddMenuItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                {menuForm.menu_id ? '套用菜单' : '添加菜品'}
              </button>
            </div>
            )}
            {menuMsg && !isCompleted && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{menuMsg}</div>}
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="text-left pb-2">菜品</th>
                  <th className="text-left pb-2">来源菜单</th>
                  <th className="text-left pb-2">数量</th>
                  <th className="text-left pb-2">备注</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.menu_details?.map(d => (
                  <tr key={d.id}>
                    <td className="py-2 font-medium">{d.dish_name || '-'}</td>
                    <td className="py-2 text-gray-500">{d.menu_name || '单独添加'}</td>
                    <td className="py-2">{d.quantity}</td>
                    <td className="py-2 text-gray-500">{d.notes || '-'}</td>
                    <td className="py-2 text-right">
                      {!isCompleted && (
                        <button onClick={async () => { await removeMenuDetail(id, d.id); reload(); }} className="text-red-500 text-xs hover:underline">移除</button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!order.menu_details || order.menu_details.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">暂无菜单明细</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'prepare' && (
          <div>
            {isCompleted && lockedNotice}
            {!isCompleted && (
            <div className="flex gap-3 mb-4 flex-wrap items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">物料</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={prepForm.material_id} onChange={e => setPrepForm({ ...prepForm, material_id: e.target.value })}>
                  <option value="">选择物料</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}（库存 {Number(m.stock)}{m.unit || ''}）</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">准备数量</label>
                <input type="number" min="0" step="any" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
                  value={prepForm.planned_qty} onChange={e => setPrepForm({ ...prepForm, planned_qty: e.target.value })} />
              </div>
              <button onClick={handleAddPrep} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">登记准备</button>
            </div>
            )}
            {prepMsg && !isCompleted && (
              <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${prepMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {prepMsg.text}
              </div>
            )}
            <p className="text-xs text-gray-400 mb-3">登记准备物料会按数量从库存借出；宴席结束后清点归还，清点数自动回补库存，损耗 = 准备数 − 清点数（未归还/损坏的部分）。</p>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500"><tr>
                {['物料','准备数','清点结果','损耗',''].map(h => <th key={h} className="text-left pb-2">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {order.materials?.map(m => {
                  const loss = m.actual_qty != null ? Math.max(Number(m.planned_qty) - Number(m.actual_qty), 0) : null;
                  return (
                    <tr key={m.id}>
                      <td className="py-2">{m.material_name || '-'}</td>
                      <td className="py-2">{Number(m.planned_qty)} {m.unit || ''}</td>
                      <td className="py-2">{m.actual_qty != null ? `${Number(m.actual_qty)} ${m.unit || ''}` : <span className="text-gray-400">待清点</span>}</td>
                      <td className="py-2">{loss != null ? <span className={loss > 0 ? 'text-red-500' : 'text-gray-600'}>{loss} {m.unit || ''}</span> : '-'}</td>
                      <td className="py-2 text-right">
                        {!isCompleted && (
                          <button onClick={() => handleRemovePrep(m.id)} className="text-red-500 text-xs hover:underline">移除</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!order.materials || order.materials.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">暂无准备物料</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'labor' && (
          <div>
            {isCompleted && lockedNotice}
            {!isCompleted && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={laborForm.role} onChange={e => setLaborForm({ ...laborForm, role: e.target.value })}>
                {['厨师','帮厨','服务员','司机'].map(o => <option key={o}>{o}</option>)}
              </select>
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
                placeholder="姓名" value={laborForm.name} onChange={e => setLaborForm({ ...laborForm, name: e.target.value })} />
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
                placeholder="电话" value={laborForm.phone} onChange={e => setLaborForm({ ...laborForm, phone: e.target.value })} />
              <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24"
                placeholder="费用" value={laborForm.fee} onChange={e => setLaborForm({ ...laborForm, fee: e.target.value })} />
              <button onClick={handleAddLabor} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">添加</button>
            </div>
            )}
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500"><tr>
                {['角色','姓名','电话','费用',''].map(h => <th key={h} className="text-left pb-2">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {order.labor?.map(l => (
                  <tr key={l.id}>
                    <td className="py-2">{l.role}</td>
                    <td className="py-2">{l.name || '-'}</td>
                    <td className="py-2">{l.phone || '-'}</td>
                    <td className="py-2">{fmtMoney(l.fee)}</td>
                    <td className="py-2 text-right">
                      {!isCompleted && (
                        <button onClick={async () => { await removeLabor(id, l.id); reload(); }} className="text-red-500 text-xs hover:underline">移除</button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!order.labor || order.labor.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">暂无人工安排</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'changes' && (
          <div>
            <div className="flex gap-3 mb-4 flex-wrap items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">变更类型</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={changeForm.change_type}
                  onChange={e => setChangeForm({ change_type: e.target.value, before_value: '', after_value: '', reason: '' })}>
                  <option value="table_count">桌数变更</option>
                  <option value="reschedule">改期</option>
                  <option value="cancellation">退订</option>
                </select>
              </div>

              {/* 变更前：自动带出订单当前值（只读） */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">变更前（当前值）</label>
                <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm w-32 text-gray-600">
                  {currentValue(changeForm.change_type)}
                </div>
              </div>

              {/* 变更后：按类型渲染对应输入；退订无需填值 */}
              {changeForm.change_type === 'cancellation' ? (
                <div className="self-end pb-2 text-sm text-red-600">提交后订单将变为「已取消」</div>
              ) : changeForm.change_type === 'reschedule' ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">变更后（新日期）</label>
                  <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={changeForm.after_value} onChange={e => setChangeForm({ ...changeForm, after_value: e.target.value })} />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">变更后（新桌数）</label>
                  <input type="number" min="1" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
                    value={changeForm.after_value} onChange={e => setChangeForm({ ...changeForm, after_value: e.target.value })} />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">原因</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
                  value={changeForm.reason} onChange={e => setChangeForm({ ...changeForm, reason: e.target.value })} />
              </div>
              <button onClick={handleAddChange} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">记录变更</button>
            </div>
            {changeMsg && (
              <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${changeMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {changeMsg.text}
              </div>
            )}
            <ChangeLog changes={order.changes} />
          </div>
        )}

        {tab === 'settlement' && isAdmin && (
          <div className="max-w-lg space-y-3">
            {isCompleted && lockedNotice}
            <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-600">服务费（价格带）</span>
              <span className="font-semibold text-blue-700">{fmtMoney(order.service_fee)}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">实际收款金额（元）</label>
              <input type="number" disabled={isCompleted} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                value={settleForm.received_amount} onChange={e => setSettleForm({ ...settleForm, received_amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">额外损耗（元，可选）</label>
              <input type="number" disabled={isCompleted} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                value={settleForm.extra_loss} onChange={e => setSettleForm({ ...settleForm, extra_loss: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">支付方式</label>
              <select disabled={isCompleted} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                value={settleForm.payment_method} onChange={e => setSettleForm({ ...settleForm, payment_method: e.target.value })}>
                {['现金','微信','转账'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
              <textarea disabled={isCompleted} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400" rows={2}
                value={settleForm.notes} onChange={e => setSettleForm({ ...settleForm, notes: e.target.value })} />
            </div>

            {order.materials && order.materials.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-medium text-gray-700 mb-2">物料核对（清点归还，清点数回补库存，损耗 = 准备数 − 清点数）</div>
                <table className="w-full text-sm mb-2">
                  <thead className="text-xs text-gray-400"><tr>
                    <th className="text-left pb-1 font-medium">物料</th>
                    <th className="text-left pb-1 font-medium">准备数</th>
                    <th className="text-left pb-1 font-medium">清点结果</th>
                    <th className="text-right pb-1 font-medium">损耗金额</th>
                  </tr></thead>
                  <tbody>
                    {order.materials.map(m => {
                      const actual = Number(matActuals[m.id]) || 0;
                      const lossAmt = Math.max((Number(m.planned_qty) || 0) - actual, 0) * (Number(m.unit_price) || 0);
                      return (
                        <tr key={m.id}>
                          <td className="py-1">{m.material_name || '-'}</td>
                          <td className="py-1">{Number(m.planned_qty)} {m.unit || ''}</td>
                          <td className="py-1">
                            <input type="number" min="0" step="any" disabled={isCompleted} className="border border-gray-300 rounded px-2 py-1 text-sm w-20 disabled:bg-gray-100 disabled:text-gray-400"
                              value={matActuals[m.id] ?? ''}
                              onChange={e => setMatActuals({ ...matActuals, [m.id]: e.target.value })} />
                          </td>
                          <td className="py-1 text-right text-red-500">{fmtMoney(lossAmt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1">
                  <span className="text-gray-600">合计损耗</span>
                  <span className="text-red-500">{fmtMoney(totalLossPreview)}</span>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">服务费</span><span>{fmtMoney(serviceFee)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">实际收款</span><span className="text-green-600">{fmtMoney(received)}</span></div>
              {serviceFee > 0 && discount > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">折扣（服务费 − 实收）</span><span className="text-orange-600">{fmtMoney(discount)}</span></div>
              )}
              {serviceFee > 0 && discount < 0 && (
                <div className="flex justify-between"><span className="text-gray-500">额外收入（实收 − 服务费）</span><span className="text-emerald-600">{fmtMoney(-discount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">物料损耗费</span><span className="text-red-500">{fmtMoney(totalLossPreview)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">额外损耗</span><span className="text-red-500">{fmtMoney(extraLoss)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-1"><span className="text-gray-500">损耗合计</span><span className="text-red-500 font-medium">{fmtMoney(totalLoss)}</span></div>
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-1.5 mt-1">
                <span>利润（实收 − 损耗合计）</span>
                <span className={profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{fmtMoney(profit)}</span>
              </div>
              <div className="flex justify-between bg-amber-50 -mx-1 px-2 py-1.5 rounded-md mt-1">
                <span className="text-amber-700">帮厨费用（需转付帮厨，不计入利润）</span>
                <span className="font-semibold text-amber-700">{fmtMoney(helperFee)}</span>
              </div>
            </div>
            {saveMsg && (
              <div className={`rounded-lg px-3 py-2 text-sm ${saveMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg.text}
              </div>
            )}
            {!isCompleted && (
              <button onClick={handleSaveSettlement} disabled={saving}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {saving ? '保存中...' : '保存结算'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
