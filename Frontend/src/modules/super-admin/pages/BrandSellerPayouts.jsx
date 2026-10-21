import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Search, Store, Users, Wallet, Clock3, CircleX, Eye } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { brandFromSlug } from '../data/brandSellersMock';
import { getBrandSellers, getBrandSummary } from '../data/brandPayoutsMock';
import { catalogOwns } from '../data/switchBrandScope';
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

const PAGE_SIZE = 8;
const EMPTY_FILTERS = { search: '', status: 'ALL', startDate: '', endDate: '', minAmount: '', maxAmount: '' };

const BrandSellerPayouts = () => {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const brand = brandFromSlug(brandSlug);
  const { selectedBrand } = useSuperAdmin();
  useEffect(() => {
    if (!brandSlug || !selectedBrand) return;
    if (!catalogOwns(brandSlug, selectedBrand.id)) {
      navigate('/super-admin/payouts/sellers', { replace: true });
    }
  }, [brandSlug, selectedBrand, navigate]);
  const sellers = useMemo(() => (brand ? getBrandSellers(brand.slug) : []), [brand]);
  const summary = useMemo(() => (brand ? getBrandSummary(brand.slug) : null), [brand]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const min = filters.minAmount === '' ? null : Number(filters.minAmount);
    const max = filters.maxAmount === '' ? null : Number(filters.maxAmount);
    return sellers.filter((seller) => {
      if (filters.status !== 'ALL' && seller.status !== filters.status) return false;
      if (filters.startDate && seller.lastPayoutDate < filters.startDate) return false;
      if (filters.endDate && seller.lastPayoutDate > filters.endDate) return false;
      if (min != null && !Number.isNaN(min) && seller.totalPaid < min) return false;
      if (max != null && !Number.isNaN(max) && seller.totalPaid > max) return false;
      if (!query) return true;
      return [seller.id, seller.name, seller.store].join(' ').toLowerCase().includes(query);
    });
  }, [sellers, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!brand || !summary) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-6 font-sans">
        <button
          type="button"
          onClick={() => navigate('/super-admin/transactions')}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
        >
          <ArrowLeft size={14} /> Back to Transactions
        </button>
        <p className="mt-6 text-sm font-normal text-slate-600">This brand is not in the demo payout list.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Sellers', value: String(summary.totalSellers), hint: 'Demo sellers on this brand', icon: Users },
    { label: 'Total Payouts', value: formatINR(summary.totalPayouts), hint: 'Paid + pending + failed (demo)', icon: Wallet },
    { label: 'Completed Payouts', value: formatINR(summary.completed), hint: 'Sum of paid amounts (demo)', icon: Store },
    { label: 'Pending Payouts', value: formatINR(summary.pending), hint: 'Awaiting demo settlement', icon: Clock3 },
    { label: 'Failed Payouts', value: formatINR(summary.failed), hint: 'Sample failed amounts', icon: CircleX },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`${brand.name} — Seller Payouts`}
        subtitle="View seller details, payout history, settlement status, and financial records for this brand."
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-400">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span>Brands</span>
            <span>/</span>
            <span>{brand.name}</span>
            <span>/</span>
            <span className="text-slate-700">Seller Payouts</span>
          </nav>
          <button
            type="button"
            onClick={() => navigate('/super-admin/transactions')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Back to Transactions
          </button>
        </div>

        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Demonstration data only. Totals are calculated from this brand&apos;s sample seller list, not live settlements.
        </p>

        <PayoutSummaryCards cards={cards} />

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative sm:col-span-2 xl:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Seller name, ID, or store"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal outline-none focus:border-[#F7941D]"
            >
              <option value="ALL">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
            <input
              type="date"
              aria-label="Start date"
              value={filters.startDate}
              onChange={(e) => setFilter('startDate', e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#F7941D]"
            />
            <input
              type="date"
              aria-label="End date"
              value={filters.endDate}
              onChange={(e) => setFilter('endDate', e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#F7941D]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min paid"
                value={filters.minAmount}
                onChange={(e) => setFilter('minAmount', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#F7941D]"
              />
              <input
                type="number"
                min="0"
                placeholder="Max paid"
                value={filters.maxAmount}
                onChange={(e) => setFilter('maxAmount', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-500">
              Showing <span className="font-medium text-slate-900">{rows.length}</span> of{' '}
              <span className="font-medium text-slate-900">{filtered.length}</span> demo sellers
            </span>
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
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
                    'Seller ID',
                    'Seller Name',
                    'Store / Business',
                    'Phone',
                    'Email',
                    'Orders',
                    'Total Sales',
                    'Commission',
                    'Total Paid',
                    'Pending',
                    'Last Payout',
                    'Status',
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
                    <td colSpan={13} className="px-4 py-14 text-center text-sm font-normal text-slate-500">
                      No demo sellers match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((seller) => (
                    <tr key={seller.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono font-normal text-[#F7941D]`}>{seller.id}</td>
                      <td className={tdClass}>
                        <Link
                          to={`/super-admin/brands/${brand.slug}/seller-payouts/${seller.id}`}
                          className="font-normal text-[#1A2E0A] no-underline hover:text-[#F7941D]"
                        >
                          {seller.name}
                        </Link>
                      </td>
                      <td className={tdClass}>{seller.store}</td>
                      <td className={`${tdClass} font-mono text-sm`}>{seller.phone}</td>
                      <td className={tdClass}>{seller.email}</td>
                      <td className={tdClass}>{seller.orders}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(seller.sales)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(seller.commission)}</td>
                      <td className={`${tdClass} font-mono font-normal`}>{formatINR(seller.totalPaid)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(seller.pendingAmount)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDay(seller.lastPayoutDate)}</td>
                      <td className={tdClass}>
                        <PayoutStatusBadge status={seller.status} />
                      </td>
                      <td className={tdClass}>
                        <Link
                          to={`/super-admin/brands/${brand.slug}/seller-payouts/${seller.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm font-normal text-slate-700 no-underline hover:bg-[#1A2E0A] hover:text-white"
                        >
                          <Eye size={13} /> View Details
                        </Link>
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
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-normal disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pages}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-normal disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandSellerPayouts;
