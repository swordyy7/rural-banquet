import { fmtDate } from '../utils/format';

const CHANGE_LABEL = {
  table_count: '桌数变更',
  reschedule: '改期',
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
            <span className="text-xs font-semibold text-blue-700">
              {CHANGE_LABEL[c.change_type] || c.change_type}
            </span>
            {c.before_value && (
              <span className="text-xs text-gray-500 ml-2">
                {c.before_value} → {c.after_value}
              </span>
            )}
            {c.reason && <p className="text-xs text-gray-500">{c.reason}</p>}
            <p className="text-xs text-gray-400">{fmtDate(c.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
