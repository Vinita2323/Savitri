import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Download,
  Eye,
  IndianRupee,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { REFUND_RETURN_RECORDS } from '../data/refundsReturnsMock';
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
const REQUEST_TYPES = ['Return', 'Refund', 'Replacement'];
const REQUEST_STATUSES = ['Pending Review', 'Approved', 'Rejected', 'Pickup Scheduled', 'Return Received', 'Closed'];
const REFUND_STATUSES = ['Pending Review', 'Approved', 'Refund Processing', 'Refunded', 'Refund Failed'];

const BADGE = {
  'Pending Review': 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-sky-50 text-sky-800 border-sky-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  'Pickup Scheduled': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Return Received': 'bg-teal-50 text-teal-800 border-teal-200',
  'Refund Processing': 'bg-orange-50 text-orange-800 border-orange-200',
  Refunded: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Refund Failed': 'bg-rose-50 text-rose-800 border-rose-200',
  Closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const EMPTY_FILTERS = {
  search: '',
  brand: 'ALL',
  requestType: 'ALL',
  requestStatus: 'ALL',
  refundStatus: 'ALL',
  startDate: '',
  endDate: '',
};

const formatINR = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const formatDay = (isoDate) => {
  if (!isoDate) return '—';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
};

const brandsInData = [...new Set(REFUND_RETURN_RECORDS.map((row) => row.brand))];

export const SuperAdminRefunds = () => {
  const { selectedBrand } = useSuperAdmin();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, brand: selectedBrand?.name || 'ALL' });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, brand: selectedBrand?.name || 'ALL' }));
    setPage(1);
    setSelectedId(null);
  }, [selectedBrand?.id, selectedBrand?.name]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return REFUND_RETURN_RECORDS.filter((row) => {
      if (filters.brand !== 'ALL' && row.brand !== filters.brand) return false;
      if (filters.requestType !== 'ALL' && row.requestType !== filters.requestType) return false;
      if (filters.requestStatus !== 'ALL' && row.requestStatus !== filters.requestStatus) return false;
      if (filters.refundStatus !== 'ALL' && row.refundStatus !== filters.refundStatus) return false;
      if (filters.startDate && row.requestDate < filters.startDate) return false;
      if (filters.endDate && row.requestDate > filters.endDate) return false;
      if (!query) return true;
      return [row.id, row.orderId, row.customerName].join(' ').toLowerCase().includes(query);
    }).sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  }, [filters]);

  const summary = useMemo(() => {
    const refunded = filtered.filter((row) => row.refundStatus === 'Refunded');
    return {
      returns: filtered.filter((row) => row.requestType === 'Return').length,
      pending: filtered.filter((row) => row.requestStatus === 'Pending Review').length,
      completed: filtered.filter((row) => row.requestType === 'Return' && ['Return Received', 'Closed'].includes(row.returnStatus)).length,
      refundAmount: refunded.reduce((sum, row) => sum + Number(row.refundedAmount || 0), 0),
      awaiting: filtered.filter((row) => ['Pending Review', 'Approved'].includes(row.refundStatus)).length,
      failed: filtered.filter((row) => row.refundStatus === 'Refund Failed').length,
    };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = REFUND_RETURN_RECORDS.find((row) => row.id === selectedId) || null;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const resetFilters = () => {
    setFilters({ ...EMPTY_FILTERS, brand: selectedBrand?.name || 'ALL' });
    setPage(1);
  };

  const exportCsv = () => {
    const headers = [
      'Request ID',
      'Order ID',
      'Brand',
      'Customer',
      'Product',
      'Request Type',
      'Reason',
      'Requested Amount',
      'Request Date',
      'Return Status',
      'Refund Status',
      'Refunded Amount',
      'Refund Reference',
    ];
    const body = filtered.map((row) =>
      [
        row.id,
        row.orderId,
        row.brand,
        row.customerName,
        row.product,
        row.requestType,
        row.reason,
        row.requestedAmount,
        row.requestDate,
        row.returnStatus,
        row.refundStatus,
        row.refundedAmount ?? '',
        row.refundRef,
      ]
        .map(csvCell)
        .join(',')
    );
    const csv = [headers.map(csvCell).join(','), ...body].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'refunds-returns.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: 'Total Return Requests', value: String(summary.returns), hint: 'Return requests in this view', icon: RotateCcw },
    { label: 'Pending Requests', value: String(summary.pending), hint: 'Still waiting for review', icon: Clock3 },
    { label: 'Completed Returns', value: String(summary.completed), hint: 'Received or closed returns', icon: BadgeCheck },
    { label: 'Total Refund Amount', value: formatINR(summary.refundAmount), hint: 'Confirmed refunded amount', icon: IndianRupee },
    { label: 'Refunds Awaiting Processing', value: String(summary.awaiting), hint: 'Approved or still in review', icon: Undo2 },
    { label: 'Failed Refunds', value: String(summary.failed), hint: 'Refund attempts that failed', icon: CircleX },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title="Refunds & Returns"
        subtitle="View-only monitor of return, refund, and replacement records. No approvals or payment actions on this page."
        subtitleClassName="m-0 mt-0.5 max-w-3xl text-xs font-medium text-slate-500"
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-400">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-slate-700">Refunds & Returns</span>
          </nav>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 hover:bg-slate-50"
          >
            <Download size={15} className="text-[#F7941D]" /> Export CSV
          </button>
        </div>

        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Demonstration data only. These records are samples. This page cannot approve, reject, or process a refund.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{card.value}</p>
                <p className="m-0 mt-1 text-xs font-medium text-slate-500">{card.hint}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="relative sm:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Request ID, order ID, or customer"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select className={selectClass} value={filters.brand} onChange={(e) => setFilter('brand', e.target.value)}>
              <option value="ALL">All brands</option>
              {brandsInData.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.requestType} onChange={(e) => setFilter('requestType', e.target.value)}>
              <option value="ALL">All request types</option>
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.requestStatus} onChange={(e) => setFilter('requestStatus', e.target.value)}>
              <option value="ALL">All request statuses</option>
              {REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.refundStatus} onChange={(e) => setFilter('refundStatus', e.target.value)}>
              <option value="ALL">All refund statuses</option>
              {REFUND_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 xl:col-span-1">
              <input type="date" aria-label="From date" value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)} className={selectClass} />
              <input type="date" aria-label="To date" value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)} className={selectClass} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-500">
              Showing <span className="text-slate-900">{rows.length}</span> of <span className="text-slate-900">{filtered.length}</span> demo records
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700"
            >
              <RotateCcw size={13} /> Reset Filters
            </button>
          </div>
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {[
                    'Request ID',
                    'Order ID',
                    'Brand',
                    'Customer',
                    'Product',
                    'Type',
                    'Reason',
                    'Requested',
                    'Request Date',
                    'Return Status',
                    'Refund Status',
                    'Action',
                  ].map((heading) => (
                    <th key={heading} className={thClass}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-14 text-center">
                      <p className="m-0 text-sm font-medium text-slate-700">No records match these filters</p>
                      <p className="m-0 mt-1 text-sm text-slate-400">Reset the filters to see the sample return and refund list.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{row.id}</td>
                      <td className={`${tdClass} font-mono`}>{row.orderId}</td>
                      <td className={tdClass}>{row.brand}</td>
                      <td className={tdClass}>{row.customerName}</td>
                      <td className={tdClass}>{row.product}</td>
                      <td className={tdClass}>{row.requestType}</td>
                      <td className={tdClass}>{row.reason}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(row.requestedAmount)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDay(row.requestDate)}</td>
                      <td className={tdClass}>
                        <StatusBadge status={row.returnStatus} />
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={row.refundStatus} />
                      </td>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 hover:bg-[#1A2E0A] hover:text-white"
                        >
                          <Eye size={13} /> View Details
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
              Page <span className="text-slate-900">{safePage}</span> of <span className="text-slate-900">{pages}</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <DetailDrawer
          wide
          eyebrow="Read-only record"
          title={selected.id}
          subtitle={`${selected.requestType} · ${selected.brand}`}
          onClose={() => setSelectedId(null)}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Customer</h3>
              <Fact label="Customer ID" value={selected.customerId} />
              <Fact label="Name" value={selected.customerName} />
              <Fact label="Phone" value={selected.phone} />
              <Fact label="Email" value={selected.email} />
            </section>
            <section>
              <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Order</h3>
              <Fact label="Order ID" value={selected.orderId} />
              <Fact label="Order date" value={formatDay(selected.orderDate)} />
              <Fact label="Brand" value={selected.brand} />
              <Fact label="Product" value={`${selected.product} × ${selected.quantity}`} />
              <Fact label="Order amount" value={formatINR(selected.orderAmount)} />
              <Fact label="Payment method" value={selected.paymentMethod} />
              <Fact label="Payment reference" value={selected.paymentRef} />
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Return</h3>
              <Fact label="Request ID" value={selected.id} />
              <Fact label="Reason" value={selected.reason} />
              <Fact label="Request date" value={formatDay(selected.requestDate)} />
              <Fact label="Request status" value={selected.requestStatus} />
              {selected.returnStatus ? <Fact label="Return status" value={selected.returnStatus} /> : null}
              {selected.evidence ? <Fact label="Evidence" value={selected.evidence} /> : null}
              {selected.pickupStatus ? <Fact label="Pickup / delivery" value={selected.pickupStatus} /> : null}
              {selected.inspectionStatus ? <Fact label="Inspection" value={selected.inspectionStatus} /> : null}
            </section>
            <section>
              <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Refund</h3>
              <Fact label="Requested amount" value={formatINR(selected.requestedAmount)} />
              {selected.approvedAmount !== null && selected.approvedAmount !== undefined ? (
                <Fact label="Approved amount" value={formatINR(selected.approvedAmount)} />
              ) : null}
              {selected.refundedAmount !== null && selected.refundedAmount !== undefined ? (
                <Fact label="Refunded amount" value={formatINR(selected.refundedAmount)} />
              ) : null}
              {selected.refundMethod ? <Fact label="Refund method" value={selected.refundMethod} /> : null}
              {selected.refundRef ? <Fact label="Refund reference" value={selected.refundRef} /> : null}
              {selected.refundStatus ? <Fact label="Refund status" value={selected.refundStatus} /> : null}
              {selected.refundProcessingDate ? <Fact label="Processing date" value={formatDay(selected.refundProcessingDate)} /> : null}
              {selected.refundCompletedDate ? <Fact label="Completed date" value={formatDay(selected.refundCompletedDate)} /> : null}
            </section>
          </div>
          <section>
            <h3 className="m-0 mb-2 text-sm font-medium text-[#1A2E0A]">Activity</h3>
            <ol className="m-0 list-none space-y-2 p-0">
              {selected.timeline.map((event) => (
                <li key={`${event.at}-${event.label}`} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-sm">
                  <span className="text-slate-800">{event.label}</span>
                  <span className="shrink-0 font-mono text-slate-500">{formatDay(event.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </DetailDrawer>
      ) : null}
    </div>
  );
};
