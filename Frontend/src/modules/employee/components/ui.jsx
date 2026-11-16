import React from 'react';

const TZ = 'Asia/Kolkata';

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—');

export const fmtDuration = (minutes) => {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

/** Date input value (YYYY-MM-DD) for "today" in India. */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

const STATUS_TONE = {
  Present: 'green', Late: 'amber', 'Half Day': 'amber', Absent: 'red', 'On Leave': 'blue', Holiday: 'violet', 'Weekly Off': 'slate', 'Not marked': 'slate',
  Assigned: 'blue', 'To Do': 'blue', Pending: 'amber', 'In Progress': 'violet', 'Submitted for Review': 'amber', Completed: 'green', Rejected: 'red', Reopened: 'amber', Overdue: 'red', Blocked: 'red',
  Approved: 'green', Cancelled: 'slate',
  Low: 'slate', Medium: 'blue', High: 'amber', Urgent: 'red',
};

const LABEL = { 'Submitted for Review': 'Under Review', 'On Leave': 'Leave', Reopened: 'Changes requested' };

export const Badge = ({ children, tone, status }) => {
  const t = tone || STATUS_TONE[status || children] || 'slate';
  const text = status ? LABEL[status] || status : children;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${TONES[t]}`}>{text}</span>;
};

export const Card = ({ title, action, children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-2xl shadow-xs ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 m-0">{title}</h3>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

export const Stat = ({ label, value, hint, tone = 'slate' }) => {
  const colors = { slate: 'text-slate-900', green: 'text-emerald-600', amber: 'text-amber-600', red: 'text-rose-600', blue: 'text-blue-600', violet: 'text-violet-600' };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <p className="text-xs font-semibold text-slate-500 m-0 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-extrabold mt-1.5 mb-0 ${colors[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1 mb-0">{hint}</p>}
    </div>
  );
};

export const Field = ({ label, error, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
    {children}
    {hint && !error && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
  </label>
);

export const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-0';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-60 cursor-pointer border-0';

export const Notice = ({ type = 'info', children }) => {
  const tone = { info: 'bg-blue-50 border-blue-200 text-blue-800', error: 'bg-rose-50 border-rose-200 text-rose-800', success: 'bg-emerald-50 border-emerald-200 text-emerald-800', warn: 'bg-amber-50 border-amber-200 text-amber-800' };
  return <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${tone[type]}`}>{children}</div>;
};

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-slate-500 text-sm">
    <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    {label}
  </div>
);

export const Empty = ({ children }) => <div className="text-center py-12 text-sm text-slate-500">{children}</div>;
