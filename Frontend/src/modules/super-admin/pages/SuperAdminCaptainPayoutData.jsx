import React, { useEffect, useMemo, useState } from 'react';
import { CircleX, Clock3, RotateCcw, Search, Truck, Users, Wallet } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import {
  PayoutStatusBadge,
  PayoutSummaryCards,
  formatDay,
  formatINR,
  tableClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/seller-payouts/payoutUi';
import { CAPTAIN_PAYOUTS, captainPayoutStatus } from '../data/captainPayoutsMock';
import { captainBelongsTo } from '../data/switchBrandScope';

const PAGE_SIZE = 10;

const round2 = (value) => Math.round(value * 100) / 100;

const SuperAdminCaptainPayoutData = () => {
  const { selectedBrand } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const captains = useMemo(
    () =>
      CAPTAIN_PAYOUTS.filter((row) => captainBelongsTo(row.id, selectedBrand?.id)).map((row) => ({
        ...row,
        status: captainPayoutStatus(row),
      })),
    [selectedBrand?.id]
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearch('');
    setStatus('ALL');
    setPage(1);
  }, [selectedBrand?.id]);

  const summary = useMemo(() => {
    const paid = round2(captains.reduce((sum, row) => sum + row.totalPaid, 0));
    const pending = round2(captains.reduce((sum, row) => sum + row.pendingAmount, 0));
    const failed = round2(captains.reduce((sum, row) => sum + row.failedAmount, 0));
    return { captains: captains.length, paid, pending, failed };
  }, [captains]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return captains.filter((row) => {
      if (status !== 'ALL' && row.status !== status) return false;
      if (!query) return true;
      return [row.id, row.name, row.city, row.vehicle, row.phone].join(' ').toLowerCase().includes(query);
    });
  }, [captains, search, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const cards = [
    { label: 'Captains', value: String(summary.captains), hint: brandName, icon: Users },
    { label: 'Paid Out', value: formatINR(summary.paid), hint: 'Amount already paid to captains', icon: Wallet },
    { label: 'Pending', value: formatINR(summary.pending), hint: 'Not paid yet', icon: Clock3 },
    { label: 'Failed', value: formatINR(summary.failed), hint: 'Payout attempts that failed', icon: CircleX },
    { label: 'Deliveries', value: String(captains.reduce((sum, row) => sum + row.deliveries, 0)), hint: 'Sample completed deliveries', icon: Truck },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Captain Payouts — ${brandName}`}
        subtitle={`Payout totals for ${brandName} captains only. Change the brand in the sidebar to see another brand.`}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Showing {brandName} only. Captain payout totals on this page follow the brand selected in the sidebar.
        </p>
        <PayoutSummaryCards cards={cards} />

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative sm:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Captain name, ID, city, or vehicle"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#F7941D]"
            >
              <option value="ALL">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-500">
              Showing <span className="font-medium text-slate-900">{rows.length}</span> of{' '}
              <span className="font-medium text-slate-900">{filtered.length}</span> captains
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatus('ALL');
                setPage(1);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {['Captain', 'Phone', 'Vehicle', 'City', 'Deliveries', 'Paid', 'Pending', 'Failed', 'Last Payout', 'Status'].map(
                    (heading) => (
                      <th key={heading} className={thClass}>
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-14 text-center text-sm text-slate-500">
                      No captains match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className={tdClass}>
                        <div className="font-medium text-[#1A2E0A]">{row.name}</div>
                        <div className="font-mono text-sm text-slate-400">{row.id}</div>
                      </td>
                      <td className={`${tdClass} font-mono text-sm`}>{row.phone}</td>
                      <td className={tdClass}>{row.vehicle}</td>
                      <td className={tdClass}>{row.city}</td>
                      <td className={tdClass}>{row.deliveries}</td>
                      <td className={`${tdClass} font-mono font-medium text-emerald-800`}>{formatINR(row.totalPaid)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(row.pendingAmount)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(row.failedAmount)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDay(row.lastPayoutDate)}</td>
                      <td className={tdClass}>
                        <PayoutStatusBadge status={row.status} />
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
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminCaptainPayoutData;
