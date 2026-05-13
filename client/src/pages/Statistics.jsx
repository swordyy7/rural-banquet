import { useEffect, useState } from 'react';
import { getStatistics } from '../api';
import { fmtMoney } from '../utils/format';

export default function Statistics() {
  const today    = new Date().toISOString().slice(0, 10);
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { label: '总接单数', value: ov.total_orders + ' 单', color: 'bg-blue-50 text-blue-700' },
              { label: '已完成',   value: ov.completed_orders + ' 单', color: 'bg-green-50 text-green-700' },
              { label: '已取消',   value: ov.cancelled_orders + ' 单', color: 'bg-red-50 text-red-600' },
              { label: '总营收',   value: fmtMoney(ov.total_revenue), color: 'bg-purple-50 text-purple-700' },
              { label: '总成本',   value: fmtMoney(ov.total_cost), color: 'bg-orange-50 text-orange-700' },
              { label: '毛利润',   value: fmtMoney(Number(ov.total_revenue) - Number(ov.total_cost)), color: 'bg-emerald-50 text-emerald-700' },
            ].map(c => (
              <div key={c.label} className={`${c.color} rounded-xl p-4`}>
                <div className="text-xs font-medium opacity-70 mb-1">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">各类型宴席统计</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="text-left pb-2 font-medium">宴席类型</th>
                  <th className="text-right pb-2 font-medium">场次</th>
                  <th className="text-right pb-2 font-medium">营收</th>
                </tr>
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

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">近期月度趋势</h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="text-left pb-2 font-medium">月份</th>
                  <th className="text-right pb-2 font-medium">接单数</th>
                  <th className="text-right pb-2 font-medium">营收</th>
                </tr>
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
