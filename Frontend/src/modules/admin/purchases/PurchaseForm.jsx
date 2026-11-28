import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Plus, Trash2, Upload, X } from 'lucide-react';
import adminPurchaseService from '../../../services/adminPurchaseService';
import SupplierNameInput from '../../../components/SupplierNameInput';
import { Card, Notice, btnGhost, btnPrimary, inputCls } from '../../employee/components/ui';
import { Labeled, Modal, fmtMoney, parsePaise, parsePct, mulDivInt, today, METHODS } from './purchaseUi';

const newKey = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`);
const blankLine = () => ({ uid: Math.random().toString(36).slice(2), productId: '', variantSku: '', quantity: '', unitPrice: '', gst: '' });

/** Add a product that belongs to this admin's own store (no seller). Unpublished until finished in the product page. */
const QuickAdd = ({ onClose, onAdded }) => {
  const [f, setF] = useState({ name: '', sku: '', unit: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await adminPurchaseService.quickAddProduct(f); onAdded(r.product); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title="Add a product to my store" onClose={onClose} testId="qa-modal">
      <form onSubmit={save} className="space-y-3 text-sm">
        <Labeled label="Product name *"><input data-testid="qa-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labeled>
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="SKU / product code"><input data-testid="qa-sku" className={inputCls} value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Labeled>
          <Labeled label="Unit (kg, pcs...)"><input data-testid="qa-unit" className={inputCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Labeled>
        </div>
        <p className="m-0 text-[11px] text-slate-400">It is saved unpublished with stock 0, so stock can be tracked. Finish its selling details in the product page when you are ready to sell it.</p>
        {err && <Notice type="error">{err}</Notice>}
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button type="submit" data-testid="qa-save" className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Add product'}</button></div>
      </form>
    </Modal>
  );
};

export default function PurchaseForm({ onSaved }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([blankLine()]);
  const [f, setF] = useState({ supplierName: '', supplierPhone: '', supplierEmail: '', supplierAddress: '', purchaseDate: today(), discount: '', additionalExpenses: '', paymentStatus: 'PAID', paymentMethod: 'CASH', paidAmount: '', invoiceNumber: '', notes: '' });
  const [invoice, setInvoice] = useState(null);
  const [uploading, setUploading] = useState(false);
  // photos of the goods as proof: [{ key, name, mime, size, preview }]
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(0);
  const photoRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(null);
  const [quick, setQuick] = useState(false);
  const keyRef = useRef(newKey()); // one key per form: a double click or a retry can never create a second purchase
  const fileRef = useRef(null);

  const load = (q = '') => adminPurchaseService.products(q).then((r) => setProducts(r.products)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  // suppliers bought from before: choosing one fills in its saved details
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => { adminPurchaseService.suppliers().then((r) => setSuppliers(r.suppliers || [])).catch(() => {}); }, []);
  const pickSupplier = (s, { typed } = {}) => setF((x) => ({
    ...x,
    supplierName: s.name,
    // chosen from the list: use the saved details; typed in full: only fill what is still empty
    supplierPhone: typed && x.supplierPhone ? x.supplierPhone : s.phone || (typed ? x.supplierPhone : ''),
    supplierEmail: typed && x.supplierEmail ? x.supplierEmail : s.email || (typed ? x.supplierEmail : ''),
    supplierAddress: typed && x.supplierAddress ? x.supplierAddress : s.address || (typed ? x.supplierAddress : ''),
  }));
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const setLine = (uid, patch) => setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  const pickProduct = (uid, id) => {
    const p = byId[id];
    const pct = p?.taxRate ? String(p.taxRate).replace('%', '') : '';
    setLine(uid, { productId: id, variantSku: '', gst: /^\d+(\.\d{1,2})?$/.test(pct) ? pct : '' });
  };

  // live totals, in exact integer paise (the server recomputes everything and is the source of truth)
  const calc = useMemo(() => {
    let subtotal = 0; let gst = 0; let qty = 0; let ok = true;
    const rows = lines.map((l) => {
      const q = Number(l.quantity); const unit = parsePaise(l.unitPrice); const pct = parsePct(l.gst);
      if (!l.productId || !Number.isInteger(q) || q < 1 || unit === null || pct === null) { ok = false; return { sub: 0, gst: 0 }; }
      const sub = unit * q; const g = mulDivInt(sub, pct, 10000);
      subtotal += sub; gst += g; qty += q;
      return { sub, gst: g };
    });
    const disc = f.discount === '' ? 0 : parsePaise(f.discount); const extra = f.additionalExpenses === '' ? 0 : parsePaise(f.additionalExpenses);
    if (disc === null || extra === null) ok = false;
    const gross = subtotal + gst + (extra || 0);
    return { rows, subtotal, gst, qty, extra: extra || 0, disc: disc || 0, final: gross - (disc || 0), ok };
  }, [lines, f.discount, f.additionalExpenses]);

  const chooseFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('The bill must be a PDF, JPG, PNG or WEBP file.'); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setError('The bill is larger than 5 MB.'); e.target.value = ''; return; }
    setUploading(true);
    try { const r = await adminPurchaseService.uploadInvoice(file); setInvoice(r.invoiceFile); } catch (x) { setError(x.message); } finally { setUploading(false); }
  };

  const MAX_PHOTOS = 5;
  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setError('');
    const room = MAX_PHOTOS - photos.length - photoBusy;
    if (room <= 0) { setError(`You can add at most ${MAX_PHOTOS} proof photos.`); return; }
    if (files.length > room) setError(`Only ${room} more photo(s) can be added (at most ${MAX_PHOTOS}).`);
    for (const file of files.slice(0, room)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(`"${file.name}" is not a JPG, PNG or WEBP photo.`); continue; }
      if (file.size > 5 * 1024 * 1024) { setError(`"${file.name}" is larger than 5 MB.`); continue; }
      setPhotoBusy((n) => n + 1);
      try {
        const r = await adminPurchaseService.uploadProofPhoto(file);
        setPhotos((list) => [...list, { ...r.photo, preview: URL.createObjectURL(file) }]);
      } catch (x) {
        setError(x.message);
      } finally {
        setPhotoBusy((n) => n - 1);
      }
    }
  };
  const removePhoto = (key) => setPhotos((list) => {
    const gone = list.find((p) => p.key === key);
    if (gone?.preview) URL.revokeObjectURL(gone.preview);
    return list.filter((p) => p.key !== key);
  });
  useEffect(() => () => photos.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (confirmDuplicate = false) => {
    setError(''); setDup(null); setBusy(true);
    try {
      const body = {
        ...f, idempotencyKey: keyRef.current, confirmDuplicate: confirmDuplicate || undefined, invoiceFile: invoice || undefined,
        proofPhotos: photos.map(({ key, name, mime, size }) => ({ key, name, mime, size })),
        items: lines.map((l) => ({ productId: l.productId, variantSku: l.variantSku || undefined, quantity: Number(l.quantity), unitPrice: l.unitPrice, gstPercent: l.gst })),
      };
      const r = await adminPurchaseService.create(body);
      keyRef.current = newKey();
      onSaved(r.purchase, r.duplicate);
    } catch (x) {
      if (x.code === 'POSSIBLE_DUPLICATE') setDup(x.message); else setError(x.message);
    } finally { setBusy(false); }
  };

  const needPaid = f.paymentStatus === 'PARTIAL';
  return (
    <div className="space-y-4" data-testid="purchase-form">
      <Card title="Supplier">
        <div className="grid sm:grid-cols-3 gap-3">
          <Labeled label="Supplier / vendor name *"><SupplierNameInput testId="pf-supplier" className={inputCls} value={f.supplierName} onChange={(v) => setF((x) => ({ ...x, supplierName: v }))} onPick={pickSupplier} suppliers={suppliers} /></Labeled>
          <Labeled label="Contact phone"><input data-testid="pf-phone" className={inputCls} value={f.supplierPhone} onChange={(e) => setF({ ...f, supplierPhone: e.target.value })} /></Labeled>
          <Labeled label="Contact email"><input data-testid="pf-email" className={inputCls} value={f.supplierEmail} onChange={(e) => setF({ ...f, supplierEmail: e.target.value })} /></Labeled>
          <Labeled label="Address" className="sm:col-span-2"><input data-testid="pf-address" className={inputCls} value={f.supplierAddress} onChange={(e) => setF({ ...f, supplierAddress: e.target.value })} /></Labeled>
          <Labeled label="Purchase date"><input data-testid="pf-date" type="date" max={today()} className={inputCls} value={f.purchaseDate} onChange={(e) => setF({ ...f, purchaseDate: e.target.value })} /></Labeled>
        </div>
      </Card>

      <Card title="Products" action={<div className="flex gap-2"><input data-testid="pf-psearch" className={`${inputCls} !w-44`} placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} /><button type="button" data-testid="pf-quick" className={btnGhost} onClick={() => setQuick(true)}>New product</button></div>}>
        <div className="space-y-3">
          {lines.map((l, i) => {
            const p = byId[l.productId];
            return (
              <div key={l.uid} className="rounded-xl border border-slate-200 p-3 grid sm:grid-cols-12 gap-2 items-end" data-testid="pf-line">
                <Labeled label={`Product ${i + 1}`} className="sm:col-span-4"><select data-testid="pf-product" className={inputCls} value={l.productId} onChange={(e) => pickProduct(l.uid, e.target.value)}><option value="">Choose a product…</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}{x.sku ? ` (${x.sku})` : ''}</option>)}</select></Labeled>
                {p?.hasVariants && p.variants.length > 0 ? (
                  <Labeled label="Variant" className="sm:col-span-2"><select data-testid="pf-variant" className={inputCls} value={l.variantSku} onChange={(e) => setLine(l.uid, { variantSku: e.target.value })}><option value="">Choose…</option>{p.variants.map((v) => <option key={v.sku} value={v.sku}>{v.title} ({v.stock})</option>)}</select></Labeled>
                ) : <div className="sm:col-span-2 text-xs text-slate-500" data-testid="pf-sku">{p ? <>SKU: <b>{p.sku || '-'}</b><br />Stock now: <b>{p.stock}</b></> : ''}</div>}
                <Labeled label="Quantity" className="sm:col-span-1"><input data-testid="pf-qty" inputMode="numeric" className={inputCls} value={l.quantity} onChange={(e) => setLine(l.uid, { quantity: e.target.value })} /></Labeled>
                <Labeled label="Price / unit (₹)" className="sm:col-span-2"><input data-testid="pf-price" inputMode="decimal" className={inputCls} value={l.unitPrice} onChange={(e) => setLine(l.uid, { unitPrice: e.target.value })} /></Labeled>
                <Labeled label="GST %" className="sm:col-span-1"><input data-testid="pf-gst" inputMode="decimal" className={inputCls} value={l.gst} onChange={(e) => setLine(l.uid, { gst: e.target.value })} /></Labeled>
                <div className="sm:col-span-2 flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-800" data-testid="pf-linetotal">{fmtMoney(calc.rows[i].sub + calc.rows[i].gst)}</span>{lines.length > 1 && <button type="button" data-testid="pf-remove" aria-label="Remove product" className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border-0 bg-transparent cursor-pointer" onClick={() => setLines(lines.filter((x) => x.uid !== l.uid))}><Trash2 size={15} /></button>}</div>
              </div>
            );
          })}
          <button type="button" data-testid="pf-addline" className={btnGhost} onClick={() => setLines([...lines, blankLine()])}><Plus size={14} className="inline mr-1" />Add another product</button>
        </div>
      </Card>

      <Card title="Amounts and payment">
        <div className="grid sm:grid-cols-3 gap-3">
          <Labeled label="Additional expenses (₹, optional)"><input data-testid="pf-extra" inputMode="decimal" className={inputCls} value={f.additionalExpenses} onChange={(e) => setF({ ...f, additionalExpenses: e.target.value })} /></Labeled>
          <Labeled label="Discount (₹, optional)" hint="Taken off the total after GST"><input data-testid="pf-discount" inputMode="decimal" className={inputCls} value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></Labeled>
          <div className="rounded-xl bg-slate-50 p-3 text-sm" data-testid="pf-totals">
            <p className="m-0 flex justify-between"><span>Total ({calc.qty} units)</span><b data-testid="pf-subtotal">{fmtMoney(calc.subtotal)}</b></p>
            <p className="m-0 flex justify-between"><span>GST</span><b data-testid="pf-gsttotal">{fmtMoney(calc.gst)}</b></p>
            <p className="m-0 flex justify-between text-base mt-1"><span>Final amount</span><b className="text-emerald-700" data-testid="pf-final">{fmtMoney(calc.final)}</b></p>
          </div>
          <Labeled label="Payment status"><select data-testid="pf-paystatus" className={inputCls} value={f.paymentStatus} onChange={(e) => setF({ ...f, paymentStatus: e.target.value })}><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></Labeled>
          {f.paymentStatus !== 'UNPAID' && <Labeled label="Payment method"><select data-testid="pf-method" className={inputCls} value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })}>{Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Labeled>}
          {needPaid && <Labeled label="Amount paid so far (₹)"><input data-testid="pf-paid" inputMode="decimal" className={inputCls} value={f.paidAmount} onChange={(e) => setF({ ...f, paidAmount: e.target.value })} /></Labeled>}
          <Labeled label="Invoice / bill number"><input data-testid="pf-invno" className={inputCls} value={f.invoiceNumber} onChange={(e) => setF({ ...f, invoiceNumber: e.target.value })} /></Labeled>
          <div>
            <p className="m-0 text-xs font-semibold text-slate-600 mb-1">Invoice / bill file (optional)</p>
            <input ref={fileRef} data-testid="pf-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={chooseFile} className="text-xs" />
            {uploading && <p className="m-0 text-xs text-slate-500">Uploading…</p>}
            {invoice && <p className="m-0 text-xs text-emerald-700" data-testid="pf-invoice-ok"><Upload size={12} className="inline mr-1" />{invoice.name} attached</p>}
          </div>
          <div className="sm:col-span-3" data-testid="pf-proof">
            <p className="m-0 text-xs font-semibold text-slate-600 mb-1">Purchase proof photos (optional)</p>
            <p className="m-0 mb-2 text-xs text-slate-400">Photos of the goods you received, as proof of the purchase. Up to {MAX_PHOTOS} photos (JPG, PNG or WEBP, 5 MB each).</p>
            <div className="flex flex-wrap items-center gap-3">
              {photos.map((ph) => (
                <div key={ph.key} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" data-testid="pf-proof-photo">
                  <img src={ph.preview} alt={ph.name} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`Remove ${ph.name}`} data-testid="pf-proof-remove" onClick={() => removePhoto(ph.key)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-0 bg-white/90 text-rose-600 shadow cursor-pointer"><X size={14} /></button>
                </div>
              ))}
              {photoBusy > 0 && <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">Uploading…</div>}
              {photos.length + photoBusy < MAX_PHOTOS && (
                <button type="button" data-testid="pf-proof-add" onClick={() => photoRef.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/40 text-xs font-semibold text-emerald-700 cursor-pointer">
                  <Camera size={18} /> Add photo
                </button>
              )}
              <input ref={photoRef} data-testid="pf-proof-file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={addPhotos} className="hidden" />
            </div>
          </div>
          <Labeled label="Notes" className="sm:col-span-3"><textarea data-testid="pf-notes" rows={2} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Labeled>
        </div>
      </Card>

      {error && <Notice type="error"><span data-testid="pf-error">{error}</span></Notice>}
      {dup && (
        <Notice type="warning"><span data-testid="pf-dup">{dup}</span> <button type="button" data-testid="pf-dup-confirm" className={btnGhost} onClick={() => submit(true)}>Yes, record it as a second purchase</button></Notice>
      )}
      <div className="flex justify-end">
        <button type="button" data-testid="pf-submit" className={btnPrimary} disabled={busy || uploading || !calc.ok} onClick={() => submit(false)}>{busy ? 'Saving…' : `Save purchase and add ${calc.qty} unit${calc.qty === 1 ? '' : 's'} to stock`}</button>
      </div>
      {quick && <QuickAdd onClose={() => setQuick(false)} onAdded={(p) => { setQuick(false); setProducts((ps) => [p, ...ps]); setLines((ls) => { const first = ls.findIndex((x) => !x.productId); const next = [...ls]; if (first >= 0) next[first] = { ...next[first], productId: p.id }; else next.push({ ...blankLine(), productId: p.id }); return next; }); }} />}
    </div>
  );
}
