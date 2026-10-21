import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Package,
  RotateCcw,
  Search,
  Store,
  Truck,
  Users,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { PURCHASE_SELLERS } from '../data/sellerPurchaseSellersMock';
import { PURCHASE_SUPPLIERS } from '../data/sellerPurchaseSuppliersMock';
import {
  ALL_PURCHASES,
  formatDay,
  formatINR,
  formatQty,
  purchasesForSeller,
  purchasesForSupplier,
  sumByUnit,
} from '../data/sellerPurchaseSelectors';
import {
  DetailDrawer,
  Fact,
  PurchaseSummaryCards,
  demoBanner,
  selectClass,
  tableClass,
  tableWrap,
  tdClass,
  textButtonClass,
  thClass,
} from '../components/seller-purchases/purchaseUi';

const PAGE_SIZE = 10;
const CATEGORIES = [...new Set(ALL_PURCHASES.map((row) => row.category))].sort();
const BRANDS = [...new Set(PURCHASE_SELLERS.map((seller) => seller.brand))];

const EMPTY_FILTERS = {
  search: '',
  brand: 'ALL',
  sellerId: 'ALL',
  category: 'ALL',
  supplierId: 'ALL',
  startDate: '',
  endDate: '',
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const SuperAdminSellerSettlements = () => {
  const { selectedBrand } = useSuperAdmin();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, brand: selectedBrand?.name || 'ALL' });
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, brand: selectedBrand?.name || 'ALL', sellerId: 'ALL' }));
    setPage(1);
    setPanel(null);
  }, [selectedBrand?.id, selectedBrand?.name]);

  const setFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'brand' && next.sellerId !== 'ALL') {
        const seller = PURCHASE_SELLERS.find((item) => item.id === next.sellerId);
        if (!seller || (value !== 'ALL' && seller.brand !== value)) next.sellerId = 'ALL';
      }
      return next;
    });
    setPage(1);
  };

  const sellerOptions = useMemo(() => {
    return PURCHASE_SELLERS.filter((seller) => filters.brand === 'ALL' || seller.brand === filters.brand);
  }, [filters.brand]);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const rows = ALL_PURCHASES.filter((row) => {
      if (filters.brand !== 'ALL' && row.brand !== filters.brand) return false;
      if (filters.sellerId !== 'ALL' && row.sellerId !== filters.sellerId) return false;
      if (filters.category !== 'ALL' && row.category !== filters.category) return false;
      if (filters.supplierId !== 'ALL' && row.supplierId !== filters.supplierId) return false;
      if (filters.startDate && row.date < filters.startDate) return false;
      if (filters.endDate && row.date > filters.endDate) return false;
      if (!query) return true;
      return [row.id, row.product, row.sellerName, row.store, row.sellerId, row.supplierName, row.invoice]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
    const direction = sort.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sort.key === 'total') return (a.total - b.total) * direction;
      return a.date.localeCompare(b.date) * direction;
    });
    return rows;
  }, [filters, sort]);

  const summary = useMemo(() => {
    const sellers = new Set(filtered.map((row) => row.sellerId));
    const suppliers = new Set(filtered.map((row) => row.supplierId));
    const value = filtered.reduce((sum, row) => sum + row.total, 0);
    return {
      sellers: sellers.size,
      value,
      purchased: sumByUnit(filtered, 'quantity'),
      stock: sumByUnit(filtered, 'availableQty'),
      suppliers: suppliers.size,
    };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ ...EMPTY_FILTERS, brand: selectedBrand?.name || 'ALL' });
    setSort({ key: 'date', dir: 'desc' });
    setPage(1);
  };

  const exportCsv = () => {
    const headers = [
      'Purchase ID',
      'Purchase Date',
      'Brand',
      'Seller ID',
      'Seller',
      'Store',
      'Product',
      'Category',
      'Quantity',
      'Unit',
      'Unit Price',
      'Total',
      'Supplier',
      'Invoice',
      'Current Stock',
      'Deducted',
    ];
    const body = filtered.map((row) =>
      [
        row.id,
        row.date,
        row.brand,
        row.sellerId,
        row.sellerName,
        row.store,
        row.product,
        row.category,
        row.quantity,
        row.unit,
        row.unitPrice,
        row.total,
        row.supplierName,
        row.invoice,
        row.availableQty,
        row.deductedQty,
      ]
        .map(csvCell)
        .join(',')
    );
    const csv = [headers.map(csvCell).join(','), ...body].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seller-purchases.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: 'Total Sellers', value: String(summary.sellers), hint: 'Sellers in the current demo view', icon: Users },
    { label: 'Total Purchase Value', value: formatINR(summary.value), hint: 'Sum of recorded purchase costs', icon: Store },
    { label: 'Total Items Purchased', value: summary.purchased, hint: 'Kept separate by unit', icon: Package },
    { label: 'Total Stock Available', value: summary.stock, hint: 'On hand now, not the inward quantity', icon: Boxes },
    { label: 'Total Suppliers', value: String(summary.suppliers), hint: 'Unique suppliers in this view', icon: Truck },
  ];

  const openSeller = panel?.type === 'seller' ? PURCHASE_SELLERS.find((seller) => seller.id === panel.id) : null;
  const openSupplier = panel?.type === 'supplier' ? PURCHASE_SUPPLIERS.find((supplier) => supplier.id === panel.id) : null;
  const openPurchase = panel?.type === 'purchase' ? ALL_PURCHASES.find((row) => row.id === panel.id) : null;
  const sellerHistory = openSeller ? purchasesForSeller(openSeller.id) : [];
  const supplierHistory = openSupplier ? purchasesForSupplier(openSupplier.id) : [];

  const SortLabel = ({ label, sortKey }) => (
    <button type="button" onClick={() => toggleSort(sortKey)} className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-medium uppercase tracking-wider text-slate-500">
      {label}
      {sort.key === sortKey ? sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
    </button>
  );

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title="Seller Purchases"
        subtitle="Track seller purchases, purchased products, stock quantities, and supplier details across all brands."
        subtitleClassName="m-0 mt-0.5 max-w-3xl text-xs font-medium text-slate-500"
      />
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-400">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-slate-700">Seller Purchases</span>
          </nav>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 hover:bg-slate-50"
          >
            <Download size={15} className="text-[#F7941D]" /> Export CSV
          </button>
        </div>

        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{demoBanner}</p>

        <PurchaseSummaryCards cards={cards} />

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="relative sm:col-span-2 xl:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Purchase, product, seller, supplier, invoice"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select className={selectClass} value={filters.brand} onChange={(e) => setFilter('brand', e.target.value)}>
              <option value="ALL">All brands</option>
              {BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.sellerId} onChange={(e) => setFilter('sellerId', e.target.value)}>
              <option value="ALL">All sellers</option>
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.store}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select className={selectClass} value={filters.supplierId} onChange={(e) => setFilter('supplierId', e.target.value)}>
              <option value="ALL">All suppliers</option>
              {PURCHASE_SUPPLIERS.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="Purchase from"
              value={filters.startDate}
              onChange={(e) => setFilter('startDate', e.target.value)}
              className={selectClass}
            />
            <input
              type="date"
              aria-label="Purchase to"
              value={filters.endDate}
              onChange={(e) => setFilter('endDate', e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-500">
              Showing <span className="text-slate-900">{rows.length}</span> of{' '}
              <span className="text-slate-900">{filtered.length}</span> demo purchases
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
                  <th className={thClass}>Purchase ID</th>
                  <th className={thClass}>
                    <SortLabel label="Purchase Date" sortKey="date" />
                  </th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>Seller ID</th>
                  <th className={thClass}>Seller / Store</th>
                  <th className={thClass}>Product</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Qty</th>
                  <th className={thClass}>Unit</th>
                  <th className={thClass}>Unit Price</th>
                  <th className={thClass}>
                    <SortLabel label="Total" sortKey="total" />
                  </th>
                  <th className={thClass}>Supplier</th>
                  <th className={thClass}>Current Stock</th>
                  <th className={thClass}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-14 text-center">
                      <p className="m-0 text-sm font-medium text-slate-700">No purchases match these filters</p>
                      <p className="m-0 mt-1 text-sm text-slate-400">Reset the filters to see the sample purchase list.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{row.id}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDay(row.date)}</td>
                      <td className={tdClass}>{row.brand}</td>
                      <td className={tdClass}>
                        <button type="button" className={`${textButtonClass} font-mono`} onClick={() => setPanel({ type: 'seller', id: row.sellerId })}>
                          {row.sellerId}
                        </button>
                      </td>
                      <td className={tdClass}>
                        <button type="button" className={textButtonClass} onClick={() => setPanel({ type: 'seller', id: row.sellerId })}>
                          {row.sellerName}
                        </button>
                        <div className="text-xs text-slate-400">{row.store}</div>
                      </td>
                      <td className={tdClass}>{row.product}</td>
                      <td className={tdClass}>{row.category}</td>
                      <td className={`${tdClass} font-mono`}>{row.quantity}</td>
                      <td className={tdClass}>{row.unit}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(row.unitPrice)}</td>
                      <td className={`${tdClass} font-mono font-medium text-slate-900`}>{formatINR(row.total)}</td>
                      <td className={tdClass}>
                        <button type="button" className={textButtonClass} onClick={() => setPanel({ type: 'supplier', id: row.supplierId })}>
                          {row.supplierName}
                        </button>
                        <div className="font-mono text-xs text-slate-400">{row.supplierId}</div>
                      </td>
                      <td className={`${tdClass} font-mono`}>{formatQty(row.availableQty, row.unit)}</td>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() => setPanel({ type: 'purchase', id: row.id })}
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

      {openSeller ? (
        <DetailDrawer
          wide
          eyebrow="Demo seller"
          title={openSeller.name}
          subtitle={`${openSeller.store} · ${openSeller.brand}`}
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Seller information</h3>
              <Fact label="Seller ID" value={openSeller.id} />
              <Fact label="Seller name" value={openSeller.name} />
              <Fact label="Store" value={openSeller.store} />
              <Fact label="Brand" value={openSeller.brand} />
              <Fact label="Phone" value={openSeller.phone} />
              <Fact label="Email" value={openSeller.email} />
              <Fact label="Address" value={openSeller.address} />
            </section>
            <section>
              <h3 className="m-0 text-sm font-medium text-[#1A2E0A]">Purchase summary</h3>
              <Fact label="Purchase records" value={String(sellerHistory.length)} />
              <Fact label="Purchase value" value={formatINR(sellerHistory.reduce((sum, row) => sum + row.total, 0))} />
              <Fact label="Quantity purchased" value={sumByUnit(sellerHistory, 'quantity')} />
              <Fact label="Suppliers used" value={String(new Set(sellerHistory.map((row) => row.supplierId)).size)} />
              <Fact label="Current stock" value={sumByUnit(sellerHistory, 'availableQty')} />
            </section>
          </div>
          <section>
            <h3 className="m-0 mb-2 text-sm font-medium text-[#1A2E0A]">Purchase history</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {['Purchase', 'Date', 'Product', 'Category', 'Qty', 'Unit price', 'Total', 'Supplier', 'Invoice', 'Stock'].map((heading) => (
                      <th key={heading} className={thClass}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellerHistory.map((row) => (
                    <tr key={row.id}>
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{row.id}</td>
                      <td className={tdClass}>{formatDay(row.date)}</td>
                      <td className={tdClass}>{row.product}</td>
                      <td className={tdClass}>{row.category}</td>
                      <td className={tdClass}>{formatQty(row.quantity, row.unit)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(row.unitPrice)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(row.total)}</td>
                      <td className={tdClass}>{row.supplierName}</td>
                      <td className={`${tdClass} font-mono text-xs`}>{row.invoice}</td>
                      <td className={tdClass}>{formatQty(row.availableQty, row.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </DetailDrawer>
      ) : null}

      {openPurchase ? (
        <DetailDrawer
          eyebrow="Demo purchase"
          title={openPurchase.product}
          subtitle={`${openPurchase.id} · ${formatDay(openPurchase.date)}`}
          onClose={() => setPanel(null)}
        >
          <Fact label="Purchase ID" value={openPurchase.id} />
          <Fact label="Purchase date" value={formatDay(openPurchase.date)} />
          <Fact label="Brand" value={openPurchase.brand} />
          <Fact label="Seller" value={`${openPurchase.sellerName} (${openPurchase.sellerId})`} />
          <Fact label="Store" value={openPurchase.store} />
          <Fact label="Product" value={openPurchase.product} />
          <Fact label="Category" value={openPurchase.category} />
          <Fact label="Quantity purchased" value={formatQty(openPurchase.purchasedQty, openPurchase.unit)} />
          <Fact label="Unit" value={openPurchase.unit} />
          <Fact label="Unit price" value={formatINR(openPurchase.unitPrice)} />
          <Fact label="Total purchase amount" value={formatINR(openPurchase.total)} />
          <Fact label="Supplier" value={`${openPurchase.supplierName} (${openPurchase.supplierId})`} />
          <Fact label="Supplier phone" value={openPurchase.supplier?.phone || '—'} />
          <Fact label="Supplier email" value={openPurchase.supplier?.email || '—'} />
          <Fact label="Invoice" value={openPurchase.invoice} />
          <Fact label="Current stock" value={formatQty(openPurchase.availableQty, openPurchase.unit)} />
          <Fact label="Sold or deducted" value={formatQty(openPurchase.deductedQty, openPurchase.unit)} />
          <p className="m-0 text-sm text-slate-600">{openPurchase.notes}</p>
        </DetailDrawer>
      ) : null}

      {openSupplier ? (
        <DetailDrawer
          wide
          eyebrow="Demo supplier"
          title={openSupplier.name}
          subtitle={openSupplier.business}
          onClose={() => setPanel(null)}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <Fact label="Supplier ID" value={openSupplier.id} />
              <Fact label="Business" value={openSupplier.business} />
              <Fact label="Phone" value={openSupplier.phone} />
              <Fact label="Email" value={openSupplier.email} />
              <Fact label="Address" value={openSupplier.address} />
            </section>
            <section>
              <Fact label="Purchases" value={String(supplierHistory.length)} />
              <Fact label="Purchase value" value={formatINR(supplierHistory.reduce((sum, row) => sum + row.total, 0))} />
              <Fact label="Products supplied" value={[...new Set(supplierHistory.map((row) => row.product))].join(', ') || '—'} />
            </section>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  {['Purchase', 'Date', 'Seller', 'Product', 'Qty', 'Total', 'Invoice'].map((heading) => (
                    <th key={heading} className={thClass}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierHistory.map((row) => (
                  <tr key={row.id}>
                    <td className={`${tdClass} font-mono text-[#F7941D]`}>{row.id}</td>
                    <td className={tdClass}>{formatDay(row.date)}</td>
                    <td className={tdClass}>{row.store}</td>
                    <td className={tdClass}>{row.product}</td>
                    <td className={tdClass}>{formatQty(row.quantity, row.unit)}</td>
                    <td className={`${tdClass} font-mono`}>{formatINR(row.total)}</td>
                    <td className={`${tdClass} font-mono text-xs`}>{row.invoice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailDrawer>
      ) : null}
    </div>
  );
};
