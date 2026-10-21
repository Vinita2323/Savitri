import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, RotateCcw } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { paymentBrandFromSlug } from '../data/paymentBrandsMock';
import { getBrandCustomer, getPurchases } from '../data/paymentSelectors';
import { catalogOwns } from '../data/switchBrandScope';
import {
  DetailModal,
  PaymentStatusBadge,
  demoBanner,
  downloadCsv,
  formatDay,
  formatINR,
  formatWhen,
  headerSubtitleClass,
  headerTitleClass,
  tableClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/customer-payments/paymentUi';

const PAGE_SIZE = 5;
const EMPTY = { status: 'ALL', startDate: '', endDate: '' };

const dayKey = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const Fact = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2">
    <span className="font-normal text-slate-500">{label}</span>
    <span className="text-right font-medium text-slate-900">{value}</span>
  </div>
);

const CustomerPurchaseHistory = () => {
  const { brandSlug, customerId } = useParams();
  const navigate = useNavigate();
  const { selectedBrand } = useSuperAdmin();
  const brand = paymentBrandFromSlug(brandSlug);
  useEffect(() => {
    if (!brandSlug || !selectedBrand) return;
    if (!catalogOwns(brandSlug, selectedBrand.id)) {
      navigate('/super-admin/payments', { replace: true });
    }
  }, [brandSlug, selectedBrand, navigate]);
  const customer = brand ? getBrandCustomer(brand.slug, customerId) : null;
  const purchases = useMemo(() => (brand && customer ? getPurchases(brand.slug, customer.id) : []), [brand, customer]);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(
    () =>
      purchases.filter((purchase) => {
        if (filters.status !== 'ALL' && purchase.payment?.status !== filters.status) return false;
        const day = dayKey(purchase.createdAt);
        if (filters.startDate && day < filters.startDate) return false;
        if (filters.endDate && day > filters.endDate) return false;
        return true;
      }),
    [purchases, filters]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = purchases.find((purchase) => purchase.orderId === selectedId) || null;
  const listPath = brand ? `/super-admin/payments/brands/${brand.slug}` : '/super-admin/payments';

  if (!brand || !customer) {
    return (
      <div className="min-h-full bg-[#f8fafc] p-6">
        <button type="button" onClick={() => navigate(listPath)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base">
          Back
        </button>
        <p className="mt-4 text-base text-slate-600">Demo customer not found for this brand.</p>
      </div>
    );
  }

  const exportRows = () => {
    downloadCsv(
      `purchase-history-${customer.id}.csv`,
      ['Order ID', 'Date', 'Items', 'Qty', 'Amount', 'Discount', 'Tax', 'Final', 'Method', 'Transaction', 'Payment status', 'Order status'],
      filtered.map((purchase) => [
        purchase.orderId,
        formatWhen(purchase.createdAt),
        purchase.items.map((item) => item.name).join('; '),
        purchase.items.reduce((sum, item) => sum + item.quantity, 0),
        purchase.subtotal.toFixed(2),
        purchase.discount.toFixed(2),
        purchase.tax.toFixed(2),
        purchase.finalAmount.toFixed(2),
        purchase.payment?.method,
        purchase.payment?.transactionId,
        purchase.payment?.status,
        purchase.orderStatus,
      ])
    );
  };

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`${customer.name} — Purchase History`}
        subtitle={`${brand.name} · ${customer.id} · sample records only`}
        titleClassName={headerTitleClass}
        subtitleClassName={headerSubtitleClass}
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-base text-slate-400">
            <Link to="/super-admin/payments" className="text-slate-500 no-underline hover:text-[#F7941D]">Payments</Link>
            <span>/</span>
            <Link to={listPath} className="text-slate-500 no-underline hover:text-[#F7941D]">{brand.name}</Link>
            <span>/</span>
            <span className="text-slate-700">{customer.name}</span>
          </nav>
          <button type="button" onClick={() => navigate(listPath)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-700">
            <ArrowLeft size={16} /> Back to Customers
          </button>
        </div>
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-800">{demoBanner}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="m-0 text-xl font-medium text-[#1A2E0A]">Customer profile</h2>
            <Fact label="Customer ID" value={customer.id} />
            <Fact label="Name" value={customer.name} />
            <Fact label="Phone" value={customer.phone} />
            <Fact label="Email" value={customer.email} />
            <Fact label="Registered" value={formatDay(customer.registeredAt)} />
            <Fact label="Account status" value={customer.accountStatus} />
          </section>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h2 className="m-0 text-xl font-medium text-[#1A2E0A]">Purchase summary</h2>
            <Fact label="Total orders" value={customer.orders} />
            <Fact label="Successfully paid" value={formatINR(customer.successful)} />
            <Fact label="Refunded" value={formatINR(customer.refunds)} />
            <Fact label="Pending" value={formatINR(customer.pending)} />
            <Fact label="Last purchase" value={formatDay(customer.lastPurchaseAt)} />
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.status}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, status: event.target.value }));
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none"
            >
              <option value="ALL">All payment statuses</option>
              {['Successful', 'Pending', 'Failed', 'Partially Refunded', 'Refunded'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <input type="date" aria-label="Start date" value={filters.startDate} onChange={(event) => { setFilters((prev) => ({ ...prev, startDate: event.target.value })); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none" />
            <input type="date" aria-label="End date" value={filters.endDate} onChange={(event) => { setFilters((prev) => ({ ...prev, endDate: event.target.value })); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setFilters(EMPTY); setPage(1); }} className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-base">
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" onClick={exportRows} className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-base">
              <Download size={14} className="text-[#F7941D]" /> Export CSV
            </button>
          </div>
        </div>
        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  {['Order ID', 'Date', 'Items', 'Qty', 'Amount', 'Discount', 'Tax', 'Final', 'Method', 'Transaction', 'Payment', 'Order', 'Action'].map((heading) => (
                    <th key={heading} className={thClass}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-base text-slate-500">No demo purchases match these filters.</td>
                  </tr>
                ) : (
                  rows.map((purchase) => (
                    <tr key={purchase.orderId}>
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{purchase.orderId}</td>
                      <td className={tdClass}>{formatWhen(purchase.createdAt)}</td>
                      <td className={tdClass}>{purchase.items.map((item) => item.name).join(', ')}</td>
                      <td className={tdClass}>{purchase.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(purchase.subtotal)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(purchase.discount)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(purchase.tax)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(purchase.finalAmount)}</td>
                      <td className={tdClass}>{purchase.payment?.method}</td>
                      <td className={`${tdClass} font-mono`}>{purchase.payment?.transactionId}</td>
                      <td className={tdClass}><PaymentStatusBadge status={purchase.payment?.status} /></td>
                      <td className={tdClass}><PaymentStatusBadge status={purchase.orderStatus} /></td>
                      <td className={tdClass}>
                        <button type="button" onClick={() => setSelectedId(purchase.orderId)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 hover:bg-[#1A2E0A] hover:text-white">
                          <Eye size={15} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-base">
            <span className="text-slate-500">Page {safePage} of {pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">
                <ChevronLeft size={16} /> Previous
              </button>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage((current) => current + 1)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {selected ? (
        <DetailModal title={selected.orderId} subtitle={formatWhen(selected.createdAt)} onClose={() => setSelectedId(null)}>
          <Fact label="Payment transaction" value={selected.payment?.transactionId} />
          <Fact label="Brand" value={brand.name} />
          <Fact label="Customer" value={`${customer.name} (${customer.id})`} />
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            {selected.items.map((item) => (
              <p key={item.name} className="m-0 flex justify-between py-1">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-mono">{formatINR(item.price * item.quantity)}</span>
              </p>
            ))}
          </div>
          <Fact label="Item subtotal" value={formatINR(selected.subtotal)} />
          <Fact label="Discount" value={formatINR(selected.discount)} />
          <Fact label="Tax" value={formatINR(selected.tax)} />
          <Fact label="Delivery" value={formatINR(selected.delivery)} />
          <Fact label="Final order amount" value={formatINR(selected.finalAmount)} />
          <Fact label="Amount paid" value={formatINR(selected.payment?.amountPaid)} />
          <Fact label="Payment method" value={selected.payment?.method} />
          <Fact label="Gateway reference" value={selected.payment?.gatewayRef || '—'} />
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Payment status</span>
            <PaymentStatusBadge status={selected.payment?.status} />
          </div>
          <Fact label="Refund amount" value={formatINR(selected.payment?.refundAmount)} />
          <Fact label="Refund status" value={selected.payment?.refundStatus} />
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Order status</span>
            <PaymentStatusBadge status={selected.orderStatus} />
          </div>
          <p className="m-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">{selected.payment?.notes}</p>
          <div>
            <p className="mb-2 font-medium text-slate-500">Timeline</p>
            <ol className="m-0 space-y-2 p-0">
              {(selected.payment?.timeline || []).map((step) => (
                <li key={`${step.at}-${step.label}`} className="list-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="m-0 font-medium text-slate-800">{step.label}</p>
                  <p className="m-0 text-slate-400">{formatWhen(step.at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </DetailModal>
      ) : null}
    </div>
  );
};

export default CustomerPurchaseHistory;
