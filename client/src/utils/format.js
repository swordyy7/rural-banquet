export function fmtDate(str) {
  if (!str) return '-';
  return str.slice(0, 10);
}

export function fmtMoney(val) {
  if (val === null || val === undefined || val === '') return '-';
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
