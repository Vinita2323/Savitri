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
    columns: [
      { h: 'Date', get: (r) => r._id },
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const report = REPORTS[tab];

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
      })
      .then((res) => {
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load report.');
        setRows(res[report.key] || []);
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
  }, [selectedBrandId, tab, startDate, endDate, reload, report.key]);

  const totals = useMemo(() => report.totals(rows), [report, rows]);

  const handleExport = () => {
    const head = report.columns.map((c) => csvCell(c.h)).join(',');
    const lines = rows.map((r) => report.columns.map((c) => csvCell(c.raw ? c.raw(r) : c.get(r))).join(','));
    const blob = new Blob([`﻿${[head, ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}-${selectedBrandId}.csv`;
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

      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xs">
            {Object.entries(REPORTS).map(([id, r]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {totals.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass} style={{ minWidth: 800 }}>
              <thead>
                <tr>{report.columns.map((c) => <th key={c.h} className={thClass}>{c.h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={report.columns.length} className="px-4 py-14 text-center text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading report...</span></td></tr>
                ) : error ? (
                  <tr>
                    <td colSpan={report.columns.length} className="px-4 py-14 text-center">
                      <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={16} /> {error}</p>
                      <div className="mt-3"><button type="button" onClick={() => setReload((n) => n + 1)} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700">Retry</button></div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={report.columns.length} className="px-4 py-14 text-center text-sm font-medium text-slate-500">No {report.label.toLowerCase()} data for {brandName}{startDate || endDate ? ' in this period' : ''}.</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r._id?.toString?.() || r.transactionId || i} className="hover:bg-slate-50/70">
                      {report.columns.map((c) => <td key={c.h} className={tdClass}>{c.get(r) ?? '—'}</td>)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200/80 bg-slate-50/80 p-3 text-xs font-medium text-slate-500">
            Showing up to 500 most recent records per report.
          </div>
        </div>
      </div>
    </div>
  );
};
