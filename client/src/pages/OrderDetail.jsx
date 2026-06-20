import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrder, updateOrder, addChange, addLabor, removeLabor,
  addMenuDetail, removeMenuDetail, saveSettlement, getDishes, getMenus
} from '../api';
import StatusBadge from '../components/StatusBadge';
import ChangeLog from '../components/ChangeLog';
import { fmtDate, fmtMoney, STATUS_LABEL } from '../utils/format';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus]   = useState([]);
  const [tab, setTab]       = useState('info');

  const [changeForm, setChangeForm] = useState({ change_type: 'table_count', before_value: '', after_value: '', reason: '' });
  const [laborForm,  setLaborForm]  = useState({ role: '帮厨', name: '', phone: '', fee: '' });
  const [menuForm,   setMenuForm]   = useState({ menu_id: '', dish_id: '', quantity: 1 });
  const [settleForm, setSettleForm] = useState({ total_amount: '', actual_cost: '', received_amount: '', payment_method: '现金', notes: '' });
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState(null);

  function reload() {
    getOrder(id).then(o => {
      setOrder(o);
      if (o.settlement) {
        setSettleForm({
          total_amount: o.settlement.total_amount,
          actual_cost: o.settlement.actual_cost,
          received_amount: o.settlement.received_amount,
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
  }, [id]);

  async function handleStatusChange(newStatus) {
    await updateOrder(id, { ...order, status: newStatus });
    reload();
  }

  async function handleAddChange() {
    if (!changeForm.before_value && !changeForm.after_value && !changeForm.reason) return;
    await addChange(id, changeForm);
    setChangeForm({ change_type: 'table_count', before_value: '', after_value: '', reason: '' });
    reload();
  }

  async function handleAddLabor() {
    await addLabor(id, { ...laborForm, fee: laborForm.fee ? Number(laborForm.fee) : null });
    setLaborForm({ role: '帮厨', name: '', phone: '', fee: '' });
    reload();
  }

  async function handleAddMenuItem() {
    if (!menuForm.menu_id && !menuForm.dish_id) return;
    await addMenuDetail(id, { ...menuForm, quantity: Number(menuForm.quantity) });
    setMenuForm({ menu_id: '', dish_id: '', quantity: 1 });
    reload();
  }

  async function handleSaveSettlement() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveSettlement(id, {
        total_amount: Number(settleForm.total_amount) || 0,
        actual_cost: Number(settleForm.actual_cost) || 0,
        received_amount: Number(settleForm.received_amount) || 0,
        payment_method: settleForm.payment_method,
        notes: settleForm.notes,
      });
      reload();
      setSaveMsg({ ok: true, text: '结算已保存，订单已标记为已完成' });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.error || err.message || '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <div className="p-8 text-gray-400">加载中...</div>;

  const unreceived = (Number(order.settlement?.total_amount) || 0) - (Number(order.settlement?.received_amount) || 0);

  const TABS = [
    { key: 'info',       label: '基本信息' },
    { key: 'menu',       label: `菜单（${order.menu_details?.length || 0}）` },
    { key: 'labor',      label: `人工（${order.labor?.length || 0}）` },
    { key: 'changes',    label: `变更（${order.changes?.length || 0}）` },
    { key: 'settlement', label: '结算' },
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
              ['地点', order.location || '-'],
              ['桌数', order.table_count + ' 桌'],
              ['人数', order.guest_count ? order.guest_count + ' 人' : '-'],
              ['预算', fmtMoney(order.budget)],
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
              <button onClick={handleAddMenuItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">添加</button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr><th className="text-left pb-2">菜单/菜品</th><th className="text-left pb-2">数量</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.menu_details?.map(d => (
                  <tr key={d.id}>
                    <td className="py-2">{d.menu_name || d.dish_name || '-'}</td>
                    <td className="py-2">{d.quantity}</td>
                    <td className="py-2 text-right">
                      <button onClick={async () => { await removeMenuDetail(id, d.id); reload(); }} className="text-red-500 text-xs hover:underline">移除</button>
                    </td>
                  </tr>
                ))}
                {(!order.menu_details || order.menu_details.length === 0) && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-400">暂无菜单明细</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'labor' && (
          <div>
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
                      <button onClick={async () => { await removeLabor(id, l.id); reload(); }} className="text-red-500 text-xs hover:underline">移除</button>
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
                  value={changeForm.change_type} onChange={e => setChangeForm({ ...changeForm, change_type: e.target.value })}>
                  <option value="table_count">桌数变更</option>
                  <option value="reschedule">改期</option>
                  <option value="menu_change">换菜</option>
                  <option value="cancellation">退订</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">变更前</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
                  value={changeForm.before_value} onChange={e => setChangeForm({ ...changeForm, before_value: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">变更后</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
                  value={changeForm.after_value} onChange={e => setChangeForm({ ...changeForm, after_value: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">原因</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
                  value={changeForm.reason} onChange={e => setChangeForm({ ...changeForm, reason: e.target.value })} />
              </div>
              <button onClick={handleAddChange} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">记录变更</button>
            </div>
            <ChangeLog changes={order.changes} />
          </div>
        )}

        {tab === 'settlement' && (
          <div className="max-w-sm space-y-3">
            {[
              ['total_amount','订单总金额（元）'],
              ['actual_cost','实际成本（元）'],
              ['received_amount','已收款（元）'],
            ].map(([f, l]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={settleForm[f]} onChange={e => setSettleForm({ ...settleForm, [f]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">支付方式</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={settleForm.payment_method} onChange={e => setSettleForm({ ...settleForm, payment_method: e.target.value })}>
                {['现金','微信','转账'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
                value={settleForm.notes} onChange={e => setSettleForm({ ...settleForm, notes: e.target.value })} />
            </div>
            {order.settlement && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">总金额</span><span>{fmtMoney(order.settlement.total_amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">实际成本</span><span>{fmtMoney(order.settlement.actual_cost)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">已收款</span><span className="text-green-600">{fmtMoney(order.settlement.received_amount)}</span></div>
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                  <span>未收款</span>
                  <span className={unreceived > 0 ? 'text-red-500' : 'text-green-600'}>{fmtMoney(unreceived)}</span>
                </div>
              </div>
            )}
            {saveMsg && (
              <div className={`rounded-lg px-3 py-2 text-sm ${saveMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg.text}
              </div>
            )}
            <button onClick={handleSaveSettlement} disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
              {saving ? '保存中...' : '保存结算'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
