import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  IndianRupee,
  Package,
  Percent,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { DetailDrawer, Fact, selectClass, textButtonClass } from '../components/seller-purchases/purchaseUi';
import { HorizontalBars, SalesTrendChart } from '../components/reports/ReportCharts';
import { DEMO_UPDATED_LABEL, REPORT_BRANDS, UNAVAILABLE_OPS_METRICS } from '../data/reportsAnalyticsMock';
import {
  CATEGORIES,
  PRESETS,
  REPORT_TABS,
  aovByBrand,
  brandComparison,
  brandRows,
  buildReport,
  buildSummary,
  describeRange,
  downloadCsv,
  formatDay,
  formatINR,
  operationsOverview,
  ordersByStatus,
  ordersInRange,
  peopleOverview,
  salesTrend,
  tabForCategory,
} from '../data/reportsAnalyticsSelectors';

const PAGE_SIZE = 8;

const toneClass = {
  up: 'text-emerald-700',
  down: 'text-rose-700',
  flat: 'text-slate-500',
};

const statusClass = {
  Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Processing: 'bg-orange-50 text-orange-800 border-orange-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  Failed: 'bg-rose-50 text-rose-800 border-rose-200',
  Collected: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Refunded: 'bg-sky-50 text-sky-800 border-sky-200',
  'Pending Review': 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-sky-50 text-sky-800 border-sky-200',
  'Refund Failed': 'bg-rose-50 text-rose-800 border-rose-200',
};

const Badge = ({ value }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
    {value}
  </span>
);

const rateText = (value) => (value === null || value === undefined ? 'Not available' : `${value.toFixed(1)}%`);

const Panel = ({ title, note, children }) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
    <h2 className="m-0 text-base font-medium text-[#1A2E0A]">{title}</h2>
    {note ? <p className="m-0 mt-1 text-sm font-medium text-slate-500">{note}</p> : null}
    <div className="mt-4">{children}</div>
  </section>
);

const EmptyNote = ({ children }) => (
  <p className="m-0 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm font-medium text-slate-500">{children}</p>
);

