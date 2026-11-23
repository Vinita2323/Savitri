import React from 'react';

export { fmtMoney, paiseToInput, Modal, Drawer, Labeled, Pager, Stat, useDebounced, today } from '../employees/payroll/payrollUi';

/** "123.45" -> 12345 paise. Exact: text only, at most 2 decimals. Returns null when the text is not an amount. */
export const parsePaise = (v) => {
  const s = String(v ?? '').replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [r, p = ''] = s.split('.');
  return Number(r) * 100 + Number(p.padEnd(2, '0'));
};
/** "18" or "12.5" -> 1800 / 1250 (percent x 100) */
export const parsePct = (v) => {
  const s = String(v ?? '').replace('%', '').trim();
  if (s === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [r, p = ''] = s.split('.');
  const n = Number(r) * 100 + Number(p.padEnd(2, '0'));
  return n > 10000 ? null : n;
};
/** round(a * b / c), half up, integers only (same rule as the server) */
export const mulDivInt = (a, b, c) => Math.floor((2 * a * b + c) / (2 * c));

const PAY = { PAID: ['Paid', 'bg-emerald-50 text-emerald-700 border-emerald-200'], UNPAID: ['Unpaid', 'bg-rose-50 text-rose-700 border-rose-200'], PARTIAL: ['Partial', 'bg-amber-50 text-amber-800 border-amber-200'], NOT_RECORDED: ['Not recorded', 'bg-slate-100 text-slate-600 border-slate-200'] };
const ST = { RECORDED: ['Recorded', 'bg-emerald-50 text-emerald-700 border-emerald-200'], CANCELLED: ['Cancelled', 'bg-slate-100 text-slate-600 border-slate-300'], CANCELLING: ['Cancelling', 'bg-amber-50 text-amber-800 border-amber-200'], PROCESSING: ['Saving', 'bg-sky-50 text-sky-700 border-sky-200'] };
export const PayChip = ({ status }) => { const [l, c] = PAY[status] || [status, PAY.NOT_RECORDED[1]]; return <span data-testid="pay-chip" data-status={status} className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${c}`}>{l}</span>; };
export const StatusChip = ({ status }) => { const [l, c] = ST[status] || [status, ST.CANCELLED[1]]; return <span data-testid="st-chip" data-status={status} className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${c}`}>{l}</span>; };

export const METHODS = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', UPI: 'UPI', CARD: 'Card', CHEQUE: 'Cheque', CREDIT: 'Supplier credit', OTHER: 'Other' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
