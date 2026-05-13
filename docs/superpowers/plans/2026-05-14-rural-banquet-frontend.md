# 农村流水席 — 前端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 React 18 + Vite + Tailwind CSS 前端，包含登录、仪表盘、客户、订单、菜单、物料、统计共 8 个页面。

**Architecture:** `client/src/` 下按 pages / components / api / contexts / utils 分层，axios 封装所有接口，React Router v6 管理路由，AuthContext 管理登录状态。

**Tech Stack:** React 18, Vite, Tailwind CSS, React Router v6, axios

**Working directory for all commands:** `C:\Users\swordy\lunwen\client`

**前提：** 后端已启动在 `http://localhost:3001`

---

## 文件结构

```
client/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx                     ← 路由配置
    ├── api/
    │   └── index.js                ← axios 实例 + 所有接口
    ├── contexts/
    │   └── AuthContext.jsx
    ├── utils/
    │   └── format.js
    ├── components/
    │   ├── Layout.jsx              ← 侧边栏 + 顶栏
    │   ├── StatusBadge.jsx
    │   ├── ScheduleAlert.jsx
    │   └── ChangeLog.jsx
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Customers.jsx
        ├── Orders.jsx
        ├── OrderDetail.jsx
        ├── Menus.jsx
        ├── Materials.jsx
        └── Statistics.jsx
```

---

## Task 1: 初始化前端项目

**Files:**
- Create: `client/` (整个目录)

- [ ] **Step 1: 创建 Vite + React 项目**

```bash
cd C:\Users\swordy\lunwen
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 `client/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: 替换 `client/src/index.css` 内容**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: 配置 `client/vite.config.js`（代理到后端）**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 5: 验证项目启动**

```bash
npm run dev
```
预期：浏览器打开 `http://localhost:5173`，显示 Vite + React 默认页面

---

## Task 2: API 封装 + 工具函数

**Files:**
- Create: `client/src/api/index.js`
- Create: `client/src/utils/format.js`

- [ ] **Step 1: 创建 `client/src/api/index.js`**

```js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);

// Customers
export const getCustomers = (search) => api.get('/customers', { params: { search } });
export const getCustomer   = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Orders
export const getOrders  = (params) => api.get('/orders', { params });
export const getOrder   = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);
export const checkSchedule = (date, orderId) =>
  api.get('/orders/schedule-check', { params: { date, orderId } });
export const addMenuDetail    = (orderId, data) => api.post(`/orders/${orderId}/menu-details`, data);
export const removeMenuDetail = (orderId, detailId) => api.delete(`/orders/${orderId}/menu-details/${detailId}`);

// Changes
export const getChanges   = (orderId) => api.get(`/orders/${orderId}/changes`);
export const addChange    = (orderId, data) => api.post(`/orders/${orderId}/changes`, data);

// Labor
export const getLabor    = (orderId) => api.get(`/orders/${orderId}/labor`);
export const addLabor    = (orderId, data) => api.post(`/orders/${orderId}/labor`, data);
export const removeLabor = (orderId, laborId) => api.delete(`/orders/${orderId}/labor/${laborId}`);

// Menus
export const getMenus   = () => api.get('/menus');
export const createMenu = (data) => api.post('/menus', data);
export const updateMenu = (id, data) => api.put(`/menus/${id}`, data);
export const deleteMenu = (id) => api.delete(`/menus/${id}`);

// Dishes
export const getDishes   = () => api.get('/dishes');
export const createDish  = (data) => api.post('/dishes', data);
export const updateDish  = (id, data) => api.put(`/dishes/${id}`, data);
export const deleteDish  = (id) => api.delete(`/dishes/${id}`);

// Materials
export const getMaterials   = () => api.get('/materials');
export const createMaterial = (data) => api.post('/materials', data);
export const updateMaterial = (id, data) => api.put(`/materials/${id}`, data);
export const deleteMaterial = (id) => api.delete(`/materials/${id}`);

// Settlements
export const getSettlement    = (orderId) => api.get(`/orders/${orderId}/settlement`);
export const saveSettlement   = (orderId, data) => api.post(`/orders/${orderId}/settlement`, data);

// Statistics
export const getStatistics = (params) => api.get('/statistics', { params });
```

