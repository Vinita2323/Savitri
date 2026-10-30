import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Download,
  Eye,
  IndianRupee,
  Loader2,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';
import {
  DetailDrawer,
  Fact,
  selectClass,
  tableClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/seller-purchases/purchaseUi';

const PAGE_SIZE = 10;

// RefundRequest.status enum (MongoDB) -> UI label
const STATUS_LABELS = {
  REQUESTED: 'Pending Review',
  APPROVED: 'Approved',
  PROCESSING: 'Refund Processing',
  COMPLETED: 'Refunded',
  REJECTED: 'Rejected',
};

const BADGE = {
  'Pending Review': 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-sky-50 text-sky-800 border-sky-200',
  'Refund Processing': 'bg-orange-50 text-orange-800 border-orange-200',
  Refunded: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

const EMPTY_FILTERS = { search: '', status: 'ALL', startDate: '', endDate: '' };

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const dayKey = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Maps a RefundRequest document (GET /super-admin/refunds) onto the row shape rendered below.
const toRefundRow = (r = {}) => ({
  id: String(r._id),
  refundId: r.refundId || '—',
  orderId: r.orderId || '—',
  customerName: r.userName || 'Customer',
  phone: r.userPhone || '—',
  amount: Number(r.amount) || 0,
  reason: r.reason || '—',
  statusCode: r.status,
  status: STATUS_LABELS[r.status] || r.status || '—',
  paymentMethod: r.paymentMethod || '—',
  paymentRef: r.paymentReference || '—',
  gatewayRefundId: r.gatewayRefundId || '—',
  remarks: r.remarks || '',
  requestedAt: r.createdAt,
  processedAt: r.processedAt,
});

export const SuperAdminRefunds = () => {
  const { selectedBrand, selectedBrandId } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [gatewayRefundId, setGatewayRefundId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Brand switch: clear the previous brand's records right away and reset filters/paging
  useEffect(() => {
    setRecords([]);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSelected(null);
    setLoading(true);
  }, [selectedBrandId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    superAdminService
      .getRefunds({ brandId: selectedBrandId })
      .then((res) => {
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load refunds.');
        setRecords((res.refunds || []).map(toRefundRow));
      })
      .catch((err) => {
        if (cancelled) return;
        setRecords([]);
        setError(err?.response?.data?.message || err?.message || 'Could not load refunds.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBrandId, reload]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return records.filter((r) => {
      if (filters.status !== 'ALL' && r.statusCode !== filters.status) return false;
      const day = dayKey(r.requestedAt);
      if (filters.startDate && day < filters.startDate) return false;
      if (filters.endDate && day > filters.endDate) return false;
      if (!q) return true;
      return [r.refundId, r.orderId, r.customerName, r.phone, r.paymentRef].join(' ').toLowerCase().includes(q);
    });
  }, [records, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const cards = useMemo(() => {
    const sum = (pred) => records.filter(pred).reduce((t, r) => t + r.amount, 0);
    const count = (pred) => records.filter(pred).length;
    return [
      { label: 'Total Requests', value: String(records.length), icon: Undo2 },
      { label: 'Pending Review', value: String(count((r) => r.statusCode === 'REQUESTED')), icon: Clock3 },
      { label: 'Approved / Processing', value: String(count((r) => ['APPROVED', 'PROCESSING'].includes(r.statusCode))), icon: BadgeCheck },
      { label: 'Refunded Amount', value: formatINR(sum((r) => r.statusCode === 'COMPLETED')), icon: IndianRupee },
      { label: 'Rejected', value: String(count((r) => r.statusCode === 'REJECTED')), icon: CircleX },
    ];
  }, [records]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const openDetail = (row) => {
    setSelected(row);
    setActionError('');
    setGatewayRefundId('');
    setRemarks('');
  };

  const processRefund = async (status) => {
    if (!selected) return;
    if (status === 'COMPLETED' && !gatewayRefundId.trim()) {
      setActionError('Enter the gateway refund ID to mark this refund as completed.');
      return;
    }
    setActing(true);
    setActionError('');
    try {
      const res = await superAdminService.processRefund(selected.id, {
        status,
        gatewayRefundId: gatewayRefundId.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      if (!res?.success) throw new Error(res?.message || 'Could not update refund.');
      setSelected(null);
      setReload((n) => n + 1);
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || 'Could not update refund.');
    } finally {
      setActing(false);
    }
  };

  const handleExport = () => {
    const headers = ['Refund ID', 'Order ID', 'Customer', 'Phone', 'Amount', 'Status', 'Reason', 'Payment method', 'Requested', 'Processed'];
    const lines = filtered.map((r) =>
      [r.refundId, r.orderId, r.customerName, r.phone, r.amount.toFixed(2), r.status, r.reason, r.paymentMethod, formatWhen(r.requestedAt), r.processedAt ? formatWhen(r.processedAt) : '']
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob([`﻿${[headers.map(csvCell).join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refunds.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Refunds & Returns — ${brandName}`}
        subtitle="Live refund requests from MongoDB. Change the brand in the sidebar to see another brand."
        onRefresh={() => setReload((n) => n + 1)}
        refreshing={loading}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]">
                    <Icon size={15} />
                  </span>
                </div>
                <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{loading ? '—' : card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Refund, order, customer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select className={selectClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="ALL">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input type="date" aria-label="From date" value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)} className={selectClass} />
            <input type="date" aria-label="To date" value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)} className={selectClass} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-500">
              Showing <span className="text-slate-900">{pageRows.length}</span> of <span className="text-slate-900">{filtered.length}</span> refunds
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
                <RotateCcw size={13} /> Reset Filters
              </button>
              <button type="button" onClick={handleExport} disabled={filtered.length === 0} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <Download size={13} className="text-[#F7941D]" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass} style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  {['Refund ID', 'Order', 'Customer', 'Amount', 'Reason', 'Payment', 'Requested', 'Status', 'Action'].map((h) => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-14 text-center text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading refunds...</span></td></tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center">
                      <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={16} /> {error}</p>
                      <div className="mt-3"><button type="button" onClick={() => setReload((n) => n + 1)} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700">Retry</button></div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-14 text-center text-sm font-medium text-slate-500">No refund requests found for {brandName}.</td></tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{r.refundId}</td>
                      <td className={`${tdClass} font-mono`}>{r.orderId}</td>
                      <td className={tdClass}><div className="font-medium text-slate-900">{r.customerName}</div><div className="font-mono text-xs text-slate-400">{r.phone}</div></td>
                      <td className={`${tdClass} font-mono font-medium`}>{formatINR(r.amount)}</td>
                      <td className={`${tdClass} max-w-[220px] truncate`} title={r.reason}>{r.reason}</td>
                      <td className={tdClass}>{r.paymentMethod}</td>
                      <td className={`${tdClass} whitespace-nowrap font-mono text-xs`}>{formatWhen(r.requestedAt)}</td>
                      <td className={tdClass}><span className={`rounded-full border px-2.5 py-0.5 text-xs ${BADGE[r.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{r.status}</span></td>
                      <td className={tdClass}>
                        <button type="button" onClick={() => openDetail(r)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 hover:bg-[#1A2E0A] hover:text-white">
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 p-4 text-sm">
            <span className="font-medium text-slate-500">Page <span className="text-slate-900">{safePage}</span> of <span className="text-slate-900">{pages}</span></span>
            <div className="flex gap-2">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage((p) => p + 1)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <DetailDrawer eyebrow="Refund request" title={selected.refundId} subtitle={formatWhen(selected.requestedAt)} onClose={() => setSelected(null)}>
          <div>
            <Fact label="Order" value={selected.orderId} />
            <Fact label="Customer" value={`${selected.customerName} (${selected.phone})`} />
            <Fact label="Amount" value={formatINR(selected.amount)} />
            <Fact label="Status" value={selected.status} />
            <Fact label="Reason" value={selected.reason} />
            <Fact label="Payment method" value={selected.paymentMethod} />
            <Fact label="Payment reference" value={selected.paymentRef} />
            <Fact label="Gateway refund ID" value={selected.gatewayRefundId} />
            <Fact label="Processed" value={selected.processedAt ? formatWhen(selected.processedAt) : '—'} />
            {selected.remarks ? <Fact label="Remarks" value={selected.remarks} /> : null}
          </div>

          {['REQUESTED', 'APPROVED', 'PROCESSING'].includes(selected.statusCode) ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <input value={gatewayRefundId} onChange={(e) => setGatewayRefundId(e.target.value)} placeholder="Gateway refund ID (required to mark refunded)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F7941D]" />
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F7941D]" />
              {actionError ? <p className="m-0 text-sm font-medium text-rose-700">{actionError}</p> : null}
              <div className="flex flex-wrap gap-2">
                {selected.statusCode === 'REQUESTED' ? (
                  <button type="button" disabled={acting} onClick={() => processRefund('APPROVED')} className="cursor-pointer rounded-xl border-none bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Approve</button>
                ) : null}
                <button type="button" disabled={acting} onClick={() => processRefund('COMPLETED')} className="cursor-pointer rounded-xl border-none bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Mark refunded</button>
                <button type="button" disabled={acting} onClick={() => processRefund('REJECTED')} className="cursor-pointer rounded-xl border-none bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Reject</button>
              </div>
            </div>
          ) : null}
        </DetailDrawer>
      ) : null}
    </div>
  );
};