export const SuperAdminReports = () => {
  const detailRef = useRef(null);
  const [preset, setPreset] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [brand, setBrand] = useState('ALL');
  const [category, setCategory] = useState('all');
  const [tab, setTab] = useState('sales');
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState('ALL');
  const [page, setPage] = useState(1);
  const [brandView, setBrandView] = useState(null);

  const rangeInfo = useMemo(() => describeRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const orders = useMemo(() => ordersInRange(rangeInfo.current, brand), [rangeInfo, brand]);
  const previousOrders = useMemo(() => ordersInRange(rangeInfo.previous, brand), [rangeInfo, brand]);
  const summary = useMemo(() => buildSummary(orders, previousOrders), [orders, previousOrders]);
  const trend = useMemo(() => salesTrend(orders, rangeInfo.current), [orders, rangeInfo]);
  const statusBars = useMemo(() => ordersByStatus(orders), [orders]);
  const brandBars = useMemo(() => brandComparison(orders), [orders]);
  const aov = useMemo(() => aovByBrand(orders), [orders]);
  const selectedBrandName = REPORT_BRANDS.find((item) => item.slug === brand)?.name;
  const visibleAov = selectedBrandName ? aov.brands.filter((item) => item.name === selectedBrandName) : aov.brands;
  const visibleBrandBars = selectedBrandName ? brandBars.filter((item) => item.label === selectedBrandName) : brandBars;
  const brands = useMemo(() => brandRows(orders, previousOrders, brand), [orders, previousOrders, brand]);
  const people = useMemo(() => peopleOverview(orders, rangeInfo.current, brand), [orders, rangeInfo, brand]);
  const operations = useMemo(() => operationsOverview(orders), [orders]);
  const report = useMemo(
    () => buildReport({ tab, orders, range: rangeInfo.current, brandSlug: brand, local, query }),
    [tab, orders, rangeInfo, brand, local, query]
  );

  const pages = Math.max(1, Math.ceil(report.rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const pageRows = report.rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const presetLabel = PRESETS.find((item) => item.id === preset)?.label || 'Custom Range';
  const showBusiness = category === 'all' || category === 'business';
  const showFinancial = category === 'all' || category === 'financial';
  const showPeople = category === 'all' || category === 'people';
  const showOperations = category === 'all' || category === 'operations';
  const ready = Boolean(rangeInfo.current);

  const resetPage = () => setPage(1);

  const resetFilters = () => {
    setPreset('30');
    setCustomStart('');
    setCustomEnd('');
    setBrand('ALL');
    setCategory('all');
    setTab('sales');
    setQuery('');
    setLocal('ALL');
    setPage(1);
    setBrandView(null);
  };

  const openReport = (nextTab, nextLocal = 'ALL') => {
    setTab(nextTab);
    setLocal(nextLocal);
    setQuery('');
    setPage(1);
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const exportReport = () => {
    if (!ready || !report.rows.length) return;
    const tabLabel = REPORT_TABS.find((item) => item.id === tab)?.label || 'report';
    downloadCsv(`demo-${tabLabel.toLowerCase().replace(/[^a-z]+/g, '-')}.csv`, report.columns, report.rows);
  };

  const summaryIcons = {
    totalOrders: ShoppingBag,
    completedSales: BadgeCheck,
    collections: IndianRupee,
    commission: Percent,
    refunds: RotateCcw,
    activeCustomers: Users,
  };

  const financialCards = [
    {
      label: 'Customer Payments',
      value: formatINR(orders.reduce((sum, order) => sum + order.collected, 0)),
      hint: 'Successful collections only. Pending and failed payments stay out of this amount.',
      tab: 'financial',
      local: 'collection',
      icon: IndianRupee,
    },
    {
      label: 'Platform Commission',
      value: formatINR(orders.reduce((sum, order) => sum + order.commission, 0)),
      hint: 'Earned after delivery, on the collected amount left after a confirmed refund.',
      tab: 'financial',
      local: 'commission',
      icon: Percent,
    },
    {
      label: 'Seller Payouts',
      value: formatINR(orders.reduce((sum, order) => sum + order.sellerPayout, 0)),
      hint: 'Already paid to sellers. This is not added to customer collections.',
      tab: 'financial',
      local: 'payout',
      icon: Wallet,
    },
    {
      label: 'Refunds',
      value: formatINR(orders.reduce((sum, order) => sum + order.refunded, 0)),
      hint: 'Confirmed refunds only. A refund in review is not counted here.',
      tab: 'refunds',
      local: 'Refunded',
      icon: RotateCcw,
    },
    {
      label: 'Pending Settlements',
      value: formatINR(orders.reduce((sum, order) => sum + order.pendingSettlement, 0)),
      hint: 'Unpaid seller balance. Not a completed collection and not a payout.',
      tab: 'financial',
      local: 'pending',
      icon: Store,
    },
  ];

  const viewedBrand = REPORT_BRANDS.find((item) => item.slug === brandView);
  const viewedOrders = viewedBrand ? ordersInRange(rangeInfo.current, viewedBrand.slug) : [];
  const viewedPrevious = viewedBrand ? ordersInRange(rangeInfo.previous, viewedBrand.slug) : [];
  const viewedSummary = viewedBrand ? buildSummary(viewedOrders, viewedPrevious) : [];
  const viewedPeople = viewedBrand ? peopleOverview(viewedOrders, rangeInfo.current, viewedBrand.slug) : null;

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title="Reports & Analytics"
        subtitle="Monitor business performance, financial activity, customer growth, and operations across all brands."
        subtitleClassName="m-0 mt-0.5 max-w-3xl text-xs font-medium text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-400">
              <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
                Super Admin
              </Link>
              <span>/</span>
              <span className="text-slate-700">Reports & Analytics</span>
            </nav>
            <p className="m-0 mt-2 text-sm font-medium text-slate-700">
              Selected reporting period: <span className="text-[#1A2E0A]">{presetLabel}</span>
              {ready ? <span className="text-slate-500"> · {rangeInfo.periodLabel}</span> : null}
            </p>
            <p className="m-0 mt-1 text-xs font-medium text-slate-500">Last updated {DEMO_UPDATED_LABEL}. Demonstration snapshot, not a live sync.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportReport}
              disabled={!ready || !report.rows.length}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={15} className="text-[#F7941D]" /> Export CSV
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <RotateCcw size={15} /> Reset Filters
            </button>
          </div>
        </div>

        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Demonstration data only. Figures are calculated from the sample dated 21 Oct 2026. These are not live financial results, and nothing here can be approved, edited, or paid.
        </p>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Date range</span>
            <select
              className={selectClass}
              value={preset}
              onChange={(event) => {
                setPreset(event.target.value);
                resetPage();
              }}
            >
              {PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Brand</span>
            <select
              className={selectClass}
              value={brand}
              onChange={(event) => {
                setBrand(event.target.value);
                resetPage();
              }}
            >
              <option value="ALL">All Brands</option>
              {REPORT_BRANDS.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2 xl:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Report category</span>
            <select
              className={selectClass}
              value={category}
              onChange={(event) => {
                const next = event.target.value;
                setCategory(next);
                setTab(tabForCategory(next));
                setLocal('ALL');
                setQuery('');
                resetPage();
              }}
            >
              {CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {preset === 'custom' ? (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">From</span>
                <input type="date" value={customStart} onChange={(event) => { setCustomStart(event.target.value); resetPage(); }} className={selectClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">To</span>
                <input type="date" value={customEnd} onChange={(event) => { setCustomEnd(event.target.value); resetPage(); }} className={selectClass} />
              </label>
            </div>
          ) : null}
        </div>

        {!ready ? (
          <EmptyNote>Choose both a start date and an end date to load the custom range.</EmptyNote>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summary.map((card) => {
                const Icon = summaryIcons[card.key];
                return (
                  <div key={card.key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]">
                        <Icon size={15} />
                      </span>
                    </div>
                    <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{card.value}</p>
                    <p className="m-0 mt-1 text-xs font-medium text-slate-500">{card.definition}</p>
                    <p className={`m-0 mt-1 text-xs font-medium ${toneClass[card.comparison.tone]}`}>
                      {card.comparison.text} vs {rangeInfo.previousLabel}
                    </p>
                    <p className="m-0 mt-1 text-[11px] font-medium text-slate-400">{rangeInfo.periodLabel}</p>
                  </div>
                );
              })}
            </div>

            {showBusiness ? (
              <div className="space-y-4">
                <Panel title="Business Performance" note="Completed sales are delivered order values. They are not the same as money collected.">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                    <div className="xl:col-span-3">
                      <h3 className="m-0 mb-2 text-sm font-medium text-slate-700">Sales trend</h3>
                      <SalesTrendChart points={trend} />
                    </div>
                    <div className="xl:col-span-2">
                      <h3 className="m-0 mb-3 text-sm font-medium text-slate-700">Orders by status</h3>
                      <HorizontalBars items={statusBars} formatValue={(value) => String(value)} emptyLabel="No orders in this period." />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="m-0 mb-3 text-sm font-medium text-slate-700">Brand-wise completed sales</h3>
                      <HorizontalBars items={visibleBrandBars} formatValue={formatINR} emptyLabel="No completed sales for this filter." />
                    </div>
                    <div>
                      <h3 className="m-0 mb-1 text-sm font-medium text-slate-700">Average order value</h3>
                      <p className="m-0 text-xs font-medium text-slate-500">Completed sales divided by delivered orders. Cancelled and failed orders are excluded.</p>
                      <p className="m-0 mt-3 font-mono text-2xl font-medium text-[#1A2E0A]">{aov.overall.aov === null ? '—' : formatINR(aov.overall.aov)}</p>
                      <p className="m-0 mt-1 text-xs font-medium text-slate-500">{aov.overall.deliveredCount} delivered orders in this view</p>
                      <div className="mt-3 space-y-2">
                        {visibleAov.map((item) => (
                          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="font-mono text-slate-900">{item.aov === null ? '—' : formatINR(item.aov)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Brand Comparison" note="Each amount is its own measure. Growth compares completed sales with the previous equivalent period.">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          {['Brand', 'Total Orders', 'Completed Orders', 'Cancelled Orders', 'Completed Sales', 'Customer Collections', 'Refunds', 'Platform Commission', 'Active Customers', 'Growth'].map((heading) => (
                            <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {brands.map((item) => (
                          <tr key={item.slug} className="border-b border-slate-100">
                            <td className="px-3 py-3">
                              <button type="button" className={textButtonClass} onClick={() => setBrandView(item.slug)}>
                                {item.name}
                              </button>
                              <p className="m-0 text-xs text-slate-400">{item.city}</p>
                            </td>
                            <td className="px-3 py-3">{item.totalOrders}</td>
                            <td className="px-3 py-3">{item.completedOrders}</td>
                            <td className="px-3 py-3">{item.cancelledOrders}</td>
                            <td className="px-3 py-3 font-mono">{formatINR(item.completedSales)}</td>
                            <td className="px-3 py-3 font-mono">{formatINR(item.collections)}</td>
                            <td className="px-3 py-3 font-mono">{formatINR(item.refunds)}</td>
                            <td className="px-3 py-3 font-mono">{formatINR(item.commission)}</td>
                            <td className="px-3 py-3">{item.activeCustomers}</td>
                            <td className={`px-3 py-3 font-medium ${toneClass[item.growth.tone]}`}>{item.growth.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
            ) : null}

            {showFinancial ? (
              <Panel title="Financial Reports" note="Customer collections, commission, seller payouts, refunds, and pending settlements are shown separately so they are not added into one total.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {financialCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() => openReport(card.tab, card.local)}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-[#F7941D]"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</span>
                          <Icon size={15} className="text-[#F7941D]" />
                        </span>
                        <span className="mt-2 block font-mono text-lg font-medium text-[#1A2E0A]">{card.value}</span>
                        <span className="mt-1 block text-xs font-medium text-slate-500">{card.hint}</span>
                        <span className="mt-2 block text-xs font-medium text-[#F7941D]">Open report</span>
                      </button>
                    );
                  })}
                </div>
                <p className="m-0 mt-3 text-xs font-medium text-slate-500">
                  Pending payments: {operations.pendingPayments}. Failed payments: {operations.failedPayments}. Their order values are excluded from customer collections.
                  A prepaid order that is still processing counts as a collection only, not as a completed sale or as commission.
                </p>
              </Panel>
            ) : null}

            {showPeople ? (
              <Panel title="Customers and Sellers" note="Seller catalogue size is not limited by the date range. Sales, customers, and stock follow the selected period.">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['New customers', people.newCustomers, 'First recorded in this period'],
                    ['Active customers', people.activeCustomers, 'At least one delivered order'],
                    ['Registered sellers', people.registeredSellers, 'Demonstration catalogue'],
                    ['Sellers with sales', people.sellersWithSales, 'Delivered orders in this period'],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="m-0 mt-1 font-mono text-xl text-[#1A2E0A]">{value}</p>
                      <p className="m-0 mt-1 text-xs text-slate-500">{hint}</p>
                    </div>
                  ))}
                </div>

                <h3 className="m-0 mb-2 mt-5 text-sm font-medium text-slate-700">Top sellers by completed sales</h3>
                {people.topSellers.every((seller) => seller.completedSales === 0) ? (
                  <EmptyNote>No completed sales for sellers in this period.</EmptyNote>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          {['Seller', 'Brand', 'Completed Sales', 'Orders', 'Average Order Value'].map((heading) => (
                            <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {people.topSellers.filter((seller) => seller.completedSales > 0).map((seller) => (
                          <tr key={seller.id} className="border-b border-slate-100">
                            <td className="px-3 py-2">{seller.name}</td>
                            <td className="px-3 py-2">{seller.brand}</td>
                            <td className="px-3 py-2 font-mono">{formatINR(seller.completedSales)}</td>
                            <td className="px-3 py-2">{seller.delivered}</td>
                            <td className="px-3 py-2 font-mono">{formatINR(seller.aov)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="m-0 text-sm font-medium text-slate-700">Seller purchase and stock</h3>
                    <p className="m-0 mt-1 text-xs font-medium text-slate-500">Purchase cost is separate from customer sales. Quantities are not added across kg, litres, and units.</p>
                    <p className="m-0 mt-2 text-sm text-slate-700">Purchase value {formatINR(people.purchaseValue)}</p>
                    <p className="m-0 text-sm text-slate-700">Purchased {people.purchasedQty}</p>
                    <p className="m-0 text-sm text-slate-700">Stock available {people.availableQty}</p>
                    {people.purchases.length === 0 ? (
                      <EmptyNote>No sample purchases in this period.</EmptyNote>
                    ) : (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              {['Product', 'Seller', 'Purchased', 'Available', 'Value'].map((heading) => (
                                <th key={heading} className="px-2 py-2 font-medium">{heading}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {people.purchases.map((row) => (
                              <tr key={row.id} className="border-b border-slate-100">
                                <td className="px-2 py-2">{row.product}</td>
                                <td className="px-2 py-2">{row.sellerName}</td>
                                <td className="px-2 py-2">{row.qty} {row.unit}</td>
                                <td className="px-2 py-2">{row.available} {row.unit}</td>
                                <td className="px-2 py-2 font-mono">{formatINR(row.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="m-0 text-sm font-medium text-slate-700">Customer purchase activity</h3>
                    <p className="m-0 mt-1 text-xs font-medium text-slate-500">Latest delivered orders in this view.</p>
                    {people.recentPurchases.length === 0 ? (
                      <EmptyNote>No delivered customer orders in this period.</EmptyNote>
                    ) : (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              {['Date', 'Customer', 'Brand', 'Order', 'Amount'].map((heading) => (
                                <th key={heading} className="px-2 py-2 font-medium">{heading}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {people.recentPurchases.map((order) => (
                              <tr key={order.id} className="border-b border-slate-100">
                                <td className="px-2 py-2">{formatDay(order.date)}</td>
                                <td className="px-2 py-2">{order.customerName}</td>
                                <td className="px-2 py-2">{order.brand}</td>
                                <td className="px-2 py-2">{order.id}</td>
                                <td className="px-2 py-2 font-mono">{formatINR(order.completedSale)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            ) : null}

            {showOperations ? (
              <Panel title="Operations" note="Rates use only orders in the selected period. Metrics missing from the sample are named below.">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['Delivered', operations.delivered, Package],
                    ['Processing', operations.processing, Truck],
                    ['Cancelled', operations.cancelled, RotateCcw],
                    ['Failed', operations.failed, Package],
                  ].map(([label, value, Icon]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
                        <Icon size={14} className="text-[#F7941D]" />
                      </span>
                      <p className="m-0 mt-1 font-mono text-xl text-[#1A2E0A]">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Fact label="On-time deliveries" value={operations.timingKnown ? `${operations.onTime} of ${operations.timingKnown}` : 'Not recorded'} />
                  <Fact label="Late deliveries" value={operations.timingKnown ? String(operations.late) : 'Not recorded'} />
                  <Fact label="Average delivery time" value={operations.avgDeliveryDays === null ? 'Not recorded' : `${operations.avgDeliveryDays.toFixed(1)} days`} />
                  <Fact label="Return requests" value={String(operations.returnRequests)} />
                  <Fact label="Cancellation rate" value={rateText(operations.cancellationRate)} />
                  <Fact label="Return rate" value={rateText(operations.returnRate)} />
                </div>
                <h3 className="m-0 mb-2 mt-4 text-sm font-medium text-slate-700">Refund statuses</h3>
                <div className="flex flex-wrap gap-2">
                  {operations.refundStatuses.map((item) => (
                    <span key={item.status} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {item.status}: {item.count}
                    </span>
                  ))}
                </div>
                <h3 className="m-0 mb-2 mt-4 text-sm font-medium text-slate-700">Unavailable in this demonstration dataset</h3>
                <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {UNAVAILABLE_OPS_METRICS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <section ref={detailRef} id="report-detail" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="m-0 text-base font-medium text-[#1A2E0A]">Detailed Reports</h2>
                  <p className="m-0 mt-1 text-sm font-medium text-slate-500">Each report uses the date range and brand selected above. Export includes the rows that match the filters on this report.</p>
                </div>
                <button
                  type="button"
                  onClick={exportReport}
                  disabled={!ready || !report.rows.length}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={15} className="text-[#F7941D]" /> Export this report
                </button>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {REPORT_TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setLocal('ALL');
                      setQuery('');
                      resetPage();
                    }}
                    className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${
                      tab === item.id ? 'border-[#1A2E0A] bg-[#1A2E0A] text-white' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'financial' ? (
                <p className="m-0 mt-3 text-xs font-medium text-slate-500">
                  Collected, commission, seller payout, pending settlement, and refunded are separate columns. Do not add them together.
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Search</span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      resetPage();
                    }}
                    placeholder={report.searchPlaceholder}
                    className={selectClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{report.localLabel}</span>
                  <select
                    className={selectClass}
                    value={local}
                    onChange={(event) => {
                      setLocal(event.target.value);
                      resetPage();
                    }}
                  >
                    {report.localOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {pageRows.length === 0 ? (
                <div className="mt-4">
                  <EmptyNote>No demonstration records match these filters.</EmptyNote>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        {report.columns.map((column) => (
                          <th key={column} className="px-3 py-2 font-medium">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, index) => (
                        <tr key={`${row.Order || row.Customer || row.Seller || index}`} className="border-b border-slate-100">
                          {report.columns.map((column) => (
                            <td key={column} className="px-3 py-2 text-slate-700">
                              {['Status', 'Payment', 'Refund Status'].includes(column) && row[column] !== '—' ? <Badge value={row[column]} /> : row[column]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-500">
                  Showing {pageRows.length} of {report.rows.length} filtered demo rows
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-slate-600">{safePage} / {pages}</span>
                  <button
                    type="button"
                    disabled={safePage >= pages}
                    onClick={() => setPage(safePage + 1)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {viewedBrand ? (
        <DetailDrawer
          eyebrow="Brand report"
          title={viewedBrand.name}
          subtitle={`${viewedBrand.city} · ${rangeInfo.periodLabel || 'Period not set'} · Demonstration data`}
          onClose={() => setBrandView(null)}
          wide
        >
          <p className="m-0 text-sm font-medium text-slate-500">This view stays on Reports & Analytics. Sample commission rate used for earned commission: {(viewedBrand.commissionRate * 100).toFixed(0)}%.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {viewedSummary.map((card) => (
              <Fact key={card.key} label={card.label} value={`${card.value} (${card.comparison.text})`} />
            ))}
          </div>
          <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Sellers in this sample</h3>
          {viewedPeople.topSellers.map((seller) => (
            <Fact key={seller.id} label={`${seller.name} · ${seller.store}`} value={formatINR(seller.completedSales)} />
          ))}
          <button
            type="button"
            onClick={() => {
              setBrand(viewedBrand.slug);
              setBrandView(null);
              resetPage();
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Show only this brand
          </button>
        </DetailDrawer>
      ) : null}
    </div>
  );
};