- [ ] **Step 2: 创建 `client/src/utils/format.js`**

```js
export function fmtDate(str) {
  if (!str) return '-';
  return str.slice(0, 10);
}

export function fmtMoney(val) {
  if (val === null || val === undefined) return '-';
  return `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

export const STATUS_LABEL = {
  pending:     '待确认',
  confirmed:   '已确认',
  in_progress: '执行中',
  completed:   '已完成',
  cancelled:   '已取消',
};

export const STATUS_COLOR = {
  pending:     'bg-yellow-100 text-yellow-800',
  confirmed:   'bg-blue-100 text-blue-800',
  in_progress: 'bg-sky-100 text-sky-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-red-100 text-red-800',
};

export const BANQUET_TYPES = ['婚宴', '寿宴', '乔迁宴', '满月宴', '升学宴', '其他'];
```

---

## Task 3: AuthContext + 路由配置

**Files:**
- Create: `client/src/contexts/AuthContext.jsx`
- Create: `client/src/App.jsx`
- Modify: `client/src/main.jsx`

- [ ] **Step 1: 创建 `client/src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  function doLogin(token, userData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function doLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, doLogin, doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: 创建 `client/src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Menus from './pages/Menus';
import Materials from './pages/Materials';
import Statistics from './pages/Statistics';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="customers"   element={<Customers />} />
            <Route path="orders"      element={<Orders />} />
            <Route path="orders/:id"  element={<OrderDetail />} />
            <Route path="menus"       element={<Menus />} />
            <Route path="materials"   element={<Materials />} />
            <Route path="statistics"  element={<Statistics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: 替换 `client/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## Task 4: Layout 组件

**Files:**
- Create: `client/src/components/Layout.jsx`
- Create: `client/src/components/StatusBadge.jsx`

- [ ] **Step 1: 创建 `client/src/components/StatusBadge.jsx`**

```jsx
import { STATUS_LABEL, STATUS_COLOR } from '../utils/format';

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}
```

- [ ] **Step 2: 创建 `client/src/components/Layout.jsx`**

```jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { to: '/dashboard',  label: '仪表盘',   icon: '🏠' },
  { to: '/orders',     label: '宴席订单', icon: '📋' },
  { to: '/customers',  label: '客户管理', icon: '👥' },
  { to: '/menus',      label: '菜单管理', icon: '🍽️' },
  { to: '/materials',  label: '物料 & 人工', icon: '📦' },
  { to: '/statistics', label: '统计分析', icon: '📊' },
];

export default function Layout() {
  const { user, doLogout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    doLogout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="text-base font-bold text-gray-900 leading-tight">农村流水席</div>
          <div className="text-xs text-gray-400 mt-0.5">信息管理系统</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">{user?.username}（{user?.role === 'admin' ? '管理员' : '工作人员'}）</div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-red-500 hover:text-red-700"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## Task 5: 登录页

**Files:**
- Create: `client/src/pages/Login.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login } from '../api';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { doLogin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      doLogin(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.error || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">农村流水席</h1>
        <p className="text-sm text-gray-400 mb-6">信息管理系统</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">默认账号: admin / admin123</p>
      </div>
    </div>
  );
}
```

---

## Task 6: 仪表盘

**Files:**
- Create: `client/src/pages/Dashboard.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Dashboard.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, getStatistics } from '../api';
import StatusBadge from '../components/StatusBadge';
import { fmtDate, fmtMoney } from '../utils/format';

