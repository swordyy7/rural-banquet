import { useEffect, useState } from 'react';
import {
  getVillages, createVillage, updateVillage, deleteVillage,
  getPriceBands, createPriceBand, updatePriceBand, deletePriceBand,
} from '../api';
import { fmtMoney } from '../utils/format';

const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';

const PinIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const PencilIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const TrashIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const SearchIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const EMPTY_BAND = {
  name: '', village_id: '', start_date: '', end_date: '',
  min_tables: '', max_tables: '', service_fee: '', priority: 0, enabled: 1,
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function PriceBandPanel() {
  const [villages, setVillages] = useState([]);
  const [bands, setBands]       = useState([]);
  const [newVillage, setNewVillage] = useState('');
  const [editingId, setEditingId]   = useState(null);
  const [villageSearch, setVillageSearch] = useState('');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY_BAND);
  const [editId, setEditId] = useState(null);
  const [err, setErr]       = useState('');

  function reload() {
    getVillages().then(setVillages);
    getPriceBands().then(setBands);
  }
  useEffect(() => { reload(); }, []);

  async function addVillage() {
    if (!newVillage.trim()) return;
    try { await createVillage({ name: newVillage.trim() }); setNewVillage(''); reload(); }
    catch (e) { alert(e.error || '添加失败'); }
  }
  async function removeVillage(id) {
    if (!confirm('删除该村？相关订单/价格带的村会被置空。')) return;
    await deleteVillage(id); reload();
  }
  async function commitRename(v, name) {
    const t = (name || '').trim();
    setEditingId(null);
    if (!t || t === v.name) return;
    try { await updateVillage(v.id, { name: t }); reload(); }
    catch (e) { alert(e.error || '重命名失败'); }
  }

  function openBand(b = null) {
    setForm(b ? {
      name: b.name, village_id: b.village_id ?? '', start_date: b.start_date || '', end_date: b.end_date || '',
      min_tables: b.min_tables ?? '', max_tables: b.max_tables ?? '', service_fee: b.service_fee ?? '',
      priority: b.priority ?? 0, enabled: b.enabled ?? 1,
    } : EMPTY_BAND);
    setEditId(b?.id || null); setErr(''); setModal(true);
  }
  async function saveBand() {
    setErr('');
    if (!form.name.trim()) { setErr('规则名称必填'); return; }
    try {
      if (editId) await updatePriceBand(editId, form);
      else await createPriceBand(form);
      setModal(false); reload();
    } catch (e) { setErr(e.error || '保存失败'); }
  }

  const rangeText = b => (b.min_tables == null && b.max_tables == null)
    ? '不限'
    : `${b.min_tables ?? 0} ~ ${b.max_tables != null ? b.max_tables : '∞'}`;
  const dateText = b => (!b.start_date && !b.end_date)
    ? '不限'
    : `${b.start_date || '…'} ~ ${b.end_date || '…'}`;

  return (
    <div className="space-y-6">
      {/* 村字典 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-700">村字典</h3>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{villages.length} 个村</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">订单按村选择地点，价格带按村匹配服务费。</p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative w-44">
            <PinIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="新增村名，回车"
              value={newVillage}
              onChange={e => setNewVillage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addVillage(); }}
            />
          </div>
          <button onClick={addVillage} disabled={!newVillage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            添加
          </button>
          {villages.length > 8 && (
            <div className="relative w-44 sm:ml-auto">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="搜索村…"
                value={villageSearch}
                onChange={e => setVillageSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {villages.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            还没有村，先在上方添加一个
          </div>
        ) : (() => {
          const filtered = villages.filter(v => v.name.includes(villageSearch.trim()));
          if (filtered.length === 0) {
            return <div className="text-center py-6 text-sm text-gray-400">未找到匹配「{villageSearch}」的村</div>;
          }
          return (
            <div className="max-h-72 overflow-y-auto -mr-1 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filtered.map(v => (
                  <div key={v.id}
                    className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <PinIcon className="w-4 h-4" />
                    </span>
                    {editingId === v.id ? (
                      <input autoFocus defaultValue={v.name}
                        className="min-w-0 flex-1 border-b border-blue-400 bg-transparent text-sm font-medium text-gray-800 focus:outline-none"
                        onBlur={e => commitRename(v, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingId(null); }}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800" title={v.name}
                        onDoubleClick={() => setEditingId(v.id)}>
                        {v.name}
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setEditingId(v.id)} title="重命名"
                        className="rounded p-1 text-gray-400 hover:bg-blue-100 hover:text-blue-600">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeVillage(v.id)} title="删除"
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-500">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 价格带规则 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">价格带规则</h3>
            <p className="text-xs text-gray-400 mt-0.5">按 村 / 日期区间 / 桌数范围 设置整单服务费；新建订单时自动匹配带入。</p>
          </div>
          <button onClick={() => openBand()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap">+ 新建价格带</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>{['规则名', '村', '日期区间', '桌数范围', '服务费', '优先级', '状态', '操作'].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bands.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-gray-600">{b.village_name || '不限'}</td>
                <td className="px-4 py-3 text-gray-600">{dateText(b)}</td>
                <td className="px-4 py-3 text-gray-600">{rangeText(b)}</td>
                <td className="px-4 py-3">{fmtMoney(b.service_fee)}</td>
                <td className="px-4 py-3 text-gray-600">{b.priority}</td>
                <td className="px-4 py-3">{b.enabled ? <span className="text-green-600">启用</span> : <span className="text-gray-400">停用</span>}</td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  <button onClick={() => openBand(b)} className="text-blue-600 hover:underline text-xs">编辑</button>
                  <button onClick={async () => { if (confirm('删除该价格带？')) { await deletePriceBand(b.id); reload(); } }} className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
            {bands.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无价格带</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{editId ? '编辑价格带' : '新建价格带'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              <Field label="规则名称 *"><input className={INP} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="适用村（不选 = 不限）">
                <select className={INP} value={form.village_id} onChange={e => setForm({ ...form, village_id: e.target.value })}>
                  <option value="">不限</option>
                  {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="起始日期（空=不限）"><input type="date" className={INP} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></Field>
                <Field label="结束日期（空=不限）"><input type="date" className={INP} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="桌数下限（含，空=不限）"><input type="number" min="0" className={INP} placeholder="不限" value={form.min_tables} onChange={e => setForm({ ...form, min_tables: e.target.value })} /></Field>
                <Field label="桌数上限（不含，空=不限）"><input type="number" min="0" className={INP} placeholder="不限" value={form.max_tables} onChange={e => setForm({ ...form, max_tables: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="整单服务费（元）*"><input type="number" min="0" className={INP} value={form.service_fee} onChange={e => setForm({ ...form, service_fee: e.target.value })} /></Field>
                <Field label="优先级（大者优先）"><input type="number" className={INP} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked ? 1 : 0 })} />
                启用该规则
              </label>
              <p className="text-xs text-gray-400">桌数区间为左闭右开 [下限, 上限)，如 0~10 与 10~20 不重叠；命中多条时按优先级、再按条件具体度选取。</p>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={saveBand} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">保存</button>
                <button onClick={() => setModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
