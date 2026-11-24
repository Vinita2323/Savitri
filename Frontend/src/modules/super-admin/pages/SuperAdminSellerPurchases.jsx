import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Boxes, ChevronLeft, ChevronRight, Download, FileText, IndianRupee, Loader2, Search, ShoppingBag, Store, Truck, X,
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';
import { subscribeRealtime } from '../../../services/financeSocket';
import { fileHref } from '../../../utils/fileUrl';
import { PurchaseReportView } from '../components/seller-purchases/PurchaseReportView';
import { downloadTablePdf, pdfMoney } from '../utils/tablePdf';
import {
  DetailDrawer, Fact, PurchaseSummaryCards, selectClass, tableClass, tableWrap, tdClass, textButtonClass, thClass,
} from '../components/seller-purchases/purchaseUi';

const PAGE_SIZE = 20;
const EMPTY_FILTERS = { search: '', sellerId: '', supplier: '', category: '', status: 'RECORDED', from: '', to: '' };

const formatINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const formatDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatWhen = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const SuperAdminSellerPurchases = () => {
  const { selectedBrand, selectedBrandId } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'All Regions';
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ purchases: [], total: 0, pages: 1, summary: null, facets: { sellers: [], suppliers: [], categories: [] } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [live, setLive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [open, setOpen] = useState(null);
  const silent = useRef(false);
  // Purchases list or the weekly/monthly reports; kept in the address (?view=reports) so it survives a refresh
  const [view, setView] = useState(() => (new URLSearchParams(window.location.search).get('view') === 'reports' ? 'reports' : 'purchases'));
  const changeView = (v) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === 'reports') url.searchParams.set('view', 'reports'); else url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
  };

  const set = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  // Brand switch: forget the previous brand's data and filters
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setData((d) => ({ ...d, purchases: [], total: 0, summary: null }));
    setLoading(true);
  }, [selectedBrandId]);

  const params = useMemo(() => {
    const p = { brandId: selectedBrandId };
    Object.entries(filters).forEach(([k, v]) => { if (v && !(k === 'status' && v === 'ALL')) p[k] = typeof v === 'string' ? v.trim() : v; });
    return p;
  }, [filters, selectedBrandId]);

  useEffect(() => {
    let cancelled = false;
    const isSilent = silent.current;
    silent.current = false;
    const timer = setTimeout(async () => {
      if (!isSilent) setLoading(true);
      setError('');
      try {
        const res = await superAdminService.getSellerPurchases({ ...params, page, limit: PAGE_SIZE });
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load purchases.');
        setData({ purchases: res.purchases || [], total: res.total || 0, pages: res.pages || 1, summary: res.summary || null, facets: res.facets || { sellers: [], suppliers: [], categories: [] } });
      } catch (err) {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || 'Could not load purchases.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, filters.search && !isSilent ? 350 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [params, page, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live: a seller records or cancels a purchase → refetch quietly (the server sends content-free pings)
  useEffect(() => {
    let t = null;
    const unsubscribe = subscribeRealtime('admin', ['purchase:changed'], () => {
      clearTimeout(t);
      t = setTimeout(() => { silent.current = true; setReload((n) => n + 1); }, 300);
    }, setLive);
    return () => { clearTimeout(t); unsubscribe(); };
  }, []);

  const s = data.summary;
  const cards = [
    { label: 'Total Purchase Value', value: s ? formatINR(s.totalSpend) : '—', hint: 'Cancelled purchases excluded', icon: IndianRupee },
    { label: 'Purchases', value: s ? String(s.purchases) : '—', hint: 'Recorded restocks', icon: ShoppingBag },
    { label: 'Units Purchased', value: s ? s.units.toLocaleString('en-IN') : '—', hint: 'Total quantity bought', icon: Boxes },
    { label: 'Sellers Buying', value: s ? String(s.sellers) : '—', hint: 'Sellers with purchases', icon: Store },
    { label: 'Suppliers', value: s ? String(s.suppliers) : '—', hint: 'Unique suppliers', icon: Truck },
  ];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await superAdminService.exportSellerPurchases(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seller-purchases-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err?.response?.status === 403 ? 'You do not have permission to export.' : 'Could not export the purchases.');
    } finally {
      setExporting(false);
    }
  };

  // PDF of everything the current filters match (not only the page on screen)
  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const all = [];
      for (let pg = 1; pg <= 100; pg += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await superAdminService.getSellerPurchases({ ...params, page: pg, limit: 100 });
        if (!res?.success) throw new Error(res?.message || 'Could not load the purchases.');
        all.push(...(res.purchases || []));
        if (pg >= (res.pages || 1)) break;
      }
      const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      const recorded = all.filter((p) => p.status !== 'CANCELLED');
      const used = Object.entries(filters).filter(([, v]) => v && v !== 'ALL').map(([k, v]) => `${k}: ${v}`).join(', ');
      downloadTablePdf({
        title: `Seller Purchases - ${brandName}`,
        subtitle: used ? `Filters: ${used}` : 'All purchases',
        columns: ['Date', 'Purchase ID', 'Seller', 'Product', 'SKU', 'Qty', 'Unit price', 'Total', 'Supplier', 'Status'],
        rows: all.map((p) => [day(p.purchaseDate), p.purchaseId, p.seller?.name || '', `${p.productName}${p.variantTitle ? ` (${p.variantTitle})` : ''}`, p.sku || '', `${p.quantity}${p.unit ? ` ${p.unit}` : ''}`, pdfMoney(p.unitPrice), pdfMoney(p.totalAmount), p.supplierName, p.status === 'CANCELLED' ? 'Cancelled' : 'Recorded']),
        totals: ['Total (recorded)', '', '', '', '', String(recorded.reduce((t, p) => t + (p.quantity || 0), 0)), '', pdfMoney(recorded.reduce((t, p) => t + (p.totalAmount || 0), 0)), '', ''],
        numericColumns: [5, 6, 7],
        filename: `seller-purchases-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (err) {
      setError(err?.response?.status === 403 ? 'You do not have permission to export.' : err?.message || 'Could not export the purchases.');
    } finally {
      setExportingPdf(false);
    }
  };

  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const sel = open;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Seller Purchases — ${brandName}`}
        subtitle="Stock purchases recorded by sellers: products bought, quantities, costs and suppliers. Updates live."
        onRefresh={() => setReload((n) => n + 1)}
        refreshing={loading}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />

      <div className="w-full flex-1 space-y-5 p-4 sm:p-6">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs" role="tablist" aria-label="Seller purchases view">
          {[['purchases', 'Purchases'], ['reports', 'Weekly & Monthly Reports']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} data-testid={`sp-tab-${k}`} onClick={() => changeView(k)} className={`cursor-pointer rounded-lg border-none px-4 py-2 text-sm font-semibold transition ${view === k ? 'bg-[#1A2E0A] text-white shadow-xs' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}>{l}</button>
          ))}
        </div>

        {view === 'reports' ? (
          <PurchaseReportView brandId={selectedBrandId} facets={data.facets} reloadKey={reload} onLive={live} />
        ) : (
        <>
        <PurchaseSummaryCards cards={cards} />

        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                data-testid="sp-search"
                type="search"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
                placeholder="Search purchase ID, product, SKU, supplier, invoice..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
              />
            </div>
            <select data-testid="sp-seller" className={selectClass} value={filters.sellerId} onChange={(e) => set({ sellerId: e.target.value })}>
              <option value="">All Sellers</option>
              {data.facets.sellers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select data-testid="sp-supplier" className={selectClass} value={filters.supplier} onChange={(e) => set({ supplier: e.target.value })}>
              <option value="">All Suppliers</option>
              {data.facets.suppliers.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select data-testid="sp-category" className={selectClass} value={filters.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">All Categories</option>
              {data.facets.categories.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select data-testid="sp-status" className={selectClass} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="RECORDED">Recorded</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All statuses</option>
            </select>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">From
              <input data-testid="sp-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} className={selectClass} />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">To
              <input data-testid="sp-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className={selectClass} />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span data-testid="sp-live" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${live ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-400'}`} />{live ? 'Live' : 'Connecting…'}
            </span>
            <div className="flex gap-2">
              {dirty && (
                <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><X size={13} /> Clear filters</button>
              )}
              <button data-testid="sp-export" type="button" onClick={exportCsv} disabled={exporting || data.total === 0} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[#79B433] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#689A2B] disabled:cursor-not-allowed disabled:opacity-40">
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV
              </button>
              <button data-testid="sp-export-pdf" type="button" onClick={exportPdf} disabled={exportingPdf || data.total === 0} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#79B433] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#4d7a1c] hover:bg-[#79B433]/10 disabled:cursor-not-allowed disabled:opacity-40">
                {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass} style={{ minWidth: 1100 }}>
              <thead>
                <tr>{['Purchase', 'Date', 'Seller', 'Product', 'Qty', 'Unit Price', 'Total', 'Supplier', 'Invoice', 'Status'].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100" data-testid="sp-rows">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-14 text-center text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading purchases...</span></td></tr>
                ) : error ? (
                  <tr><td colSpan={10} className="px-4 py-14 text-center">
                    <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={16} /> {error}</p>
                    <div className="mt-3"><button type="button" onClick={() => setReload((n) => n + 1)} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700">Retry</button></div>
                  </td></tr>
                ) : data.purchases.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-14 text-center text-sm font-medium text-slate-500">{dirty ? 'No purchases match these filters.' : `No seller purchases recorded yet for ${brandName}. They appear here as soon as a seller records a restock.`}</td></tr>
                ) : (
                  data.purchases.map((p) => (
                    <tr key={p._id} data-testid="sp-row" className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono text-xs`}><button type="button" className={textButtonClass} onClick={() => setOpen(p)}>{p.purchaseId}</button></td>
                      <td className={`${tdClass} whitespace-nowrap text-xs`}>{formatDay(p.purchaseDate)}</td>
                      <td className={tdClass}>{p.seller?.name || '—'}</td>
                      <td className={tdClass}>
                        <div className="font-medium text-slate-900">{p.productName}</div>
                        <div className="text-xs text-slate-400">{[p.variantTitle, p.sku, p.category].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className={`${tdClass} font-mono`}>{p.quantity}{p.unit ? <span className="ml-1 text-xs text-slate-400">{p.unit}</span> : null}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(p.unitPrice)}</td>
                      <td className={`${tdClass} font-mono font-medium`}>{formatINR(p.totalAmount)}</td>
                      <td className={tdClass}>{p.supplierName}</td>
                      <td className={tdClass}>{p.invoiceFile?.url ? <a data-testid="sp-invoice-link" href={fileHref(p.invoiceFile.url)} target="_blank" rel="noopener noreferrer" title={p.invoiceFile.name} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] no-underline hover:underline"><FileText size={13} /> View</a> : <span className="text-slate-300">—</span>}</td>
                      <td className={tdClass}>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${p.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{p.status === 'CANCELLED' ? 'Cancelled' : 'Recorded'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 p-4 text-sm">
            <span className="font-medium text-slate-500">Page <span className="text-slate-900">{Math.min(page, data.pages)}</span> of <span className="text-slate-900">{data.pages}</span> · <span data-testid="sp-total">{data.total}</span> records</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((n) => Math.max(1, n - 1))} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
              <button type="button" disabled={page >= data.pages || loading} onClick={() => setPage((n) => n + 1)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {sel && (
        <DetailDrawer eyebrow="Seller purchase" title={sel.purchaseId} subtitle={`${sel.seller?.name || 'Seller'} · ${formatDay(sel.purchaseDate)}`} onClose={() => setOpen(null)}>
          <div data-testid="sp-detail">
            <Fact label="Product" value={sel.productName} />
            {sel.variantTitle ? <Fact label="Variant" value={sel.variantTitle} /> : null}
            <Fact label="SKU" value={sel.sku || '—'} />
            <Fact label="Category" value={sel.category || '—'} />
            <Fact label="Quantity" value={`${sel.quantity}${sel.unit ? ` ${sel.unit}` : ''}`} />
            <Fact label="Unit price" value={formatINR(sel.unitPrice)} />
            <Fact label="Total" value={formatINR(sel.totalAmount)} />
            <Fact label="Supplier" value={sel.supplierName} />
            <Fact label="Supplier phone" value={sel.supplierPhone || '—'} />
            <Fact label="Invoice no." value={sel.invoiceNumber || '—'} />
            <Fact label="Invoice file" value={sel.invoiceFile?.url ? <a data-testid="sp-detail-invoice" href={fileHref(sel.invoiceFile.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#2563eb] no-underline hover:underline"><FileText size={14} /> {sel.invoiceFile.name || 'View invoice'}</a> : 'Not attached'} />
            <Fact label="Stock added" value={sel.stockUpdated ? `Yes (${sel.previousStock} → ${sel.newStock})` : 'No (record only)'} />
            <Fact label="Seller" value={`${sel.seller?.name || '—'}${sel.seller?.city ? ` · ${sel.seller.city}` : ''}`} />
            <Fact label="Status" value={sel.status === 'CANCELLED' ? `Cancelled ${formatWhen(sel.cancelledAt)}${sel.cancelReason ? ` — ${sel.cancelReason}` : ''}` : 'Recorded'} />
            <Fact label="Recorded on" value={formatWhen(sel.createdAt)} />
            {sel.notes ? <Fact label="Notes" value={sel.notes} /> : null}
          </div>
        </DetailDrawer>
      )}
    </div>
  );
};

export default SuperAdminSellerPurchases;
