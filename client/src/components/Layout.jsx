import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { to: '/dashboard',  label: '仪表盘',     icon: '🏠' },
  { to: '/orders',     label: '宴席订单',   icon: '📋' },
  { to: '/customers',  label: '客户管理',   icon: '👥' },
  { to: '/menus',      label: '菜单管理',   icon: '🍽️' },
  { to: '/materials',  label: '物料 & 人工', icon: '📦' },
  { to: '/statistics', label: '统计分析',   icon: '📊' },
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
          <div className="text-xs text-gray-500 mb-2">
            {user?.username}（{user?.role === 'admin' ? '管理员' : '工作人员'}）
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-red-500 hover:text-red-700"
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
