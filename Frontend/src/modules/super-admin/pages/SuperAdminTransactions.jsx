import React, { useEffect, useMemo, useState } from 'react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';
import {
  Search,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  IndianRupee,
  Percent,
  Store,
  Undo2,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 10;

const SUMMARY_ICONS = {
  collections: IndianRupee,
  commission: Percent,
  sellerPayouts: Store,
  refunds: Undo2,
  pending: Clock3,
};

// Ledger enums as stored in MongoDB (PlatformLedger) <-> labels shown in the UI
const CATEGORY_LABELS = {
  CUSTOMER_PAYMENT: 'Customer Payment',
  SELLER_EARNING: 'Seller Earning',
  CAPTAIN_EARNING: 'Captain Earning',
  SELLER_PAYOUT: 'Seller Payout',
  CAPTAIN_PAYOUT: 'Captain Payout',
  PLATFORM_COMMISSION: 'Platform Commission',
  REFUND: 'Refund',
  FINANCIAL_ADJUSTMENT: 'Financial Adjustment',
  MEMBERSHIP_FEE: 'Membership Fee',
  REGISTRATION_FEE: 'Registration Fee',
};
const STATUS_LABELS = { SUCCESS: 'Completed', PENDING: 'Pending', FAILED: 'Failed', REVERSED: 'Reversed' };
const STATUS_VALUES = { Completed: 'SUCCESS', Pending: 'PENDING', Failed: 'FAILED', Reversed: 'REVERSED' };

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const dayKey = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const statusClass = (status) => {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'Pending') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (status === 'Failed') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const selectClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-normal outline-none focus:border-[#F7941D]';

const EMPTY_FILTERS = {
  search: '',
  category: 'ALL',
  type: 'ALL',
  status: 'ALL',
  period: 'ALL',
  startDate: '',
  endDate: '',
};

// Maps one PlatformLedger document (GET /super-admin/transactions) onto the row shape rendered below.
const toLedgerRow = (t = {}, brandName = '') => {
  const meta = t.metadata || {};
  const status = STATUS_LABELS[t.status] || t.status || '—';
  return {
    id: String(t._id || t.transactionId),
    transactionId: t.transactionId || '—',
    createdAt: t.createdAt,
    brand: brandName,
    category: CATEGORY_LABELS[t.category] || t.category || '—',
    partyName: t.entityName || t.entityType || 'Platform',
    partyId: t.entityId || '—',
    amount: Number(t.amount) || 0,
    type: t.type === 'DEBIT' ? 'Debit' : 'Credit',
    referenceId: t.referenceId || '—',
    paymentMethod: meta.paymentMethod || meta.method || '—',
    gatewayRef: meta.gatewayRef || meta.gatewayRefundId || meta.razorpayPaymentId || '—',
    status,
    remarks: t.description || meta.remarks || '—',
    commission: meta.commission ?? meta.commissionAmount ?? null,
    sellerPayable: meta.sellerPayable ?? meta.sellerEarning ?? null,
    timeline: [{ label: status, at: t.createdAt }],
  };
};

export const SuperAdminTransactions = ({ fixedCategory, pageTitle } = {}) => {
  const { selectedBrand, selectedBrandId } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [notice, setNotice] = useState('');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handlePeriodChange = (period) => {
    if (period === 'ALL') {
      setFilters((prev) => ({ ...prev, period: 'ALL', startDate: '', endDate: '' }));
      setPage(1);
      return;
    }
    const today = new Date();
    const start = new Date(today);
    if (period === 'weekly') start.setDate(today.getDate() - 7);
    else if (period === 'monthly') start.setMonth(today.getMonth() - 1);
    else if (period === 'quarterly') start.setMonth(today.getMonth() - 3);
    else if (period === 'half_yearly') start.setMonth(today.getMonth() - 6);
    else if (period === 'yearly') start.setFullYear(today.getFullYear() - 1);
    setFilters((prev) => ({ ...prev, period, startDate: dayKey(start), endDate: dayKey(today) }));
    setPage(1);
  };

  const handleDateChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      next.period = !next.startDate && !next.endDate ? 'ALL' : 'custom';
      return next;
    });
    setPage(1);
  };

  // Brand switch: reset filters/paging and drop the previous brand's records immediately.
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setRows([]);
    setSummary(null);
    setError('');
    setLoading(true);
  }, [selectedBrandId]);

  // Live ledger fetch. Scope, filters, search and paging are all applied by the backend.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          brandId: selectedBrandId,
          page,
          limit: PAGE_SIZE,
          category: fixedCategory || filters.category,
          type: filters.type === 'ALL' ? 'ALL' : filters.type.toUpperCase(),
          status: filters.status === 'ALL' ? 'ALL' : STATUS_VALUES[filters.status],
          search: filters.search.trim() || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        };
        const res = await superAdminService.getTransactions(params);
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load transactions.');
        const label = res.scope?.brandName || brandName;
        setRows((res.transactions || []).map((t) => toLedgerRow(t, label)));
        setTotal(res.total || 0);
        setPages(res.pages || 1);
        setSummary(res.summary || null);
        setLastSynced(new Date());
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setSummary(null);
        setError(err?.response?.data?.message || err?.message || 'Could not load transactions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, filters.search ? 350 : 0); // debounce typing only
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId, page, filters, reload, fixedCategory]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Brand',
      'Category',
      'Party / Entity',
      'Amount',
      'Type',
      'Reference ID',
      'Payment Method',
      'Gateway Reference',
      'Status',
      'Remarks',
    ];
    const lines = rows.map((t) =>
      [
        t.transactionId,
        formatWhen(t.createdAt),
        t.brand,
        t.category,
        t.partyName,
        Number(t.amount).toFixed(2),
        t.type,
        t.referenceId,
        t.paymentMethod,
        t.gatewayRef,
        t.status,
        t.remarks,
      ]
        .map(csvCell)
        .join(',')
    );
    const csv = [headers.map(csvCell).join(','), ...lines].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'central-transaction-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const brandCards = useMemo(
    () => [
      { id: 'collections', label: 'Total Collections', amount: summary?.collections },
      { id: 'commission', label: 'Platform Commission', amount: summary?.commission },
      { id: 'sellerPayouts', label: 'Seller Payouts', amount: summary?.sellerPayouts },
      { id: 'refunds', label: 'Refunds', amount: summary?.refunds },
      { id: 'pending', label: 'Pending Settlements', amount: summary?.pending },
    ],
    [summary]
  );

  const safePage = Math.min(page, pages);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`${pageTitle || 'Seller Payments'} — ${brandName}`}
        subtitle={`Money movements for ${brandName} only. Change the brand in the sidebar to see another brand.`}
        onRefresh={() => {
          setReload((n) => n + 1);
          setNotice(`Ledger refreshed for ${brandName}.`);
        }}
        refreshing={loading}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-sm font-semibold text-emerald-800">
            Live data from the platform ledger (MongoDB) — {brandName}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-normal text-slate-500">
              Last Synced <span className="text-slate-800">{lastSynced ? formatWhen(lastSynced) : '—'}</span>
            </span>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={rows.length === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Exports the rows currently shown"
            >
              <Download size={14} className="text-[#F7941D]" />
              Export CSV
            </button>
          </div>
        </div>

        {notice ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-normal text-emerald-800">
            <CheckCircle2 size={14} />
            {notice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {brandCards.map((card) => {
            const Icon = SUMMARY_ICONS[card.id] || IndianRupee;
            return (
              <div key={card.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="m-0 text-sm font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]">
                    <Icon size={15} />
                  </span>
                </div>
                <p className="m-0 mt-2 font-mono text-2xl font-medium text-[#1A2E0A]">
                  {card.amount == null ? '—' : formatINR(card.amount)}
                </p>
                <p className="m-0 mt-1 text-sm font-medium text-slate-500">{brandName}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Txn ID, order, party..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#F7941D]"
              />
            </div>
            <select
              className={selectClass}
              value={fixedCategory || filters.category}
              disabled={Boolean(fixedCategory)}
              onChange={(e) => setFilter('category', e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
            </select>
            <select className={selectClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Reversed">Reversed</option>
            </select>
            <select
              className={selectClass}
              value={filters.period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              aria-label="Filter by time period"
              title="Filter by time period"
            >
              <option value="ALL">All Time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              {filters.period === 'custom' && <option value="custom">Custom Range</option>}
            </select>
            <input
              type="date"
              aria-label="Start date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className={selectClass}
            />
            <input
              type="date"
              aria-label="End date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-500">
              Showing <span className="font-medium text-slate-900">{rows.length}</span> of{' '}
              <span className="font-medium text-slate-900">{total}</span> entries
            </span>
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw size={13} />
              Reset Filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-sm font-medium uppercase tracking-wider text-slate-500">
                  {[
                    'Transaction ID',
                    'Date & Time',
                    'Brand',
                    'Category',
                    'Party / Entity',
                    'Amount',
                    'Type',
                    'Reference ID',
                    'Payment Method',
                    'Status',
                    'Action',
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3.5 font-normal">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Loader2 size={16} className="animate-spin" /> Loading transactions...
                      </p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700">
                        <AlertCircle size={16} /> {error}
                      </p>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setReload((n) => n + 1)}
                          className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <p className="m-0 text-sm font-medium text-slate-700">No transactions found</p>
                      <p className="m-0 mt-1 text-sm font-medium text-slate-400">
                        There are no ledger entries for {brandName} with the current filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((txn) => (
                    <tr key={txn.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-mono font-normal text-[#F7941D]">{txn.transactionId}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-sm text-slate-500">
                        {formatWhen(txn.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 font-normal text-[#1A2E0A]">{txn.brand}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-sm font-normal text-slate-700">
                          {txn.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-normal text-slate-900">{txn.partyName}</div>
                        <div className="font-mono text-sm text-slate-400">{txn.partyId}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-base font-medium text-slate-900">{formatINR(txn.amount)}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-mono text-sm font-medium ${
                            txn.type === 'Credit' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {txn.type === 'Credit' ? '+' : '−'}
                          {formatINR(txn.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm text-slate-600">{txn.referenceId}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{txn.paymentMethod}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full border px-2.5 py-0.5 text-sm font-normal ${statusClass(txn.status)}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTxn(txn)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm font-normal text-slate-700 hover:bg-[#1A2E0A] hover:text-white"
                        >
                          <Eye size={13} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 p-4 text-sm">
            <span className="font-medium text-slate-500">
              Page <span className="font-medium text-slate-900">{safePage}</span> of{' '}
              <span className="font-medium text-slate-900">{pages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-normal text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-normal text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedTxn ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50">
          <button
            type="button"
            className="absolute inset-0 border-none bg-transparent"
            aria-label="Close details"
            onClick={() => setSelectedTxn(null)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="m-0 text-sm font-medium uppercase tracking-wider text-[#F7941D]">Ledger entry</p>
                <h2 className="m-0 text-xl font-medium text-[#1A2E0A]">{selectedTxn.transactionId}</h2>
                <p className="m-0 mt-1 text-sm font-medium text-slate-500">{formatWhen(selectedTxn.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="cursor-pointer rounded-full border-none bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              {[
                ['Brand', selectedTxn.brand],
                ['Category', selectedTxn.category],
                ['Party', `${selectedTxn.partyName} (${selectedTxn.partyId})`],
                ['Amount', formatINR(selectedTxn.amount)],
                ['Type', selectedTxn.type],
                ['Status', selectedTxn.status],
                ['Payment method', selectedTxn.paymentMethod],
                ['Gateway reference', selectedTxn.gatewayRef],
                ['Order / reference', selectedTxn.referenceId],
                ['Platform commission', selectedTxn.commission == null ? '—' : formatINR(selectedTxn.commission)],
                ['Seller payable', selectedTxn.sellerPayable == null ? '—' : formatINR(selectedTxn.sellerPayable)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5">
                  <span className="font-semibold text-slate-500">{label}</span>
                  <span className="text-right font-normal text-slate-900">{value}</span>
                </div>
              ))}
              <div>
                <p className="mb-1 font-semibold text-slate-500">Remarks</p>
                <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium text-slate-700">
                  {selectedTxn.remarks}
                </p>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-500">Status history</p>
                <ol className="m-0 space-y-2 p-0">
                  {selectedTxn.timeline.map((step) => (
                    <li key={`${step.at}-${step.label}`} className="list-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="m-0 font-normal text-slate-800">{step.label}</p>
                      <p className="m-0 mt-0.5 font-mono text-sm text-slate-400">{formatWhen(step.at)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};
