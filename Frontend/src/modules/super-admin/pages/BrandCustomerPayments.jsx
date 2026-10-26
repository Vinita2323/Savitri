import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, RotateCcw, Search, BadgeCheck, Undo2, AlertCircle, CreditCard, Wallet } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { paymentBrandFromSlug } from '../data/paymentBrandsMock';
import { getBrandCustomers, getBrandPaymentTotals } from '../data/paymentSelectors';
import { catalogOwns } from '../data/switchBrandScope';
import {
  PaymentStatusBadge,
  PaymentSummaryCards,
  demoBanner,
  downloadCsv,
  formatDay,
  formatINR,
  headerSubtitleClass,
  headerTitleClass,
  tableClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/customer-payments/paymentUi';

const EMPTY = { search: '', status: 'ALL', period: 'ALL' };

const BrandCustomerPayments = () => {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const brand = paymentBrandFromSlug(brandSlug);
  const { selectedBrand } = useSuperAdmin();
  useEffect(() => {
    if (!brandSlug || !selectedBrand) return;
    if (!catalogOwns(brandSlug, selectedBrand.id)) {
      navigate('/super-admin/payments', { replace: true });
    }
  }, [brandSlug, selectedBrand, navigate]);
  const totals = brand ? getBrandPaymentTotals(brand.slug) : null;
  const customers = useMemo(() => (brand ? getBrandCustomers(brand.slug) : []), [brand]);
  const [filters, setFilters] = useState(EMPTY);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const today = new Date();
    return customers.filter((customer) => {
      if (filters.status !== 'ALL' && customer.latestStatus !== filters.status) return false;

      if (filters.period && filters.period !== 'ALL') {
        if (!customer.lastPurchaseAt) return false;
        const purchaseDate = new Date(customer.lastPurchaseAt);
        const diffDays = (today - purchaseDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) return false;
        if (filters.period === 'weekly' && diffDays > 7) return false;
        if (filters.period === 'monthly' && diffDays > 30) return false;
        if (filters.period === 'quarterly' && diffDays > 91) return false;
        if (filters.period === 'half_yearly' && diffDays > 182) return false;
        if (filters.period === 'yearly' && diffDays > 365) return false;
      }

      if (!query) return true;
      return [customer.id, customer.name, customer.email, customer.store, customer.phone].join(' ').toLowerCase().includes(query);
    });
  }, [customers, filters]);

  if (!brand || !totals) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-6">
        <button type="button" onClick={() => navigate('/super-admin/payments')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          Back to All Brands
        </button>
        <p className="mt-4 text-sm text-slate-600">This brand is not in the demo payment list.</p>
      </div>
    );
  }

  const exportCustomers = () => {
    downloadCsv(
      `customers-${brand.slug}.csv`,
      ['Customer ID', 'Name', 'Phone', 'Email', 'Purchases', 'Successful spend', 'Refunds', 'Last purchase', 'Method', 'Status'],
      filtered.map((customer) => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        customer.orders,
        customer.successful.toFixed(2),
        customer.refunds.toFixed(2),
        formatDay(customer.lastPurchaseAt),
        customer.lastMethod,
        customer.latestStatus,
      ])
    );
  };

  const cards = [
    { label: 'Total Payments', value: String(totals.paymentCount), hint: 'Demo payment records', icon: CreditCard },
    { label: 'Successful Total', value: formatINR(totals.successful), hint: 'Verified collections only', icon: BadgeCheck },
    { label: 'Pending Total', value: formatINR(totals.pending), hint: 'Still awaiting payment', icon: Wallet },
    { label: 'Refund Total', value: formatINR(totals.refunds), hint: 'Tracked separately', icon: Undo2 },
    { label: 'Failed Payments', value: String(totals.failedCount), hint: `${formatINR(totals.failedAmount)} not collected`, icon: AlertCircle },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`${brand.name} — Customers`}
        subtitle="Every demo customer for this brand, with payment totals above the list."
        titleClassName={headerTitleClass}
        subtitleClassName={headerSubtitleClass}
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-400">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">Super Admin</Link>
            <span>/</span>
            <Link to="/super-admin/payments" className="text-slate-500 no-underline hover:text-[#F7941D]">Payments</Link>
            <span>/</span>
            <span className="text-slate-700">{brand.name}</span>
          </nav>
          <button
            type="button"
            onClick={() => navigate('/super-admin/payments')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <ArrowLeft size={16} /> Back to All Brands
          </button>
        </div>
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{demoBanner}</p>
        <PaymentSummaryCards cards={cards} />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-[220px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Name, customer ID, or email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All statuses</option>
              {['Successful', 'Pending', 'Failed', 'Partially Refunded', 'Refunded'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={filters.period}
              onChange={(event) => setFilters((prev) => ({ ...prev, period: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
              aria-label="Filter by time period"
              title="Filter by time period"
            >
              <option value="ALL">All Time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFilters(EMPTY)} className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" onClick={exportCustomers} className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
              <Download size={14} className="text-[#F7941D]" /> Export CSV
            </button>
          </div>
        </div>

        <div className={tableWrap}>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="m-0 text-base font-medium text-[#1A2E0A]">All customers</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Showing {filtered.length} of {customers.length} demo customers
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {['Customer ID', 'Name', 'Phone', 'Email', 'Purchases', 'Successful spend', 'Refunds', 'Last purchase', 'Method', 'Status', 'Action'].map((heading) => (
                    <th key={heading} className={thClass}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center text-sm text-slate-500">No demo customers match these filters.</td>
                  </tr>
                ) : (
                  filtered.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{customer.id}</td>
                      <td className={tdClass}>
                        <Link to={`/super-admin/payments/brands/${brand.slug}/customers/${customer.id}`} className="font-medium text-[#1A2E0A] no-underline hover:text-[#F7941D]">
                          {customer.name}
                        </Link>
                      </td>
                      <td className={`${tdClass} font-mono`}>{customer.phone}</td>
                      <td className={tdClass}>{customer.email}</td>
                      <td className={tdClass}>{customer.orders}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(customer.successful)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(customer.refunds)}</td>
                      <td className={tdClass}>{formatDay(customer.lastPurchaseAt)}</td>
                      <td className={tdClass}>{customer.lastMethod}</td>
                      <td className={tdClass}><PaymentStatusBadge status={customer.latestStatus} /></td>
                      <td className={tdClass}>
                        <Link
                          to={`/super-admin/payments/brands/${brand.slug}/customers/${customer.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 no-underline hover:bg-[#1A2E0A] hover:text-white"
                        >
                          <Eye size={15} /> View Details
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

export default BrandCustomerPayments;
