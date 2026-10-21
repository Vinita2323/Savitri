import React from 'react';
import { X } from 'lucide-react';

export const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatWhen = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDay = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_CLASS = {
  Successful: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Failed: 'bg-rose-50 text-rose-800 border-rose-200',
  'Partially Refunded': 'bg-slate-100 text-slate-700 border-slate-300',
  Refunded: 'bg-slate-100 text-slate-600 border-slate-300',
  Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Processing: 'bg-amber-50 text-amber-800 border-amber-200',
  Cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
  Returned: 'bg-slate-100 text-slate-600 border-slate-300',
  'Out for delivery': 'bg-sky-50 text-sky-800 border-sky-200',
};

export const PaymentStatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-normal ${
      STATUS_CLASS[status] || 'bg-slate-100 text-slate-600 border-slate-200'
    }`}
  >
    {status}
  </span>
);

export const PaymentSummaryCards = ({ cards }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {cards.map((card) => {
      const Icon = card.icon;
      return (
        <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 text-sm font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]">
              <Icon size={16} />
            </span>
          </div>
          <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{card.value}</p>
          <p className="m-0 mt-1 text-sm font-normal text-slate-500">{card.hint}</p>
        </div>
      );
    })}
  </div>
);

export const DetailModal = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <button type="button" className="absolute inset-0 border-none bg-transparent" aria-label="Close" onClick={onClose} />
    <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="m-0 text-sm font-medium uppercase tracking-wider text-[#F7941D]">Demo payment record</p>
          <h2 className="m-0 text-lg font-medium text-[#1A2E0A]">{title}</h2>
          {subtitle ? <p className="m-0 mt-1 text-sm font-normal text-slate-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border-none bg-slate-100 p-2 text-slate-600"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">{children}</div>
    </div>
  </div>
);

export const downloadCsv = (filename, headers, rows) => {
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const demoBanner = 'Demonstration data only. Figures are sample payments, not live collections or refunds.';

export const headerTitleClass = 'm-0 text-lg font-semibold tracking-tight text-[#1A2E0A] sm:text-xl';
export const headerSubtitleClass = 'm-0 mt-0.5 text-sm font-normal text-slate-500';

export const tableWrap = 'overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs';
export const tableClass = 'w-full min-w-[1100px] border-collapse text-left text-sm font-normal';
export const thClass =
  'border-b border-slate-200/80 bg-slate-50/80 px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-slate-500';
export const tdClass = 'px-4 py-3.5 align-top text-slate-700';
