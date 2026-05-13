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
    { label: '已完成',   value: stats.overview.completed_orders + ' 单', color: 'bg-green-50 text-green-700' },
    { label: '本月营收', value: fmtMoney(stats.overview.total_revenue), color: 'bg-purple-50 text-purple-700' },
    { label: '本月成本', value: fmtMoney(stats.overview.total_cost), color: 'bg-orange-50 text-orange-700' },
  ] : [];

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">仪表盘</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-4`}>
            <div className="text-xs font-medium mb-1 opacity-70">{c.label}</div>
            <div className="text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

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
