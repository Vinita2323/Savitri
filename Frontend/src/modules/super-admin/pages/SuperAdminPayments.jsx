import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Store, CreditCard, BadgeCheck, Undo2, AlertCircle, Eye, Download } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { getBrandSummaries } from '../data/paymentSelectors';
import { catalogOwns } from '../data/switchBrandScope';
import {
  PaymentSummaryCards,
  demoBanner,
  downloadCsv,
  formatINR,
  headerSubtitleClass,
  headerTitleClass,
  tableClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/customer-payments/paymentUi';

export const SuperAdminPayments = () => {
  const { selectedBrand } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const brands = useMemo(
    () => getBrandSummaries().filter((brand) => catalogOwns(brand.slug, selectedBrand?.id)),
    [selectedBrand?.id]
  );
  const summary = useMemo(
    () => ({
      brands: brands.length,
      payments: brands.reduce((sum, brand) => sum + brand.paymentCount, 0),
      successful: brands.reduce((sum, brand) => sum + brand.successful, 0),
      refunds: brands.reduce((sum, brand) => sum + brand.refunds, 0),
      pending: brands.reduce((sum, brand) => sum + brand.pending, 0),
      failedCount: brands.reduce((sum, brand) => sum + brand.failedCount, 0),
    }),
    [brands]
  );

  const exportBrands = () => {
    downloadCsv(
      'customer-payments-brands.csv',
      ['Brand', 'Customers', 'Orders', 'Successful amount', 'Refunds', 'Pending', 'Failed count'],
      brands.map((brand) => [
        brand.name,
        brand.customers,
        brand.orders,
        brand.successful.toFixed(2),
        brand.refunds.toFixed(2),
        brand.pending.toFixed(2),
        brand.failedCount,
      ])
    );
  };

  const cards = [
    { label: 'Total Brands', value: String(summary.brands), hint: brandName, icon: Store },
    { label: 'Total Customer Payments', value: String(summary.payments), hint: 'Sample payment records', icon: CreditCard },
    { label: 'Total Successful Payments', value: formatINR(summary.successful), hint: 'Verified collections only', icon: BadgeCheck },
    { label: 'Total Refunds', value: formatINR(summary.refunds), hint: 'Tracked separately from collections', icon: Undo2 },
    {
      label: 'Failed / Pending',
      value: String(summary.failedCount),
      hint: `${formatINR(summary.pending)} still pending`,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Customer Payments — ${brandName}`}
        subtitle={`Customer payment totals for ${brandName} only. Change the brand in the sidebar to see another brand.`}
        titleClassName={headerTitleClass}
        subtitleClassName={headerSubtitleClass}
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-normal text-amber-800">
            Showing {brandName} only. {demoBanner}
          </p>
          <button
            type="button"
            onClick={exportBrands}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"
          >
            <Download size={16} className="text-[#F7941D]" /> Export CSV
          </button>
        </div>
        <PaymentSummaryCards cards={cards} />
        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {['Brand', 'Customers', 'Orders', 'Successful', 'Refunds', 'Pending', 'Failed', 'Action'].map((heading) => (
                    <th key={heading} className={thClass}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500">
                      No customer payments for {brandName}.
                    </td>
                  </tr>
                ) : (
                brands.map((brand) => (
                  <tr key={brand.slug} className="hover:bg-slate-50/70">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172D0B] text-sm font-medium text-white">
                          {brand.name.slice(0, 1)}
                        </span>
                        <div>
                          <Link
                            to={`/super-admin/payments/brands/${brand.slug}`}
                            className="font-medium text-[#1A2E0A] no-underline hover:text-[#F7941D]"
                          >
                            {brandName}
                          </Link>
                          <p className="m-0 text-slate-400">{brand.name} · {brand.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>{brand.customers}</td>
                    <td className={tdClass}>{brand.orders}</td>
                    <td className={`${tdClass} font-mono`}>{formatINR(brand.successful)}</td>
                    <td className={`${tdClass} font-mono`}>{formatINR(brand.refunds)}</td>
                    <td className={`${tdClass} font-mono`}>{formatINR(brand.pending)}</td>
                    <td className={tdClass}>{brand.failedCount}</td>
                    <td className={tdClass}>
                      <Link
                        to={`/super-admin/payments/brands/${brand.slug}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-700 no-underline hover:bg-[#1A2E0A] hover:text-white"
                      >
                        <Eye size={15} /> View Customers
                      </Link>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
