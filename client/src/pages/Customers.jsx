import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api';
import { fmtDate } from '../utils/format';

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

const EMPTY = { name: '', phone: '', address: '', notes: '' };

export default function Customers() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    getCustomers(search).then(setList);
  }

  useEffect(() => { load(); }, [search]);

  function openAdd() {
    setForm(EMPTY); setEditId(null); setError(''); setModal('edit');
  }
  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone, address: c.address || '', notes: c.notes || '' });
    setEditId(c.id); setError(''); setModal('edit');
  }

  async function handleSave() {
    setError('');
    try {
      if (editId) await updateCustomer(editId, form);
      else await createCustomer(form);
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
        <button onClick={openAdd} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + 新建客户
        </button>
      </div>

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
              <th className="px-4 py-3 text-left font-medium">地址</th>
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
                <td className="px-4 py-3 text-gray-500">{c.address || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{c.notes || '-'}</td>
                <td className="px-4 py-3 text-gray-400">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline">编辑</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline">删除</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无客户数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'edit' && (
        <Modal title={editId ? '编辑客户' : '新建客户'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[
              ['name', '姓名', true],
              ['phone', '电话', true],
              ['address', '地址', false],
              ['notes', '备注', false],
            ].map(([field, label, required]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {label}{required && <span className="text-red-500">*</span>}
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
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
