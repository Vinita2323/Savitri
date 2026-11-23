import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/** 123450 (paise) -> "₹1,234.50". Integer arithmetic only; nothing is ever rounded here. */
export const fmtMoney = (paise) => {
  const n = Math.trunc(Number(paise) || 0);
  const a = Math.abs(n);
  const rupees = String(Math.trunc(a / 100));
  // Indian digit grouping: 12,34,567
  const grouped = rupees.length > 3 ? `${rupees.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${rupees.slice(-3)}` : rupees;
  return `${n < 0 ? '-' : ''}₹${grouped}.${String(a % 100).padStart(2, '0')}`;
};
/** 123450 -> "1234.50" (for an input box) */
export const paiseToInput = (p) => {
  const n = Math.trunc(Number(p) || 0);
  return `${Math.trunc(n / 100)}.${String(n % 100).padStart(2, '0')}`;
};
export const fmtMinutes = (m) => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`;
export const fmtDays = (centi) => String(((centi || 0) / 100).toFixed(2)).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

export const STATUS_STYLE = {
  DRAFT: ['Draft', 'bg-slate-100 text-slate-700 border-slate-200'],
  CALCULATED: ['Calculated', 'bg-sky-50 text-sky-700 border-sky-200'],
  PENDING_APPROVAL: ['Pending approval', 'bg-amber-50 text-amber-800 border-amber-200'],
  APPROVED: ['Approved', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  PARTIALLY_PAID: ['Partially paid', 'bg-violet-50 text-violet-700 border-violet-200'],
  PAID: ['Paid', 'bg-emerald-100 text-emerald-800 border-emerald-300'],
  CANCELLED: ['Cancelled', 'bg-rose-50 text-rose-700 border-rose-200'],
};
export const StatusPill = ({ status }) => {
  const [label, cls] = STATUS_STYLE[status] || [status, 'bg-slate-100 text-slate-700 border-slate-200'];
  return <span data-testid="pr-status" data-status={status} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${cls}`}>{label}</span>;
};

export const TYPE_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly', DAILY: 'Daily wage', HOURLY: 'Hourly' };
export const FREQ_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom' };
export const METHOD_LABEL = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', UPI: 'UPI', OTHER: 'Other' };

export const Modal = ({ title, onClose, children, wide = false, testId = 'pr-modal', footer }) => {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50" role="dialog" aria-label={title} data-testid={testId}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="m-0 text-base font-extrabold text-slate-900">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" data-testid="pr-modal-close" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 border-0 bg-transparent cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Drawer = ({ title, subtitle, onClose, children, testId = 'pr-drawer' }) => {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" role="dialog" aria-label={title} data-testid={testId}>
      <div className="w-full max-w-4xl bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="m-0 text-lg font-extrabold text-slate-900 truncate" data-testid="pr-drawer-title">{title}</p>
            {subtitle && <p className="m-0 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" data-testid="pr-drawer-close" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 border-0 bg-transparent cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-1 px-1" role="tablist">
    {tabs.map((t) => (
      <button key={t.id} type="button" role="tab" aria-selected={value === t.id} data-testid={`pr-tab-${t.id}`} onClick={() => onChange(t.id)}
        className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-0 border-b-2 bg-transparent cursor-pointer ${value === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
        {t.label}
      </button>
    ))}
  </div>
);

export const Labeled = ({ label, hint, children, className = '' }) => (
  <label className={`block text-xs font-semibold text-slate-600 ${className}`}>
    {label}
    <div className="mt-1">{children}</div>
    {hint && <span className="block font-normal text-[11px] text-slate-400 mt-0.5">{hint}</span>}
  </label>
);

export const useDebounced = (value, ms = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

export const Pager = ({ page, pages, onPage }) =>
  pages > 1 ? (
    <div className="flex items-center justify-center gap-3 text-sm mt-3">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer">Previous</button>
      <span className="text-slate-500">Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer">Next</button>
    </div>
  ) : null;

export const Stat = ({ label, value, tone = 'slate', hint, testId }) => {
  const tones = { slate: 'text-slate-900', green: 'text-emerald-700', amber: 'text-amber-700', rose: 'text-rose-700', blue: 'text-sky-700', violet: 'text-violet-700' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="m-0 text-xs font-semibold text-slate-500">{label}</p>
      <p className={`m-0 mt-1 text-xl sm:text-2xl font-extrabold ${tones[tone]}`} data-testid={testId}>{value}</p>
      {hint && <p className="m-0 mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
};

export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const monthStart = () => `${today().slice(0, 7)}-01`;
