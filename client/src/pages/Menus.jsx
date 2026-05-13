import { useEffect, useState } from 'react';
import {
  getMenus, createMenu, updateMenu, deleteMenu,
  getDishes, createDish, updateDish, deleteDish
} from '../api';
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

export default function Menus() {
  const [menus, setMenus]   = useState([]);
  const [dishes, setDishes] = useState([]);
  const [tab, setTab]       = useState('menus');
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [editId, setEditId] = useState(null);

  function reload() {
    getMenus().then(setMenus);
    getDishes().then(setDishes);
  }
  useEffect(() => { reload(); }, []);

  function openMenu(m = null) {
    setForm(m
      ? { name: m.name, scene: m.scene || '', price: m.price || '', description: m.description || '' }
      : { name: '', scene: '', price: '', description: '' });
    setEditId(m?.id || null);
    setModal('menu');
  }

  function openDish(d = null) {
    setForm(d
      ? { name: d.name, category: d.category || '', unit_price: d.unit_price || '', description: d.description || '' }
      : { name: '', category: '', unit_price: '', description: '' });
    setEditId(d?.id || null);
    setModal('dish');
  }

  async function saveMenu() {
    if (editId) await updateMenu(editId, form);
    else await createMenu(form);
    setModal(null); reload();
  }

  async function saveDish() {
    if (editId) await updateDish(editId, form);
    else await createDish(form);
    setModal(null); reload();
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">菜单管理</h2>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[['menus','菜单模板'],['dishes','菜品']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 text-sm rounded-md ${tab===k ? 'bg-white shadow font-medium' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'menus' && (
        <div>
          <button onClick={() => openMenu()} className="mb-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建菜单</button>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>{['菜单名称','适用场景','参考价格','说明','操作'].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {menus.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.scene || '-'}</td>
                    <td className="px-4 py-3">{fmtMoney(m.price)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{m.description || '-'}</td>
                    <td className="px-4 py-3 space-x-3">
                      <button onClick={() => openMenu(m)} className="text-blue-600 hover:underline text-xs">编辑</button>
                      <button onClick={async () => { if(confirm('删除？')) { await deleteMenu(m.id); reload(); } }} className="text-red-500 hover:underline text-xs">删除</button>
                    </td>
                  </tr>
                ))}
                {menus.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无菜单</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dishes' && (
        <div>
          <button onClick={() => openDish()} className="mb-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ 新建菜品</button>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>{['菜品名称','类别','单价','说明','操作'].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dishes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500">{d.category || '-'}</td>
                    <td className="px-4 py-3">{fmtMoney(d.unit_price)}</td>
                    <td className="px-4 py-3 text-gray-500">{d.description || '-'}</td>
                    <td className="px-4 py-3 space-x-3">
                      <button onClick={() => openDish(d)} className="text-blue-600 hover:underline text-xs">编辑</button>
                      <button onClick={async () => { if(confirm('删除？')) { await deleteDish(d.id); reload(); } }} className="text-red-500 hover:underline text-xs">删除</button>
                    </td>
                  </tr>
                ))}
                {dishes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无菜品</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'menu' && (
        <Modal title={editId ? '编辑菜单' : '新建菜单'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[
              ['name','菜单名称*','text'],
              ['scene','适用场景','text'],
              ['price','参考价格（元）','number'],
              ['description','说明','text'],
            ].map(([f,l,t]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={saveMenu} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">保存</button>
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'dish' && (
        <Modal title={editId ? '编辑菜品' : '新建菜品'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[
              ['name','菜品名称*','text'],
              ['category','类别','text'],
              ['unit_price','单价（元）','number'],
              ['description','说明','text'],
            ].map(([f,l,t]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={saveDish} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">保存</button>
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
