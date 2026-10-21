import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleX, Clock3, Eye, RotateCcw, Search, Store, Users, Wallet } from 'lucide-react';
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
import { PAYOUT_BRANDS } from '../data/brandSellersMock';
import { getBrandSellers } from '../data/brandPayoutsMock';
import { catalogSlugsFor } from '../data/switchBrandScope';

const PAGE_SIZE = 10;

const round2 = (value) => Math.round(value * 100) / 100;

const SuperAdminSellerPayoutData = () => {
  const { selectedBrand } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const scopedBrands = useMemo(() => {
    const slugs = new Set(catalogSlugsFor(selectedBrand?.id));
    return PAYOUT_BRANDS.filter((brand) => slugs.has(brand.slug));
  }, [selectedBrand?.id]);
  const sellers = useMemo(
    () =>
      scopedBrands.flatMap((brand) =>
        getBrandSellers(brand.slug).map((seller) => ({ ...seller, brandName: brandName, brandSlug: brand.slug }))
      ),
    [scopedBrands, brandName]
  );

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setBrand('ALL');
    setPage(1);
  }, [selectedBrand?.id]);

  const summary = useMemo(() => {
    const paid = round2(sellers.reduce((sum, seller) => sum + seller.totalPaid, 0));
    const pending = round2(sellers.reduce((sum, seller) => sum + seller.pendingAmount, 0));
    const failed = round2(sellers.reduce((sum, seller) => sum + seller.failedAmount, 0));
    return { sellers: sellers.length, paid, pending, failed };
  }, [sellers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sellers.filter((seller) => {
      if (brand !== 'ALL' && seller.brandSlug !== brand) return false;
      if (status !== 'ALL' && seller.status !== status) return false;
      if (!query) return true;
      return [seller.id, seller.name, seller.store, seller.brandName].join(' ').toLowerCase().includes(query);
    });
  }, [sellers, search, brand, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const cards = [
    { label: 'Sellers', value: String(summary.sellers), hint: brandName, icon: Users },
    { label: 'Paid Out', value: formatINR(summary.paid), hint: 'Amount already paid to sellers', icon: Wallet },
    { label: 'Pending', value: formatINR(summary.pending), hint: 'Not paid yet', icon: Clock3 },
    { label: 'Failed', value: formatINR(summary.failed), hint: 'Payout attempts that failed', icon: CircleX },
    { label: 'Brand', value: brandName, hint: selectedBrand?.city || 'Selected in the sidebar', icon: Store },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Seller Payouts — ${brandName}`}
        subtitle={`Payout totals for ${brandName} only. Change the brand in the sidebar to see another brand.`}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Showing {brandName} only. Sellers, amounts, and history on this page belong to the brand selected in the sidebar.
        </p>
        <PayoutSummaryCards cards={cards} />

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Seller name, ID, or store"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#F7941D]"
            >
              <option value="ALL">{brandName}</option>
              {scopedBrands.length > 1
                ? scopedBrands.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))
                : null}
            </select>
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
              <span className="font-medium text-slate-900">{filtered.length}</span> sellers
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setBrand('ALL');
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
                  {['Seller', 'Brand', 'Store', 'Paid', 'Pending', 'Failed', 'Last Payout', 'Status', ''].map((heading) => (
                    <th key={heading || 'action'} className={thClass}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">
                      No sellers match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((seller) => (
                    <tr key={seller.id} className="hover:bg-slate-50/70">
                      <td className={tdClass}>
                        <div className="font-medium text-[#1A2E0A]">{seller.name}</div>
                        <div className="font-mono text-sm text-slate-400">{seller.id}</div>
                      </td>
                      <td className={tdClass}>{seller.brandName}</td>
                      <td className={tdClass}>{seller.store}</td>
                      <td className={`${tdClass} font-mono font-medium text-emerald-800`}>{formatINR(seller.totalPaid)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(seller.pendingAmount)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(seller.failedAmount)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDay(seller.lastPayoutDate)}</td>
                      <td className={tdClass}>
                        <PayoutStatusBadge status={seller.status} />
                      </td>
                      <td className={tdClass}>
                        <Link
                          to={`/super-admin/brands/${seller.brandSlug}/seller-payouts/${seller.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm font-normal text-slate-700 no-underline hover:bg-[#1A2E0A] hover:text-white"
                        >
                          <Eye size={13} /> History
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

export default SuperAdminSellerPayoutData;
