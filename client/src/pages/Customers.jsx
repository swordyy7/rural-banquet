import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getVillages, createVillage } from '../api';
import { fmtDate } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import PriceBandPanel from '../components/PriceBandPanel';

const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY = { name: '', phone: '', village_id: '', address: '', notes: '' };

export default function Customers() {
  const [list, setList] = useState([]);
  const [villages, setVillages] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [mainTab, setMainTab] = useState('customers');
  const [addingVillage, setAddingVillage] = useState(false);
  const [newVillage, setNewVillage] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  function load() {
    getCustomers(search).then(setList);
  }

  useEffect(() => { load(); }, [search]);
  useEffect(() => { getVillages().then(setVillages); }, []);

  async function saveNewVillage() {
    const t = newVillage.trim();
    if (!t) return;
    try {
      const v = await createVillage({ name: t });
      setNewVillage(''); setAddingVillage(false);
      getVillages().then(setVillages);
      setForm(f => ({ ...f, village_id: String(v.id) })); // 新建后自动选中
    } catch (e) { alert(e.error || '新增村失败'); }
  }

  function openAdd() {
    setForm(EMPTY); setEditId(null); setError(''); setAddingVillage(false); setNewVillage(''); setModal('edit');
  }
  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone, village_id: c.village_id ?? '', address: c.address || '', notes: c.notes || '' });
    setEditId(c.id); setError(''); setAddingVillage(false); setNewVillage(''); setModal('edit');
  }

  async function handleSave() {
    setError('');
    if (!form.name.trim() || !form.phone.trim()) { setError('姓名和电话必填'); return; }
    const data = { ...form, village_id: form.village_id ? Number(form.village_id) : null };
    try {
      if (editId) await updateCustomer(editId, data);
      else await createCustomer(data);
      setModal(null);
      load();
    } catch (err) {
      setError(err.error || '保存失败');
    }
  }

  async function handleDelete(id) {
    if (!confirm('确认删除该客户？')) return;
    try {
      await deleteCustomer(id);
      load();
    } catch (err) {
      alert(err.error || '删除失败');
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">客户管理</h2>
        {mainTab === 'customers' && (
          <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            + 新建客户
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[['customers', '客户'], ['pricebands', '价格带']].map(([k, l]) => (
            <button key={k} onClick={() => setMainTab(k)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${mainTab === k ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      {mainTab === 'pricebands' ? <PriceBandPanel /> : (
      <>
      <div className="mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="搜索姓名或电话..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="px-4 py-3 text-left font-medium">姓名</th>
              <th className="px-4 py-3 text-left font-medium">电话</th>
              <th className="px-4 py-3 text-left font-medium">村 / 地址</th>
              <th className="px-4 py-3 text-left font-medium">备注</th>
              <th className="px-4 py-3 text-left font-medium">登记时间</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3 text-gray-500">
                  {c.village_name
                    ? <>{c.village_name}{c.address ? <span className="text-gray-400"> · {c.address}</span> : ''}</>
                    : (c.address || '-')}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.notes || '-'}</td>
                <td className="px-4 py-3 text-gray-400">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline">编辑</button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">删除</button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无客户数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {modal === 'edit' && (
        <Modal title={editId ? '编辑客户' : '新建客户'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[['name', '姓名'], ['phone', '电话']].map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {label}<span className="text-red-500">*</span>
                </label>
                <input className={INP} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">村（所在村）</label>
              {addingVillage ? (
                <div className="flex gap-2">
                  <input autoFocus className={INP} placeholder="输入新村名"
                    value={newVillage} onChange={e => setNewVillage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNewVillage(); if (e.key === 'Escape') { setAddingVillage(false); setNewVillage(''); } }} />
                  <button type="button" onClick={saveNewVillage} disabled={!newVillage.trim()}
                    className="shrink-0 bg-blue-600 text-white px-3 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">保存</button>
                  <button type="button" onClick={() => { setAddingVillage(false); setNewVillage(''); }}
                    className="shrink-0 border border-gray-300 px-3 rounded-lg text-sm hover:bg-gray-50">取消</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select className={INP} value={form.village_id} onChange={e => setForm({ ...form, village_id: e.target.value })}>
                    <option value="">未选择</option>
                    {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setAddingVillage(true)}
                    className="shrink-0 border border-gray-300 rounded-lg px-3 text-sm text-blue-600 hover:bg-blue-50 whitespace-nowrap">+ 新增村</button>
                </div>
              )}
              {villages.length === 0 && !addingVillage && (
                <p className="mt-1 text-xs text-amber-600">还没有村，点「+ 新增村」先添加一个。</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">详细地址（选填，门牌/组号）</label>
              <input className={INP} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">备注</label>
              <input className={INP} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">保存</button>
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">取消</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
