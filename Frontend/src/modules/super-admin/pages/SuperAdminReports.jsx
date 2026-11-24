import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';
import { selectClass, tableClass, tableWrap, tdClass, thClass } from '../components/seller-purchases/purchaseUi';

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const formatDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Each tab = one live report from GET /super-admin/reports?reportType=...
const REPORTS = {
  'platform-revenue': {
    label: 'Platform Revenue',
    key: 'orders',
    periodKey: 'orders',
    defaultPeriod: 'day',
    noRecords: true,
    columns: [
      { h: 'Period', get: (r) => r.label || r._id },
      { h: 'Orders', get: (r) => r.orderCount },
      { h: 'Items Total', get: (r) => formatINR(r.itemsTotal), raw: (r) => r.itemsTotal },
      { h: 'Shipping Revenue', get: (r) => formatINR(r.shippingRevenue), raw: (r) => r.shippingRevenue },
      { h: 'Gross Volume', get: (r) => formatINR(r.grossVolume), raw: (r) => r.grossVolume },
    ],
    totals: (rows) => [
      ['Orders', rows.reduce((t, r) => t + (r.orderCount || 0), 0)],
      ['Gross Volume', formatINR(rows.reduce((t, r) => t + (r.grossVolume || 0), 0))],
      ['Shipping Revenue', formatINR(rows.reduce((t, r) => t + (r.shippingRevenue || 0), 0))],
    ],
  },
  transactions: {
    label: 'Transactions',
    key: 'transactions',
    periodKey: 'periods',
    periodColumns: [
      { h: 'Period', get: (r) => r.label },
      { h: 'Entries', get: (r) => r.entries },
      { h: 'Credits', get: (r) => formatINR(r.credits), raw: (r) => r.credits },
      { h: 'Debits', get: (r) => formatINR(r.debits), raw: (r) => r.debits },
      { h: 'Net', get: (r) => formatINR(r.net), raw: (r) => r.net },
    ],
    periodTotals: (rows) => [
      ['Entries', rows.reduce((t, r) => t + (r.entries || 0), 0)],
      ['Credits', formatINR(rows.reduce((t, r) => t + (r.credits || 0), 0))],
      ['Debits', formatINR(rows.reduce((t, r) => t + (r.debits || 0), 0))],
    ],
    columns: [
      { h: 'Transaction ID', get: (r) => r.transactionId },
      { h: 'Date', get: (r) => formatDay(r.createdAt), raw: (r) => r.createdAt },
      { h: 'Category', get: (r) => r.category },
      { h: 'Party', get: (r) => r.entityName || r.entityType },
      { h: 'Type', get: (r) => r.type },
      { h: 'Amount', get: (r) => formatINR(r.amount), raw: (r) => r.amount },
      { h: 'Status', get: (r) => r.status },
    ],
    totals: (rows) => [
      ['Entries', rows.length],
      ['Credits', formatINR(rows.filter((r) => r.type === 'CREDIT' && r.status === 'SUCCESS').reduce((t, r) => t + (r.amount || 0), 0))],
      ['Debits', formatINR(rows.filter((r) => r.type === 'DEBIT' && r.status === 'SUCCESS').reduce((t, r) => t + (r.amount || 0), 0))],
    ],
  },
  'seller-settlements': {
    label: 'Seller Settlements',
    key: 'settlements',
    periodKey: 'periods',
    periodColumns: [
      { h: 'Period', get: (r) => r.label },
      { h: 'Records', get: (r) => r.records },
      { h: 'Order Total', get: (r) => formatINR(r.orderTotal), raw: (r) => r.orderTotal },
      { h: 'Commission', get: (r) => formatINR(r.commission), raw: (r) => r.commission },
      { h: 'Seller Net', get: (r) => formatINR(r.sellerNet), raw: (r) => r.sellerNet },
      { h: 'Settled', get: (r) => r.settled },
      { h: 'Pending', get: (r) => r.pending },
    ],
    periodTotals: (rows) => [
      ['Records', rows.reduce((t, r) => t + (r.records || 0), 0)],
      ['Commission', formatINR(rows.reduce((t, r) => t + (r.commission || 0), 0))],
      ['Seller Net', formatINR(rows.reduce((t, r) => t + (r.sellerNet || 0), 0))],
    ],
    columns: [
      { h: 'Order', get: (r) => r.orderId },
      { h: 'Seller', get: (r) => r.sellerName },
      { h: 'Date', get: (r) => formatDay(r.createdAt), raw: (r) => r.createdAt },
      { h: 'Order Total', get: (r) => formatINR(r.totalAmount), raw: (r) => r.totalAmount },
      { h: 'Commission', get: (r) => formatINR(r.commissionAmount), raw: (r) => r.commissionAmount },
      { h: 'Seller Net', get: (r) => formatINR(r.netSellerAmount), raw: (r) => r.netSellerAmount },
      { h: 'Settlement', get: (r) => r.settlementStatus },
    ],
    totals: (rows) => [
      ['Records', rows.length],
      ['Commission', formatINR(rows.reduce((t, r) => t + (r.commissionAmount || 0), 0))],
      ['Seller Net', formatINR(rows.reduce((t, r) => t + (r.netSellerAmount || 0), 0))],
    ],
  },
  'captain-settlements': {
    label: 'Captain Settlements',
    key: 'captains',
    columns: [
      { h: 'Captain', get: (r) => r.name },
      { h: 'Phone', get: (r) => r.phone },
      { h: 'City', get: (r) => r.city },
      { h: 'Vehicle', get: (r) => r.vehicleType },
      { h: 'Wallet Balance', get: (r) => formatINR(r.walletBalance), raw: (r) => r.walletBalance },
      { h: 'Cash Collected', get: (r) => formatINR(r.cashCollected), raw: (r) => r.cashCollected },
    ],
    totals: (rows) => [
      ['Captains', rows.length],
      ['Wallet Balances', formatINR(rows.reduce((t, r) => t + (r.walletBalance || 0), 0))],
      ['Cash Collected', formatINR(rows.reduce((t, r) => t + (r.cashCollected || 0), 0))],
    ],
  },
};