export default function Dashboard() {
  const [todayOrders, setTodayOrders] = useState([]);
  const [stats, setStats] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    getOrders({ from: today, to: today }).then(setTodayOrders).catch(() => {});
    const from = today.slice(0, 7) + '-01';
    getStatistics({ from, to: today }).then(setStats).catch(() => {});
  }, []);

  const cards = stats ? [
    { label: '本月接单', value: stats.overview.total_orders + ' 单', color: 'bg-blue-50 text-blue-700' },
    { label: '已完成', value: stats.overview.completed_orders + ' 单', color: 'bg-green-50 text-green-700' },
    { label: '本月营收', value: fmtMoney(stats.overview.total_revenue), color: 'bg-purple-50 text-purple-700' },
    { label: '本月成本', value: fmtMoney(stats.overview.total_cost), color: 'bg-orange-50 text-orange-700' },
  ] : [];

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-4`}>
            <div className="text-xs font-medium mb-1 opacity-70">{c.label}</div>
            <div className="text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 今日订单 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">今日订单（{today}）</h3>
        {todayOrders.length === 0 ? (
          <p className="text-sm text-gray-400">今日暂无宴席安排</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs">
                <th className="pb-2 font-medium">订单号</th>
                <th className="pb-2 font-medium">客户</th>
                <th className="pb-2 font-medium">类型</th>
                <th className="pb-2 font-medium">桌数</th>
                <th className="pb-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="py-2">
                    <Link to={`/orders/${o.id}`} className="text-blue-600 hover:underline">{o.order_no}</Link>
                  </td>
                  <td className="py-2">{o.customer_name || '-'}</td>
                  <td className="py-2">{o.banquet_type}</td>
                  <td className="py-2">{o.table_count} 桌</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

## Task 7: 客户管理页

**Files:**
- Create: `client/src/pages/Customers.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Customers.jsx`**

```jsx
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
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    getCustomers(search).then(setList);
  }

  useEffect(() => { load(); }, [search]);

  function openAdd() { setForm(EMPTY); setEditId(null); setError(''); setModal('edit'); }
  function openEdit(c) { setForm({ name: c.name, phone: c.phone, address: c.address||'', notes: c.notes||'' }); setEditId(c.id); setError(''); setModal('edit'); }

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
    await deleteCustomer(id);
    load();
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
            {[['name','姓名','text',true],['phone','电话','text',true],['address','地址','text',false],['notes','备注','text',false]].map(([field, label, type, required]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
                <input
                  type={type}
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
```

---

## Task 8: 订单列表页

**Files:**
- Create: `client/src/pages/Orders.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Orders.jsx`**

```jsx
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
  const [list, setList]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters]   = useState({ status: '', from: '', to: '' });
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY_ORDER);
  const [scheduleAlert, setScheduleAlert] = useState(null);
  const [error, setError]       = useState('');
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
        <button onClick={() => { setForm(EMPTY_ORDER); setError(''); setScheduleAlert(null); setModal(true); }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + 新建订单
        </button>
      </div>

      {/* 筛选栏 */}
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

      {/* 订单表格 */}
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

      {/* 新建订单弹窗 */}
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
            {[['location','地点','text'],['table_count','桌数 *','number'],['guest_count','人数','number'],['budget','预算（元）','number']].map(([f,l,t]) => (
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
```

---

## Task 9: 订单详情页

**Files:**
- Create: `client/src/pages/OrderDetail.jsx`
- Create: `client/src/components/ChangeLog.jsx`

- [ ] **Step 1: 创建 `client/src/components/ChangeLog.jsx`**

```jsx
import { fmtDate } from '../utils/format';

const CHANGE_LABEL = {
  table_count: '桌数变更',
  reschedule: '改期',
  menu_change: '换菜',
  cancellation: '退订',
};

export default function ChangeLog({ changes }) {
  if (!changes || changes.length === 0) {
    return <p className="text-sm text-gray-400">暂无变更记录</p>;
  }
  return (
    <div className="space-y-3">
      {changes.map(c => (
        <div key={c.id} className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
          <div>
            <span className="text-xs font-semibold text-blue-700">{CHANGE_LABEL[c.change_type] || c.change_type}</span>
            {c.before_value && <span className="text-xs text-gray-500 ml-2">{c.before_value} → {c.after_value}</span>}
            {c.reason && <p className="text-xs text-gray-500">{c.reason}</p>}
            <p className="text-xs text-gray-400">{fmtDate(c.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 创建 `client/src/pages/OrderDetail.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrder, updateOrder, addChange, addLabor, removeLabor,
  addMenuDetail, removeMenuDetail, saveSettlement, getDishes, getMenus
} from '../api';
import StatusBadge from '../components/StatusBadge';
import ChangeLog from '../components/ChangeLog';
import { fmtDate, fmtMoney, BANQUET_TYPES, STATUS_LABEL } from '../utils/format';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [tab, setTab] = useState('info'); // info | menu | labor | changes | settlement

  // 子表单状态
  const [changeForm, setChangeForm]   = useState({ change_type: 'table_count', before_value: '', after_value: '', reason: '' });
  const [laborForm, setLaborForm]     = useState({ role: '帮厨', name: '', phone: '', fee: '' });
  const [menuForm, setMenuForm]       = useState({ menu_id: '', dish_id: '', quantity: 1 });
  const [settleForm, setSettleForm]   = useState({ total_amount: '', actual_cost: '', received_amount: '', payment_method: '现金', notes: '' });
  const [editStatus, setEditStatus]   = useState('');
  const [saving, setSaving]           = useState(false);

  function reload() {
    getOrder(id).then(o => {
      setOrder(o);
      setEditStatus(o.status);
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
    await addMenuDetail(id, { ...menuForm, quantity: Number(menuForm.quantity) });
    setMenuForm({ menu_id: '', dish_id: '', quantity: 1 });
    reload();
  }

  async function handleSaveSettlement() {
    setSaving(true);
    try {
      await saveSettlement(id, {
        total_amount: Number(settleForm.total_amount) || 0,
        actual_cost: Number(settleForm.actual_cost) || 0,
        received_amount: Number(settleForm.received_amount) || 0,
        payment_method: settleForm.payment_method,
        notes: settleForm.notes,
      });
      reload();
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
      {/* 头部 */}
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
            value={editStatus}
            onChange={e => { setEditStatus(e.target.value); handleStatusChange(e.target.value); }}
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t.key ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">

        {/* 基本信息 */}
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

        {/* 菜单明细 */}
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
              </tbody>
            </table>
          </div>
        )}

        {/* 人工安排 */}
        {tab === 'labor' && (
          <div>
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                ['role', ['厨师','帮厨','服务员','司机'], 'select'],
                ['name', '姓名', 'text'],
                ['phone', '电话', 'text'],
                ['fee', '费用', 'number'],
              ].map(([f, placeholder, type]) => (
                type === 'select' ? (
                  <select key={f} className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={laborForm[f]} onChange={e => setLaborForm({ ...laborForm, [f]: e.target.value })}>
                    {placeholder.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input key={f} type={type} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28"
                    placeholder={placeholder} value={laborForm[f]}
                    onChange={e => setLaborForm({ ...laborForm, [f]: e.target.value })} />
                )
              ))}
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
              </tbody>
            </table>
          </div>
        )}

        {/* 变更记录 */}
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

        {/* 结算 */}
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
```

---

## Task 10: 菜单管理页

**Files:**
- Create: `client/src/pages/Menus.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Menus.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { getMenus, createMenu, updateMenu, deleteMenu, getDishes, createDish, updateDish, deleteDish } from '../api';
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
    setForm(m ? { name: m.name, scene: m.scene||'', price: m.price||'', description: m.description||'' } : { name:'',scene:'',price:'',description:'' });
    setEditId(m?.id || null);
    setModal('menu');
  }

  function openDish(d = null) {
    setForm(d ? { name: d.name, category: d.category||'', unit_price: d.unit_price||'', description: d.description||'' } : { name:'',category:'',unit_price:'',description:'' });
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
            {[['name','菜单名称*','text'],['scene','适用场景','text'],['price','参考价格（元）','number'],['description','说明','text']].map(([f,l,t]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[f]||''} onChange={e => setForm({ ...form, [f]: e.target.value })} />
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
            {[['name','菜品名称*','text'],['category','类别','text'],['unit_price','单价（元）','number'],['description','说明','text']].map(([f,l,t]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[f]||''} onChange={e => setForm({ ...form, [f]: e.target.value })} />
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
```

---

## Task 11: 物料管理页

**Files:**
- Create: `client/src/pages/Materials.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Materials.jsx`**

```jsx
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

export default function Materials() {
  const [list, setList]   = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ name:'', category:'', unit:'', unit_price:'', notes:'' });
  const [editId, setEditId] = useState(null);

  function reload() { getMaterials().then(setList); }
  useEffect(() => { reload(); }, []);

  function openEdit(m = null) {
    setForm(m ? { name: m.name, category: m.category||'', unit: m.unit||'', unit_price: m.unit_price||'', notes: m.notes||'' } : { name:'',category:'',unit:'',unit_price:'',notes:'' });
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
            {[['name','名称*','text'],['category','类别','text'],['unit','单位','text'],['unit_price','单价（元）','number'],['notes','备注','text']].map(([f,l,t]) => (
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
```

---

## Task 12: 统计分析页

**Files:**
- Create: `client/src/pages/Statistics.jsx`

- [ ] **Step 1: 创建 `client/src/pages/Statistics.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { getStatistics } from '../api';
import { fmtMoney } from '../utils/format';

export default function Statistics() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = today.slice(0, 7) + '-01';
  const [from, setFrom] = useState(firstDay);
  const [to, setTo]     = useState(today);
  const [data, setData] = useState(null);

  function load() {
    getStatistics({ from, to }).then(setData).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  const ov = data?.overview;

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">统计分析</h2>

      {/* 时间筛选 */}
      <div className="flex gap-3 items-center mb-6">
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-gray-400">至</span>
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={to} onChange={e => setTo(e.target.value)} />
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">查询</button>
      </div>

      {ov && (
        <>
          {/* 总览卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { label: '总接单数', value: ov.total_orders + ' 单', color: 'bg-blue-50 text-blue-700' },
              { label: '已完成', value: ov.completed_orders + ' 单', color: 'bg-green-50 text-green-700' },
              { label: '已取消', value: ov.cancelled_orders + ' 单', color: 'bg-red-50 text-red-600' },
              { label: '总营收', value: fmtMoney(ov.total_revenue), color: 'bg-purple-50 text-purple-700' },
              { label: '总成本', value: fmtMoney(ov.total_cost), color: 'bg-orange-50 text-orange-700' },
              { label: '毛利润', value: fmtMoney(ov.total_revenue - ov.total_cost), color: 'bg-emerald-50 text-emerald-700' },
            ].map(c => (
              <div key={c.label} className={`${c.color} rounded-xl p-4`}>
                <div className="text-xs font-medium opacity-70 mb-1">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>

          {/* 按类型分组 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">各类型宴席统计</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr><th className="text-left pb-2 font-medium">宴席类型</th><th className="text-right pb-2 font-medium">场次</th><th className="text-right pb-2 font-medium">营收</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.by_type.map(r => (
                  <tr key={r.banquet_type}>
                    <td className="py-2">{r.banquet_type}</td>
                    <td className="py-2 text-right">{r.count}</td>
                    <td className="py-2 text-right">{fmtMoney(r.revenue)}</td>
                  </tr>
                ))}
                {data.by_type.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-400">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 月度趋势 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">近期月度趋势</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr><th className="text-left pb-2 font-medium">月份</th><th className="text-right pb-2 font-medium">接单数</th><th className="text-right pb-2 font-medium">营收</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.monthly.map(r => (
                  <tr key={r.month}>
                    <td className="py-2">{r.month}</td>
                    <td className="py-2 text-right">{r.count}</td>
                    <td className="py-2 text-right">{fmtMoney(r.revenue)}</td>
                  </tr>
                ))}
                {data.monthly.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-400">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!data && <p className="text-gray-400 text-sm">加载中...</p>}
    </div>
  );
}
```

---

## Task 13: 最终验证前端

- [ ] **Step 1: 启动后端（新终端）**

```bash
cd C:\Users\swordy\lunwen\server
node app.js
```

- [ ] **Step 2: 启动前端**

```bash
cd C:\Users\swordy\lunwen\client
npm run dev
```

- [ ] **Step 3: 浏览器验证**

打开 `http://localhost:5173`，应自动跳转到 `/login`

用 `admin` / `admin123` 登录，验证以下操作：
1. 仪表盘正常显示
2. 客户管理：新建、编辑客户
3. 订单管理：新建订单，档期提醒出现
4. 订单详情：切换 Tab，添加变更记录，填写结算
5. 菜单管理：新建菜单、菜品
6. 物料管理：新建物料
7. 统计分析：切换日期范围查询

- [ ] **Step 4: 提交前端代码**

```bash
cd C:\Users\swordy\lunwen
git add client/
git commit -m "feat: 完成前端所有页面"
```
