import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { brandFromSlug } from '../data/brandSellersMock';
import { getBrandSeller, getPayoutById, getSellerPayouts } from '../data/brandPayoutsMock';
import { catalogOwns } from '../data/switchBrandScope';
import {
  DetailDrawer,
  PayoutStatusBadge,
  formatDay,
  formatINR,
  formatWhen,
  tableClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/seller-payouts/payoutUi';

const Fact = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2">
    <span className="text-[11px] font-semibold text-slate-500">{label}</span>
    <span className="text-right text-xs font-bold text-slate-900">{value}</span>
  </div>
);

const BrandSellerDetail = () => {
  const { brandSlug, sellerId } = useParams();
  const navigate = useNavigate();
  const brand = brandFromSlug(brandSlug);
  const { selectedBrand } = useSuperAdmin();
  useEffect(() => {
    if (!brandSlug || !selectedBrand) return;
    if (!catalogOwns(brandSlug, selectedBrand.id)) {
      navigate('/super-admin/payouts/sellers', { replace: true });
    }
  }, [brandSlug, selectedBrand, navigate]);
  const seller = useMemo(
    () => (brand ? getBrandSeller(brand.slug, sellerId) : null),
    [brand, sellerId]
  );
  const payouts = useMemo(() => (seller ? getSellerPayouts(seller.id) : []), [seller]);
  const [selectedPayoutId, setSelectedPayoutId] = useState(null);
  const selectedPayout = selectedPayoutId ? getPayoutById(seller?.id, selectedPayoutId) : null;

  if (!brand || !seller) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-6 font-sans">
        <button
          type="button"
          onClick={() => navigate(brand ? `/super-admin/brands/${brand.slug}/seller-payouts` : '/super-admin/transactions')}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <p className="mt-6 text-sm font-bold text-slate-600">Demo seller not found for this brand.</p>
      </div>
    );
  }

  const listPath = `/super-admin/brands/${brand.slug}/seller-payouts`;

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`${seller.name} — Payout History`}
        subtitle={`${brand.name} · ${seller.store} · sample records only`}
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-400">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span>Brands</span>
            <span>/</span>
            <span>{brand.name}</span>
            <span>/</span>
            <Link to={listPath} className="text-slate-500 no-underline hover:text-[#F7941D]">
              Seller Payouts
            </Link>
            <span>/</span>
            <span className="text-slate-700">{seller.name}</span>
          </nav>
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Back to Seller Payouts
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="m-0 text-sm font-black text-[#1A2E0A]">Seller profile</h2>
            <p className="mb-2 mt-1 text-[11px] font-medium text-amber-700">Fictional demo profile</p>
            <Fact label="Seller ID" value={seller.id} />
            <Fact label="Seller name" value={seller.name} />
            <Fact label="Store" value={seller.store} />
            <Fact label="Phone" value={seller.phone} />
            <Fact label="Email" value={seller.email} />
            <Fact label="Registered" value={formatDay(seller.registeredAt)} />
            <Fact label="Verification" value={seller.verification} />
            <Fact label="Account status" value={seller.accountStatus} />
          </section>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="m-0 text-sm font-black text-[#1A2E0A]">Financial summary</h2>
            <p className="mb-2 mt-1 text-[11px] font-medium text-amber-700">Derived from this seller&apos;s demo payouts</p>
            <Fact label="Total sales" value={formatINR(seller.sales)} />
            <Fact label="Total orders" value={seller.orders} />
            <Fact label="Commission deducted" value={formatINR(seller.commission)} />
            <Fact label="Total paid" value={formatINR(seller.totalPaid)} />
            <Fact label="Pending settlement" value={formatINR(seller.pendingAmount)} />
            <Fact label="Failed payouts" value={formatINR(seller.failedAmount)} />
          </section>
        </div>

        <div className={tableWrap}>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 text-sm font-black text-[#1A2E0A]">Payout history</h2>
            <p className="m-0 mt-1 text-[11px] font-medium text-slate-500">{payouts.length} sample records for {seller.id}</p>
          </div>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {[
                    'Payout ID',
                    'Date',
                    'Reference',
                    'Gross',
                    'Commission',
                    'Other',
                    'Net',
                    'Method',
                    'UTR',
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
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                      No demo payouts for this seller.
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono font-bold text-[#F7941D]`}>{payout.payoutId}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatWhen(payout.createdAt)}</td>
                      <td className={`${tdClass} font-mono`}>{payout.reference}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(payout.gross)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(payout.commission)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(payout.otherDeductions)}</td>
                      <td className={`${tdClass} font-mono font-bold`}>{formatINR(payout.net)}</td>
                      <td className={tdClass}>{payout.paymentMethod}</td>
                      <td className={`${tdClass} font-mono text-[11px]`}>{payout.utr}</td>
                      <td className={tdClass}>
                        <PayoutStatusBadge status={payout.status} />
                      </td>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() => setSelectedPayoutId(payout.payoutId)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-[#1A2E0A] hover:text-white"
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPayout ? (
        <DetailDrawer
          title={selectedPayout.payoutId}
          subtitle={formatWhen(selectedPayout.createdAt)}
          onClose={() => setSelectedPayoutId(null)}
        >
          <Fact label="Seller" value={`${seller.name} (${seller.id})`} />
          <Fact label="Brand" value={brand.name} />
          <Fact label="Gross amount" value={formatINR(selectedPayout.gross)} />
          <Fact label="Commission" value={formatINR(selectedPayout.commission)} />
          <Fact label="Other deductions" value={formatINR(selectedPayout.otherDeductions)} />
          <Fact label="Net payout" value={formatINR(selectedPayout.net)} />
          <Fact label="Payment method" value={selectedPayout.paymentMethod} />
          <Fact label="Reference / UTR" value={selectedPayout.utr} />
          <Fact label="Order reference" value={selectedPayout.reference} />
          <div className="flex items-center justify-between py-2">
            <span className="text-[11px] font-semibold text-slate-500">Status</span>
            <PayoutStatusBadge status={selectedPayout.status} />
          </div>
          {selectedPayout.failureReason ? (
            <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">
              {selectedPayout.failureReason}
            </p>
          ) : null}
          <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3 font-medium text-slate-700">
            {selectedPayout.notes}
          </p>
          <div>
            <p className="mb-2 font-semibold text-slate-500">Status timeline</p>
            <ol className="m-0 space-y-2 p-0">
              {selectedPayout.timeline.map((step) => (
                <li key={`${step.at}-${step.label}`} className="list-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="m-0 font-bold text-slate-800">{step.label}</p>
                  <p className="m-0 mt-0.5 font-mono text-[10px] text-slate-400">{formatWhen(step.at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </DetailDrawer>
      ) : null}
    </div>
  );
};

export default BrandSellerDetail;
