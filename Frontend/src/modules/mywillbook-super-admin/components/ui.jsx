import React, { useEffect } from 'react';
import { AlertTriangle, Info, Search, X, Inbox } from 'lucide-react';
import { DEMO_BANNER } from '../data/mockData';

export const formatINR = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

export const DemoBanner = ({ className = '' }) => (
  <div
    className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ${className}`}
  >
    <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
    <span>{DEMO_BANNER}</span>
  </div>
);

export const PageHeader = ({
  title,
  breadcrumbs = [],
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  actions = null,
  subtitle = null,
}) => (
  <div className="mb-4 space-y-3">
    {breadcrumbs.length > 0 && (
      <nav className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-400">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'text-slate-600' : ''}>{crumb}</span>
          </span>
        ))}
      </nav>
    )}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-extrabold text-slate-900 sm:text-xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {typeof onSearchChange === 'function' && (
          <div className="relative min-w-[180px] flex-1 sm:flex-none">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-[#FF9418]"
            />
          </div>
        )}
        {actions}
      </div>
    </div>
    <DemoBanner />
  </div>
);

export const StatCard = ({ label, value, hint, icon: Icon, accent = '#FF9418' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 truncate text-xl font-extrabold text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-[11px] font-medium text-slate-500">{hint}</p> : null}
      </div>
      {Icon ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon size={16} />
        </div>
      ) : null}
    </div>
  </div>
);

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700',
  Inactive: 'bg-slate-100 text-slate-500',
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-sky-50 text-sky-700',
  Processing: 'bg-indigo-50 text-indigo-700',
  Paid: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Published: 'bg-emerald-50 text-emerald-700',
  Draft: 'bg-slate-100 text-slate-600',
  Success: 'bg-emerald-50 text-emerald-700',
  Failed: 'bg-rose-50 text-rose-700',
  Matched: 'bg-emerald-50 text-emerald-700',
  Mismatch: 'bg-rose-50 text-rose-700',
  Unmatched: 'bg-amber-50 text-amber-700',
};

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
      STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'
    }`}
  >
    {status}
  </span>
);

export const Modal = ({ open, onClose, title, children, footer = null, wide = false }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 border-none bg-slate-900/50"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={`relative z-10 m-0 flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:m-4 sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-none bg-transparent p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  danger = false,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    footer={
      <>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm?.();
            onClose?.();
          }}
          className={`rounded-xl border-none px-4 py-2 text-xs font-bold text-white cursor-pointer ${
            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#31551C] hover:bg-[#172D0B]'
          }`}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <div className="flex gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          danger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
        }`}
      >
        <AlertTriangle size={16} />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  </Modal>
);

export const Drawer = ({ open, onClose, title, children, side = 'right' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="absolute inset-0 border-none bg-slate-900/50"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex h-full w-full max-w-md flex-col border-slate-200 bg-white shadow-2xl ${
          side === 'left' ? 'mr-auto border-r' : 'ml-auto border-l'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-none bg-transparent p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState = ({ title = 'Nothing here yet', description, action = null }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
      <Inbox size={22} />
    </div>
    <p className="text-sm font-extrabold text-slate-800">{title}</p>
    {description ? (
      <p className="mt-1 max-w-sm text-xs font-medium text-slate-500">{description}</p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const FilterBar = ({ children, className = '' }) => (
  <div
    className={`mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 ${className}`}
  >
    {children}
  </div>
);

export const Pagination = ({ page, pageSize, total, onPageChange }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
      <span>
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40 cursor-pointer"
        >
          Prev
        </button>
        <span className="px-2 py-1.5 text-slate-700">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const SimpleBarChart = ({ data = [], height = 160, color = '#FF9418', valueFormatter }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = valueFormatter || ((v) => String(v));

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => {
          const h = Math.max(4, (d.value / max) * (height - 28));
          return (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400">{fmt(d.value)}</span>
              <div
                className="w-full max-w-[36px] rounded-t-md transition-all"
                style={{ height: h, backgroundColor: color }}
                title={`${d.label}: ${fmt(d.value)}`}
              />
              <span className="truncate text-[10px] font-bold text-slate-600">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Shared table shell classes for DataTable-style layouts */
export const tableWrapClass = 'overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm';
export const tableClass = 'w-full min-w-[640px] border-collapse text-left text-xs';
export const thClass =
  'border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400';
export const tdClass = 'border-b border-slate-50 px-4 py-3 font-medium text-slate-700';

export const btnPrimaryClass =
  'inline-flex items-center gap-1.5 rounded-xl border-none bg-[#FF9418] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#e8840f]';
export const btnSecondaryClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50';
export const btnGhostClass =
  'inline-flex items-center gap-1.5 rounded-xl border-none bg-transparent px-3 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-100';
export const btnGreenClass =
  'inline-flex items-center gap-1.5 rounded-xl border-none bg-[#31551C] px-3.5 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#172D0B]';

/** Form / button class aliases used by feature pages */
export const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-[#FF9418]';
export const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400';
export const btnPrimary = btnPrimaryClass;
export const btnSecondary = btnSecondaryClass;
export const btnGreen = btnGreenClass;