export const SuperAdminReports = () => {
  const { selectedBrand, selectedBrandId } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const [tab, setTab] = useState('platform-revenue');
  const [period, setPeriod] = useState('day'); // records | day | week | month
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const report = REPORTS[tab];
  const timeBased = Boolean(report.periodKey);
  const effectivePeriod = timeBased ? (report.noRecords && period === 'records' ? 'day' : period) : 'records';
  const byPeriod = effectivePeriod !== 'records';
  const cols = byPeriod && report.periodColumns ? report.periodColumns : report.columns;
  const rowKey = byPeriod ? report.periodKey : report.key;

  // Brand or tab switch: clear previous rows immediately
  useEffect(() => {
    setRows([]);
    setLoading(true);
  }, [selectedBrandId, tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    superAdminService
      .getReports({
        brandId: selectedBrandId,
        reportType: tab,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        period: effectivePeriod === 'records' ? undefined : effectivePeriod,
      })
      .then((res) => {
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load report.');
        setRows(res[rowKey] || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setError(err?.response?.data?.message || err?.message || 'Could not load report.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBrandId, tab, startDate, endDate, reload, rowKey, effectivePeriod]);

  const totals = useMemo(() => (byPeriod && report.periodTotals ? report.periodTotals(rows) : report.totals(rows)), [report, rows, byPeriod]);

  const handleExport = () => {
    const head = cols.map((c) => csvCell(c.h)).join(',');
    const lines = rows.map((r) => cols.map((c) => csvCell(c.raw ? c.raw(r) : c.get(r))).join(','));
    const blob = new Blob([`﻿${[head, ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}-${byPeriod ? effectivePeriod : 'records'}-${selectedBrandId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Reports & Analytics — ${brandName}`}
        subtitle="Live reports from MongoDB. Change the brand in the sidebar to see another brand."
        onRefresh={() => setReload((n) => n + 1)}
        refreshing={loading}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />

      <div className="w-full flex-1 space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xs">
            {Object.entries(REPORTS).map(([id, r]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setPeriod(r.defaultPeriod || 'records'); }}
                className={`cursor-pointer rounded-xl border-none px-3.5 py-2 text-sm font-medium ${
                  tab === id ? 'bg-[#1A2E0A] text-white' : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label="From date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={selectClass} />
            <input type="date" aria-label="To date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={selectClass} />
            <button
              type="button"
              onClick={handleExport}
              disabled={rows.length === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} className="text-[#F7941D]" /> Export CSV
            </button>
          </div>
        </div>

        {timeBased && (
          <div className="flex flex-wrap items-center gap-2" data-testid="period-switch">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">View</span>
            <div className="flex gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-xs" role="group" aria-label="Report view">
              {[['records', 'Records'], ['day', 'Day-wise'], ['week', 'Weekly'], ['month', 'Monthly']].filter(([k]) => !(report.noRecords && k === 'records')).map(([k, l]) => (
                <button key={k} type="button" data-testid={`period-${k}`} aria-pressed={effectivePeriod === k} onClick={() => setPeriod(k)} className={`cursor-pointer rounded-xl border-none px-3.5 py-1.5 text-sm font-medium ${effectivePeriod === k ? 'bg-[#F7941D] text-white' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}>{l}</button>
              ))}
            </div>
            {byPeriod && <span className="text-xs text-slate-400">Weeks run Monday to Sunday (Indian time).</span>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="report-totals">
          {totals.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass} style={{ minWidth: 800 }} data-testid="report-table">
              <thead>
                <tr>{cols.map((c) => <th key={c.h} className={thClass}>{c.h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={cols.length} className="px-4 py-14 text-center text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading report...</span></td></tr>
                ) : error ? (
                  <tr>
                    <td colSpan={cols.length} className="px-4 py-14 text-center">
                      <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={16} /> {error}</p>
                      <div className="mt-3"><button type="button" onClick={() => setReload((n) => n + 1)} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700">Retry</button></div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={cols.length} className="px-4 py-14 text-center text-sm font-medium text-slate-500">No {report.label.toLowerCase()} data for {brandName}{startDate || endDate ? ' in this period' : ''}.</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r._id?.toString?.() || r.transactionId || i} data-testid="report-row" className="hover:bg-slate-50/70">
                      {cols.map((c) => <td key={c.h} className={tdClass}>{c.get(r) ?? '—'}</td>)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200/80 bg-slate-50/80 p-3 text-xs font-medium text-slate-500">
            {byPeriod ? `Totals grouped by ${effectivePeriod}, newest first.` : 'Showing up to 500 most recent records per report.'}
          </div>
        </div>
      </div>
    </div>
  );
};
