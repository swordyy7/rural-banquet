import { useEffect, useState } from 'react';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../api';
import { fmtMoney } from '../utils/format';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY = { name: '', category: '', unit: '', unit_price: '', notes: '' };

export default function Materials() {
  const [list, setList]     = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  function reload() { getMaterials().then(setList); }
  useEffect(() => { reload(); }, []);

  function openEdit(m = null) {
    setForm(m
      ? { name: m.name, category: m.category || '', unit: m.unit || '', unit_price: m.unit_price || '', notes: m.notes || '' }
      : EMPTY);
    setEditId(m?.id || null);
    setModal(true);
  }

  async function handleSave() {
    const data = { ...form, unit_price: form.unit_price ? Number(form.unit_price) : null };
    if (editId) await updateMaterial(editId, data);
    else await createMaterial(data);
    setModal(false); reload();
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">物料 & 人工</h2>
        <button onClick={() => openEdit()} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建物料</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>{['名称','类别','单位','单价','备注','操作'].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-gray-500">{m.category || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{m.unit || '-'}</td>
                <td className="px-4 py-3">{fmtMoney(m.unit_price)}</td>
                <td className="px-4 py-3 text-gray-500">{m.notes || '-'}</td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => openEdit(m)} className="text-blue-600 hover:underline text-xs">编辑</button>
                  <button onClick={async () => { if(confirm('删除？')) { await deleteMaterial(m.id); reload(); } }} className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无物料数据</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? '编辑物料' : '新建物料'} onClose={() => setModal(false)}>
          <div className="space-y-3">
            {[
              ['name','名称*','text'],
              ['category','类别（食材/餐具/设备）','text'],
              ['unit','单位（斤/个/件）','text'],
              ['unit_price','单价（元）','number'],
              ['notes','备注','text'],
            ].map(([f,l,t]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">保存</button>
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
