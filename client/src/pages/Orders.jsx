import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrders, getCustomers, createOrder, checkSchedule } from '../api';
import StatusBadge from '../components/StatusBadge';
import { fmtDate, BANQUET_TYPES, STATUS_LABEL } from '../utils/format';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY_ORDER = {
  customer_id: '', banquet_type: '婚宴', event_date: '', location: '',
  table_count: '', guest_count: '', budget: '', notes: ''
};

export default function Orders() {
  const [list, setList]             = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [filters, setFilters]       = useState({ status: '', from: '', to: '' });
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(EMPTY_ORDER);
  const [scheduleAlert, setScheduleAlert] = useState(null);
  const [error, setError]           = useState('');
  const navigate = useNavigate();

  function load() {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.from)   params.from   = filters.from;
    if (filters.to)     params.to     = filters.to;
    getOrders(params).then(setList);
  }

  useEffect(() => { load(); }, [filters]);
  useEffect(() => { getCustomers().then(setCustomers); }, []);

  async function handleDateChange(date) {
    setForm(f => ({ ...f, event_date: date }));
    setScheduleAlert(null);
    if (!date) return;
    try {
      const res = await checkSchedule(date);
      if (res.level !== 'ok') setScheduleAlert(res);
    } catch {}
  }

  async function handleCreate() {
    setError('');
    if (!form.banquet_type || !form.event_date || !form.table_count) {
      setError('宴席类型、日期和桌数必填'); return;
    }
    try {
      const order = await createOrder({
        ...form,
        customer_id: form.customer_id || null,
        table_count: Number(form.table_count),
        guest_count: form.guest_count ? Number(form.guest_count) : null,
        budget:      form.budget ? Number(form.budget) : null,
      });
      setModal(false);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.error || '创建失败');
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">宴席订单</h2>
        <button
          onClick={() => { setForm(EMPTY_ORDER); setError(''); setScheduleAlert(null); setModal(true); }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >+ 新建订单</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        <span className="self-center text-gray-400 text-sm">至</span>
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        <button onClick={() => setFilters({ status: '', from: '', to: '' })}
          className="text-sm text-gray-400 hover:text-gray-600">重置</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              {['订单号','客户','类型','日期','桌数','状态','操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/orders/${o.id}`} className="text-blue-600 hover:underline font-mono text-xs">{o.order_no}</Link>
                </td>
                <td className="px-4 py-3">{o.customer_name || <span className="text-gray-400">未关联</span>}</td>
                <td className="px-4 py-3">{o.banquet_type}</td>
                <td className="px-4 py-3">{fmtDate(o.event_date)}</td>
                <td className="px-4 py-3">{o.table_count} 桌</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">
                  <Link to={`/orders/${o.id}`} className="text-blue-600 hover:underline">详情</Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无订单数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="新建宴席订单" onClose={() => setModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">关联客户</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">不关联</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}（{c.phone}）</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">宴席类型 <span className="text-red-500">*</span></label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.banquet_type} onChange={e => setForm({ ...form, banquet_type: e.target.value })}>
                {BANQUET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">举办日期 <span className="text-red-500">*</span></label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.event_date} onChange={e => handleDateChange(e.target.value)} />
              {scheduleAlert && (
                <div className={`mt-1 text-xs px-3 py-2 rounded-lg ${scheduleAlert.level === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-600'}`}>
                  {scheduleAlert.message}
                </div>
              )}
            </div>
            {[
              ['location', '地点', 'text'],
              ['table_count', '桌数 *', 'number'],
              ['guest_count', '人数', 'number'],
              ['budget', '预算（元）', 'number'],
            ].map(([f, l, t]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreate} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">创建订单</button>
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
