import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Boxes, CheckCircle2, ChevronLeft, ChevronRight, FileText, IndianRupee, Loader2, Paperclip, Plus, Search, ShoppingBag, Truck, X } from 'lucide-react';
import { productService, authService } from '../../../services/authService';
import { sellerPurchaseService } from '../../../services/sellerPurchaseService';
import SupplierNameInput from '../../../components/SupplierNameInput';
import { subscribeRealtime } from '../../../services/financeSocket';
import { getEffectiveStock } from '../../../utils/productStock';
import { INVOICE_ACCEPT, checkInvoiceFile, fileHref, formatFileSize } from '../../../utils/fileUrl';

const PAGE_SIZE = 10;
const todayStr = () => new Date().toISOString().slice(0, 10);
const inr = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const day = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#F7941D]';
const label = 'mb-1 block text-xs font-semibold text-slate-600';
const EMPTY = { productId: '', variantSku: '', quantity: '', unitPrice: '', supplierName: '', supplierPhone: '', invoiceNumber: '', purchaseDate: todayStr(), notes: '', addToStock: true, updateCostPrice: true };

const Purchases = () => {
  // products for the picker
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [pickerText, setPickerText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [invoice, setInvoice] = useState(null); // File chosen for the purchase being recorded
  const [attachingId, setAttachingId] = useState('');
  const [rowMsg, setRowMsg] = useState('');
  const fileInput = useRef(null);

  // history
  const [list, setList] = useState({ purchases: [], total: 0, pages: 1, summary: null, suppliers: [] });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: 'RECORDED', from: '', to: '' });
  const [reload, setReload] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const silent = useRef(false);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      let sellerData = null;
      try { const c = localStorage.getItem('savitri_seller_data'); if (c) sellerData = JSON.parse(c); } catch { /* ignore */ }
      if (!sellerData?._id) {
        const prof = await authService.getSellerProfile().catch(() => null);
        if (prof?.seller) sellerData = prof.seller;
      }
      const params = {};
      if (sellerData?._id || sellerData?.id) params.sellerId = sellerData._id || sellerData.id;
      if (sellerData?.businessName || sellerData?.ownerName) params.seller = sellerData.businessName || sellerData.ownerName;
      let all = []; let pageNo = 1; let total = null;
      for (;;) {
        const res = await productService.getProducts({ ...params, page: pageNo, limit: 100 });
        const batch = Array.isArray(res?.products) ? res.products : [];
        if (total === null && typeof res?.total === 'number') total = res.total;
        all = all.concat(batch);
        if (batch.length < 100 || (total !== null && all.length >= total) || pageNo >= 200) break;
        pageNo += 1;
      }
      setProducts(all);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const params = useMemo(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => { if (v && !(k === 'status' && v === 'ALL')) p[k] = String(v).trim(); });
    return p;
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const isSilent = silent.current; silent.current = false;
    const t = setTimeout(async () => {
      if (!isSilent) setListLoading(true);
      setListError('');
      try {
        const res = await sellerPurchaseService.list({ ...params, page, limit: PAGE_SIZE });
        if (!cancelled) setList({ purchases: res.purchases || [], total: res.total || 0, pages: res.pages || 1, summary: res.summary || null, suppliers: res.suppliers || [] });
      } catch (err) {
        if (!cancelled) setListError(err?.response?.data?.message || 'Could not load your purchases.');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }, filters.search && !isSilent ? 350 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [params, page, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live: refresh when this seller's purchases change (e.g. from another device)
  useEffect(() => {
    let t = null;
    const off = subscribeRealtime('seller', ['purchase:changed'], () => {
      clearTimeout(t);
      t = setTimeout(() => { silent.current = true; setReload((n) => n + 1); }, 300);
    });
    return () => { clearTimeout(t); off(); };
  }, []);

  const product = useMemo(() => products.find((p) => String(p._id || p.id) === form.productId) || null, [products, form.productId]);
  const activeVariants = useMemo(() => (product?.hasVariants ? (product.variants || []).filter((v) => v && v.active !== false) : []), [product]);
  const variant = activeVariants.find((v) => v.sku === form.variantSku) || null;
  const currentStock = variant ? Number(variant.stock || 0) : product ? Number(getEffectiveStock(product) || 0) : 0;
  const qty = Number(form.quantity);
  const price = Number(form.unitPrice);
  const total = Number.isFinite(qty) && Number.isFinite(price) && qty > 0 && price >= 0 ? qty * price : 0;

  const matches = useMemo(() => {
    const q = pickerText.trim().toLowerCase();
    const src = q ? products.filter((p) => `${p.name} ${p.sku || ''}`.toLowerCase().includes(q)) : products;
    return src.slice(0, 30);
  }, [products, pickerText]);

  const choose = (p) => {
    setFormError('');
    setForm((f) => ({ ...f, productId: String(p._id || p.id), variantSku: '', unitPrice: f.unitPrice || (Number(p.purchasePrice) > 0 ? String(p.purchasePrice) : '') }));
    setPickerText(p.name);
    setPickerOpen(false);
  };

  // suppliers bought from before: choosing one fills in the saved phone number
  const [suppliers, setSuppliers] = useState([]);
  const loadSuppliers = useCallback(() => sellerPurchaseService.suppliers().then((r) => setSuppliers(r.suppliers || [])).catch(() => {}), []);
  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);
  const pickSupplier = (s, { typed } = {}) => setForm((x) => ({ ...x, supplierName: s.name, supplierPhone: typed && x.supplierPhone ? x.supplierPhone : s.phone || (typed ? x.supplierPhone : '') }));

  const submit = async (e) => {
    e.preventDefault();
    setFormError(''); setNotice('');
    if (!form.productId) return setFormError('Select the product you purchased.');
    if (activeVariants.length && form.addToStock && !form.variantSku) return setFormError('Choose which variant you purchased so its stock can be updated.');
    if (!Number.isInteger(qty) || qty < 1) return setFormError('Quantity must be a whole number of at least 1.');
    if (!Number.isFinite(price) || price < 0) return setFormError('Enter the purchase price per unit.');
    if (!form.supplierName.trim()) return setFormError('Supplier name is required.');
    const fileProblem = checkInvoiceFile(invoice);
    if (fileProblem) return setFormError(fileProblem);
    setSaving(true);
    try {
      let invoiceFile;
      if (invoice) {
        try {
          invoiceFile = (await sellerPurchaseService.uploadInvoice(invoice)).invoiceFile;
        } catch (err) {
          setFormError(err?.response?.data?.message || 'The invoice could not be uploaded. The purchase was not recorded.');
          return;
        }
      }
      const res = await sellerPurchaseService.create({ ...form, quantity: qty, unitPrice: price, ...(invoiceFile ? { invoiceFile } : {}) });
      setNotice(`Purchase ${res.purchase.purchaseId} recorded${res.purchase.stockUpdated ? ` — stock is now ${res.purchase.newStock}` : ''}.`);
      setForm({ ...EMPTY, purchaseDate: form.purchaseDate, supplierName: form.supplierName, addToStock: form.addToStock, updateCostPrice: form.updateCostPrice });
      setPickerText('');
      setInvoice(null);
      if (fileInput.current) fileInput.current.value = '';
      setPage(1);
      setReload((n) => n + 1);
      loadProducts();
      loadSuppliers();
      setTimeout(() => setNotice(''), 6000);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not record this purchase.');
    } finally {
      setSaving(false);
    }
  };

  const attachLater = async (purchase, file) => {
    if (!file) return;
    setRowMsg('');
    const problem = checkInvoiceFile(file);
    if (problem) return setRowMsg(problem);
    setAttachingId(purchase._id);
    try {
      const up = await sellerPurchaseService.uploadInvoice(file);
      await sellerPurchaseService.setInvoice(purchase._id, up.invoiceFile);
      setReload((n) => n + 1);
    } catch (err) {
      setRowMsg(err?.response?.data?.message || 'Could not attach the invoice.');
    } finally {
      setAttachingId('');
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true); setCancelError('');
    try {
      await sellerPurchaseService.cancel(cancelTarget._id, cancelReason);
      setCancelTarget(null); setCancelReason('');
      setReload((n) => n + 1);
      loadProducts();
    } catch (err) {
      setCancelError(err?.response?.data?.message || 'Could not cancel this purchase.');
    } finally {
      setCancelling(false);
    }
  };

  const s = list.summary;
  const cards = [
    { l: 'Total Purchased', v: s ? inr(s.totalSpend) : '—', i: IndianRupee },
    { l: 'Purchases', v: s ? String(s.purchases) : '—', i: ShoppingBag },
    { l: 'Units Bought', v: s ? s.units.toLocaleString('en-IN') : '—', i: Boxes },
    { l: 'Suppliers', v: s ? String(s.suppliers) : '—', i: Truck },
  ];
  const setF = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="m-0 text-2xl font-bold text-slate-900">Stock Purchases</h1>
        <p className="m-0 mt-1 text-sm text-slate-500">Record what you buy from suppliers. Each purchase can add the quantity to your stock and is visible to the platform admins.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between"><p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{c.l}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]"><c.i size={15} /></span></div>
            <p className="m-0 mt-2 font-mono text-xl font-semibold text-[#1A2E0A]" data-testid="pur-card">{c.v}</p>
          </div>
        ))}
      </div>

      {/* Record a purchase */}
      <form onSubmit={submit} noValidate data-testid="pur-form" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900"><Plus size={16} className="text-[#689A2B]" /> Record a purchase</h2>
        {notice && <div data-testid="pur-notice" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"><CheckCircle2 size={15} />{notice}</div>}
        {formError && <div data-testid="pur-error" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"><AlertCircle size={15} />{formError}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <label className={label}>Product *</label>
            <input
              data-testid="pur-product"
              value={pickerText}
              onChange={(e) => { setPickerText(e.target.value); setPickerOpen(true); setForm((f) => ({ ...f, productId: '', variantSku: '' })); }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              placeholder={productsLoading ? 'Loading your products…' : 'Search your products by name or SKU'}
              className={input}
              autoComplete="off"
            />
            {pickerOpen && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {matches.length === 0 ? <div className="px-3 py-3 text-sm text-slate-500">{productsLoading ? 'Loading…' : 'No matching product in your catalogue.'}</div> : matches.map((p) => (
                  <button type="button" key={p._id || p.id} data-testid="pur-option" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)} className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-white px-3 py-2 text-left text-sm hover:bg-orange-50">
                    <span className="min-w-0 truncate font-medium text-slate-800">{p.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{p.sku || ''} · stock {getEffectiveStock(p)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {activeVariants.length > 0 && (
            <div>
              <label className={label}>Variant *</label>
              <select data-testid="pur-variant" className={input} value={form.variantSku} onChange={(e) => setForm({ ...form, variantSku: e.target.value })}>
                <option value="">Select variant</option>
                {activeVariants.map((v) => <option key={v.sku} value={v.sku}>{v.title || v.sku} (stock {Number(v.stock || 0)})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={label}>Quantity bought *</label>
            <input data-testid="pur-qty" type="number" min="1" step="1" inputMode="numeric" className={input} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 50" />
          </div>
          <div>
            <label className={label}>Price per unit (₹) *</label>
            <input data-testid="pur-price" type="number" min="0" step="0.01" inputMode="decimal" className={input} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="What you paid" />
          </div>
          <div>
            <label className={label}>Supplier *</label>
            <SupplierNameInput testId="pur-supplier" className={input} value={form.supplierName} onChange={(v) => setForm((x) => ({ ...x, supplierName: v }))} onPick={pickSupplier} suppliers={suppliers} />
          </div>
          <div>
            <label className={label}>Supplier phone</label>
            <input data-testid="pur-supplier-phone" className={input} value={form.supplierPhone} onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })} maxLength={20} placeholder="Optional" />
          </div>
          <div>
            <label className={label}>Invoice / bill no.</label>
            <input data-testid="pur-invoice" className={input} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} maxLength={60} placeholder="Optional" />
          </div>
          <div>
            <label className={label}>Purchase date *</label>
            <input data-testid="pur-date" type="date" max={todayStr()} className={input} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div className="md:col-span-2 xl:col-span-2">
            <label className={label}>Notes</label>
            <input className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <label className={label}>Attach invoice / bill</label>
            <input ref={fileInput} data-testid="pur-invoice-file" type="file" accept={INVOICE_ACCEPT} className="hidden" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              const problem = checkInvoiceFile(f);
              if (problem) { setFormError(problem); setInvoice(null); e.target.value = ''; return; }
              setFormError(''); setInvoice(f);
            }} />
            {invoice ? (
              <div data-testid="pur-invoice-chip" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-800"><FileText size={16} className="shrink-0" /><span className="truncate">{invoice.name}</span><span className="shrink-0 text-xs font-normal text-emerald-700">{formatFileSize(invoice.size)}</span></span>
                <button type="button" data-testid="pur-invoice-remove" aria-label="Remove invoice" onClick={() => { setInvoice(null); if (fileInput.current) fileInput.current.value = ''; }} className="cursor-pointer rounded-full border-none bg-white p-1 text-slate-500 hover:text-rose-600"><X size={14} /></button>
              </div>
            ) : (
              <button type="button" data-testid="pur-invoice-pick" onClick={() => fileInput.current?.click()} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-[#689A2B] hover:bg-emerald-50/40">
                <Paperclip size={15} /> Choose PDF or photo <span className="text-xs font-normal text-slate-400">(max 5 MB)</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700"><input data-testid="pur-addstock" type="checkbox" checked={form.addToStock} onChange={(e) => setForm({ ...form, addToStock: e.target.checked })} /> Add this quantity to my stock</label>
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700"><input type="checkbox" checked={form.updateCostPrice} onChange={(e) => setForm({ ...form, updateCostPrice: e.target.checked })} /> Save this price as the product's cost price</label>
          </div>
          <div className="text-right text-sm">
            <div className="text-slate-500">Total <span data-testid="pur-total" className="ml-1 font-mono text-lg font-semibold text-[#1A2E0A]">{inr(total)}</span></div>
            {product && form.addToStock && <div data-testid="pur-preview" className="text-xs text-slate-500">Stock: {currentStock} → <strong className="text-emerald-700">{currentStock + (qty > 0 ? qty : 0)}</strong></div>}
          </div>
        </div>

        <div className="flex justify-end">
          <button data-testid="pur-submit" type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none bg-[#689A2B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#557f22] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Record purchase
          </button>
        </div>
      </form>

      {/* History */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="m-0 text-base font-bold text-slate-900">My purchases</h2>{rowMsg && <p data-testid="pur-row-msg" className="m-0 mt-1 text-xs font-medium text-rose-600">{rowMsg}</p>}</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input data-testid="pur-search" type="search" value={filters.search} onChange={(e) => setF({ search: e.target.value })} placeholder="Search…" className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#F7941D]" /></div>
            <select className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setF({ status: e.target.value })}><option value="RECORDED">Recorded</option><option value="CANCELLED">Cancelled</option><option value="ALL">All</option></select>
            <input type="date" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={filters.from} onChange={(e) => setF({ from: e.target.value })} aria-label="From date" />
            <input type="date" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={filters.to} onChange={(e) => setF({ to: e.target.value })} aria-label="To date" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead><tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">{['Purchase', 'Date', 'Product', 'Qty', 'Unit price', 'Total', 'Supplier', 'Invoice', 'Status', ''].map((h) => <th key={h} className="border-b border-slate-100 px-3 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100" data-testid="pur-rows">
              {listLoading ? <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</span></td></tr>
                : listError ? <tr><td colSpan={10} className="px-4 py-12 text-center text-rose-700">{listError}</td></tr>
                : list.purchases.length === 0 ? <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">No purchases yet. Record your first restock above.</td></tr>
                : list.purchases.map((p) => (
                  <tr key={p._id} data-testid="pur-row" className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.purchaseId}{p.invoiceNumber ? <div className="text-slate-400">{p.invoiceNumber}</div> : null}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">{day(p.purchaseDate)}</td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-900">{p.productName}</div><div className="text-xs text-slate-400">{[p.variantTitle, p.sku].filter(Boolean).join(' · ')}{p.stockUpdated ? ` · stock ${p.previousStock}→${p.newStock}` : ' · record only'}</div></td>
                    <td className="px-3 py-3 font-mono">{p.quantity}</td>
                    <td className="px-3 py-3 font-mono">{inr(p.unitPrice)}</td>
                    <td className="px-3 py-3 font-mono font-semibold">{inr(p.totalAmount)}</td>
                    <td className="px-3 py-3">{p.supplierName}</td>
                    <td className="px-3 py-3">
                      {p.invoiceFile?.url ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <a data-testid="pur-invoice-link" href={fileHref(p.invoiceFile.url)} target="_blank" rel="noopener noreferrer" title={p.invoiceFile.name} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] no-underline hover:underline"><FileText size={13} /> View</a>
                          {p.status === 'RECORDED' && (
                            <label className="cursor-pointer text-[11px] text-slate-400 underline hover:text-slate-600">{attachingId === p._id ? 'Uploading…' : 'Replace'}<input type="file" data-testid="pur-replace-input" accept={INVOICE_ACCEPT} className="hidden" disabled={attachingId === p._id} onChange={(e) => { attachLater(p, e.target.files?.[0]); e.target.value = ''; }} /></label>
                          )}
                        </div>
                      ) : p.status === 'RECORDED' ? (
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-[#689A2B]">{attachingId === p._id ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />} {attachingId === p._id ? 'Uploading…' : 'Attach'}<input type="file" data-testid="pur-attach-input" accept={INVOICE_ACCEPT} className="hidden" disabled={attachingId === p._id} onChange={(e) => { attachLater(p, e.target.files?.[0]); e.target.value = ''; }} /></label>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${p.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{p.status === 'CANCELLED' ? 'Cancelled' : 'Recorded'}</span></td>
                    <td className="px-3 py-3 text-right">{p.status === 'RECORDED' && <button type="button" data-testid="pur-cancel" onClick={() => { setCancelTarget(p); setCancelReason(''); setCancelError(''); }} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Cancel</button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 p-4 text-sm">
          <span className="text-slate-500">Page {Math.min(page, list.pages)} of {list.pages} · <span data-testid="pur-total-count">{list.total}</span> records</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || listLoading} onClick={() => setPage((n) => Math.max(1, n - 1))} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
            <button type="button" disabled={page >= list.pages || listLoading} onClick={() => setPage((n) => n + 1)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {cancelTarget && (
        <div data-testid="pur-cancel-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h3 className="m-0 text-base font-bold text-slate-900">Cancel this purchase?</h3><button type="button" onClick={() => setCancelTarget(null)} className="cursor-pointer rounded-full border-none bg-slate-100 p-1.5 text-slate-500"><X size={14} /></button></div>
            <p className="mt-3 text-sm text-slate-600"><strong>{cancelTarget.productName}</strong> · {cancelTarget.quantity} units from {cancelTarget.supplierName}.{cancelTarget.stockUpdated ? ` The ${cancelTarget.quantity} units will be taken off your stock again.` : ''}</p>
            <input className={`${input} mt-3`} placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={300} />
            {cancelError && <div data-testid="pur-cancel-error" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{cancelError}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} disabled={cancelling} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Keep it</button>
              <button type="button" data-testid="pur-cancel-confirm" onClick={doCancel} disabled={cancelling} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{cancelling && <Loader2 size={13} className="animate-spin" />} Cancel purchase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
