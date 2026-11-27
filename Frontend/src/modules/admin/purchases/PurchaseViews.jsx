import React, { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Lock } from 'lucide-react';
import adminPurchaseService from '../../../services/adminPurchaseService';
import { downloadPurchasePdf } from './purchasePdf';
import { downloadTablePdf, pdfMoney } from '../../super-admin/utils/tablePdf';
import { Card, Empty, Notice, Spinner, btnGhost, btnPrimary, btnDanger, inputCls } from '../../employee/components/ui';
import { Drawer, Labeled, Modal, Pager, Stat, PayChip, StatusChip, fmtMoney, fmtDate, fmtDateTime, useDebounced, METHODS, today } from './purchaseUi';

const monthStart = () => `${today().slice(0, 7)}-01`;
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

/** shows a stored file from a temporary in-memory URL (no token in any link) */
const FileModal = ({ title, loader, mime, onClose }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let made = '';
    loader().then((b) => { made = URL.createObjectURL(b); setUrl(made); }).catch((e) => setError(e.message));
    return () => { if (made) URL.revokeObjectURL(made); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal title={title} onClose={onClose} wide testId="file-modal">
      {error && <p className="m-0 text-sm text-rose-700" data-testid="file-error">{error}</p>}
      {!url && !error && <p className="m-0 text-sm text-slate-500">Opening…</p>}
      {url && (mime === 'application/pdf' ? <iframe title={title} data-testid="file-pdf" src={url} className="w-full h-[70vh] rounded-xl border border-slate-200" /> : <img data-testid="file-image" src={url} alt={title} className="max-w-full max-h-[70vh] mx-auto rounded-xl" />)}
    </Modal>
  );
};

const Table = ({ children, testId }) => <div className="overflow-x-auto -mx-5 -my-5"><table className="w-full text-sm" data-testid={testId}>{children}</table></div>;
const TH = ({ children, right }) => <th className={`px-3 py-3 font-semibold ${right ? 'text-right' : ''}`}>{children}</th>;
const headCls = 'bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500';

// ───────────────────────── dashboard ─────────────────────────

export function Dashboard({ go }) {
  const [f, setF] = useState({ from: monthStart(), to: today(), period: 'day' });
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); adminPurchaseService.dashboard(f).then(setD).catch((e) => setError(e.message)); }, [f]);
  const series = (rows, tid) => (rows.length === 0 ? <Empty>No purchases in this range.</Empty> : (
    <Table testId={tid}><thead><tr className={headCls}><TH>Period</TH><TH right>Purchases</TH><TH right>Units</TH><TH right>Amount</TH></tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((r) => <tr key={r._id}><td className="px-3 py-2">{r.label}</td><td className="px-3 py-2 text-right">{r.purchases}</td><td className="px-3 py-2 text-right">{r.quantity}</td><td className="px-3 py-2 text-right font-semibold">{fmtMoney(r.amount)}</td></tr>)}</tbody></Table>
  ));
  return (
    <div className="space-y-5" data-testid="pd">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="pd-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => e.target.value && setF({ ...f, from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="pd-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => e.target.value && setF({ ...f, to: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Summary by<select data-testid="pd-period" className={`${inputCls} mt-1`} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label>
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!d && !error && <Spinner />}
      {d && (
        <>
          <div>
            <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">My store purchases</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="pd-mine">
              <Stat label="Total admin purchases" value={d.myStore.purchases} testId="pd-m-count" />
              <Stat label="Total purchase amount" value={fmtMoney(d.myStore.amountPaise)} tone="green" testId="pd-m-amount" />
              <Stat label="Total purchased quantity" value={d.myStore.quantity} testId="pd-m-qty" />
              <Stat label="Still to pay suppliers" value={fmtMoney(d.myStore.outstandingPaise)} tone="amber" testId="pd-m-out" />
            </div>
          </div>
          <div>
            <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">Associated sellers <span className="inline-flex items-center gap-1 normal-case font-semibold text-slate-400"><Lock size={11} /> read only, reported separately</span></p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="pd-sellers">
              <Stat label="Total associated sellers" value={d.sellers.associatedSellers} testId="pd-s-sellers" />
              <Stat label="Total seller purchases" value={d.sellers.purchases} testId="pd-s-count" />
              <Stat label="Total seller purchase amount" value={fmtMoney(d.sellers.amountPaise)} tone="blue" testId="pd-s-amount" />
              <Stat label="Units bought by sellers" value={d.sellers.quantity} testId="pd-s-qty" />
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="My store: summary by period">{series(d.myStoreSeries, 'pd-my-series')}</Card>
            <Card title="Associated sellers: summary by period">{series(d.sellerSeries, 'pd-seller-series')}</Card>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Recent purchases (my store)" action={<button type="button" className={btnGhost} onClick={() => go('history')}>View all</button>}>
              {d.recentMine.length === 0 ? <Empty>No purchases yet.</Empty> : <ul className="m-0 p-0 list-none divide-y divide-slate-100 text-sm" data-testid="pd-recent-mine">{d.recentMine.map((p) => <li key={p.id} className="py-2 flex justify-between gap-3"><span><b>{p.purchaseId}</b> · {p.supplierName}<br /><span className="text-xs text-slate-500">{p.productsText}</span></span><span className="text-right whitespace-nowrap font-semibold">{fmtMoney(p.finalPaise)}</span></li>)}</ul>}
            </Card>
            <Card title="Recent seller purchases" action={<button type="button" className={btnGhost} onClick={() => go('sellers')}>View all</button>}>
              {d.recentSellerPurchases.length === 0 ? <Empty>No seller purchases yet.</Empty> : <ul className="m-0 p-0 list-none divide-y divide-slate-100 text-sm" data-testid="pd-recent-sellers">{d.recentSellerPurchases.map((p) => <li key={p.id} className="py-2 flex justify-between gap-3"><span><b>{p.purchaseId}</b> · {p.sellerName}<br /><span className="text-xs text-slate-500">{p.productName} × {p.quantity}</span></span><span className="text-right whitespace-nowrap font-semibold">{fmtMoney(p.amountPaise)}</span></li>)}</ul>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── my purchase details ─────────────────────────

export function PurchaseDetail({ id, onClose, onChanged, fetcher = adminPurchaseService.get, canCancel = true, invoiceLoader }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [ask, setAsk] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(false);
  const load = useCallback(() => fetcher(id).then(setD).catch((e) => setError(e.message)), [id, fetcher]);
  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    if (!reason.trim()) { setError('Give a reason for cancelling.'); return; }
    setBusy(true); setError('');
    try { await adminPurchaseService.cancel(id, reason.trim()); setAsk(false); setReason(''); setMsg('Purchase cancelled and its stock reversed.'); await load(); onChanged?.(); } catch (e) { setError(e.message); setAsk(false); } finally { setBusy(false); }
  };
  const download = async () => {
    try { const b = await (invoiceLoader || ((x) => adminPurchaseService.invoiceBlob(id, x)))(true); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = d.purchase.invoiceFile?.name || 'invoice'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); } catch (e) { setError(e.message); }
  };
  const p = d?.purchase;
  return (
    <Drawer title={p ? `${p.purchaseId} · ${p.supplierName}` : 'Purchase'} subtitle={p ? `${p.storeName} · ${fmtDate(p.purchaseDate)}` : ''} onClose={onClose} testId="pur-drawer">
      {!d && !error && <Spinner />}
      {error && <Notice type="error"><span data-testid="pur-error">{error}</span></Notice>}
      {msg && <Notice type="success">{msg}</Notice>}
      {p && (
        <div className="space-y-5 mt-3" data-testid="pur-detail">
          <div className="flex flex-wrap items-center gap-2"><StatusChip status={p.status} /><PayChip status={p.paymentStatus} />{p.paymentMethod && <span className="text-xs text-slate-500">{METHODS[p.paymentMethod]}</span>}
            <button data-perm="purchases.export" type="button" data-testid="pur-pdf" className={`${btnGhost} ml-auto`} onClick={() => { try { downloadPurchasePdf(d); } catch (e) { setError(`Could not create the PDF: ${e.message}`); } }}><Download size={14} className="inline mr-1" />Download PDF</button></div>
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div><p className="m-0 text-[11px] text-slate-500">Supplier</p><p className="m-0 font-bold">{p.supplierName}</p><p className="m-0 text-xs text-slate-500">{[p.supplierPhone, p.supplierEmail].filter(Boolean).join(' · ')}</p>{p.supplierAddress && <p className="m-0 text-xs text-slate-500">{p.supplierAddress}</p>}</div>
            <div><p className="m-0 text-[11px] text-slate-500">Invoice no.</p><p className="m-0 font-bold">{p.invoiceNumber || '-'}</p></div>
            <div><p className="m-0 text-[11px] text-slate-500">Recorded</p><p className="m-0 font-bold">{fmtDateTime(p.createdAt)}</p></div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" data-testid="pur-lines">
              <thead><tr className={headCls}><TH>Product</TH><TH>SKU</TH><TH right>Qty</TH><TH right>Price</TH><TH right>GST</TH><TH right>Amount</TH><TH right>Stock before</TH><TH right>Stock after</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">{p.lines.map((l, i) => <tr key={i} data-testid="pur-line"><td className="px-3 py-2 font-semibold">{l.productName}{l.variantTitle && <span className="text-xs text-slate-500"> ({l.variantTitle})</span>}</td><td className="px-3 py-2">{l.sku || '-'}</td><td className="px-3 py-2 text-right">{l.quantity}</td><td className="px-3 py-2 text-right">{fmtMoney(l.unitPricePaise)}</td><td className="px-3 py-2 text-right">{fmtMoney(l.gstPaise)}</td><td className="px-3 py-2 text-right font-semibold">{fmtMoney(l.subtotalPaise + l.gstPaise)}</td><td className="px-3 py-2 text-right" data-testid="pur-prev">{l.previousStock ?? '-'}</td><td className="px-3 py-2 text-right" data-testid="pur-new">{l.newStock ?? '-'}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs text-sm space-y-1" data-testid="pur-totals">
            <p className="m-0 flex justify-between"><span>Subtotal</span><span>{fmtMoney(p.subtotalPaise)}</span></p>
            <p className="m-0 flex justify-between"><span>GST</span><span>{fmtMoney(p.gstPaise)}</span></p>
            <p className="m-0 flex justify-between"><span>Additional expenses</span><span>{fmtMoney(p.additionalExpensesPaise)}</span></p>
            <p className="m-0 flex justify-between"><span>Discount</span><span>-{fmtMoney(p.discountPaise)}</span></p>
            <p className="m-0 flex justify-between font-extrabold text-base border-t pt-1"><span>Final amount</span><span data-testid="pur-final">{fmtMoney(p.finalPaise)}</span></p>
            <p className="m-0 flex justify-between"><span>Paid</span><span>{fmtMoney(p.paidPaise)}</span></p>
            <p className="m-0 flex justify-between font-bold"><span>Balance</span><span>{fmtMoney(p.balancePaise)}</span></p>
          </div>
          {p.notes && <p className="m-0 text-sm text-slate-600">Notes: {p.notes}</p>}
          {p.invoiceFile && (
            <div className="flex flex-wrap items-center gap-2" data-testid="pur-invoice">
              <span className="text-sm">Bill: <b>{p.invoiceFile.name}</b></span>
              <button type="button" data-testid="pur-invoice-view" className={btnGhost} onClick={() => setFile(true)}><Eye size={14} className="inline mr-1" />View</button>
              <button type="button" data-testid="pur-invoice-dl" className={btnGhost} onClick={download}><Download size={14} className="inline mr-1" />Download</button>
            </div>
          )}
          {p.status === 'CANCELLED' && <Notice type="warning">Cancelled {fmtDateTime(p.cancelledAt)} by {p.cancelledBy}: {p.cancelReason}. The stock was taken back out.</Notice>}
          {canCancel && p.status === 'RECORDED' && <button data-perm="purchases.edit" type="button" data-testid="pur-cancel" className={btnDanger} onClick={() => { setError(''); setAsk(true); }}>Cancel purchase and reverse stock</button>}
          {d.movements?.length > 0 && (
            <div>
              <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Stock movements (permanent record)</p>
              <table className="w-full text-xs" data-testid="pur-movements"><thead><tr className="text-left uppercase text-slate-500"><th className="py-1">When</th><th>Type</th><th>Product</th><th className="text-right">Change</th><th className="text-right">Before</th><th className="text-right">After</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{d.movements.map((m) => <tr key={m.id} data-testid="pur-move"><td className="py-1">{fmtDateTime(m.at)}</td><td>{m.type.replace('PURCHASE_', '').toLowerCase()}</td><td>{m.productName}</td><td className={`text-right font-bold ${m.change > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{m.change > 0 ? '+' : ''}{m.change}</td><td className="text-right">{m.previousStock ?? '-'}</td><td className="text-right">{m.newStock ?? '-'}</td></tr>)}</tbody></table>
            </div>
          )}
          <div>
            <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">History</p>
            <ul className="m-0 p-0 list-none text-xs text-slate-600 space-y-1">{[...p.history].reverse().map((h, i) => <li key={i}><b>{h.action.toLowerCase().replace('_', ' ')}</b> · {h.by} · {fmtDateTime(h.at)}{h.note ? ` · ${h.note}` : ''}</li>)}</ul>
          </div>
        </div>
      )}
      {ask && (
        <Modal title="Cancel this purchase?" onClose={() => setAsk(false)} testId="pur-ask" footer={<><button data-perm="purchases.edit" type="button" className={btnGhost} onClick={() => setAsk(false)}>Keep it</button><button data-perm="purchases.edit" type="button" data-testid="pur-ask-ok" className={btnPrimary} disabled={busy} onClick={cancel}>Cancel purchase</button></>}>
          <p className="m-0 mb-3 text-sm text-slate-600">The stock this purchase added will be taken back. This only works if that stock has not been sold or removed.</p>
          <Labeled label="Reason (kept in the history)"><textarea data-testid="pur-ask-text" rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
        </Modal>
      )}
      {file && p?.invoiceFile && <FileModal title={p.invoiceFile.name} mime={p.invoiceFile.mime} loader={() => (invoiceLoader || ((x) => adminPurchaseService.invoiceBlob(id, x)))(false)} onClose={() => setFile(false)} />}
    </Drawer>
  );
}

// ───────────────────────── my purchase history ─────────────────────────

export function History({ version, onChanged, listFn = adminPurchaseService.list, detailFetcher, showAdmin = false, extraFilters = null, readOnlyDetail = false, adminOptions = [], invoiceLoaderFor }) {
  const [f, setF] = useState({ search: '', status: '', paymentStatus: '', from: '', to: '', adminId: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const search = useDebounced(f.search);
  const load = useCallback(() => { setError(''); return listFn({ ...f, search, page, limit: 20 }).then(setData).catch((e) => setError(e.message)); }, [f.status, f.paymentStatus, f.from, f.to, f.adminId, search, page, version, listFn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const set = (p) => { setF({ ...f, ...p }); setPage(1); };
  const [pdfBusy, setPdfBusy] = useState(false);
  // PDF of every purchase the current filters match (not only the page on screen)
  const exportPdf = async () => {
    setPdfBusy(true); setError('');
    try {
      const all = [];
      for (let pg = 1; pg <= 100; pg += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await listFn({ ...f, search, page: pg, limit: 100 });
        all.push(...(res.purchases || []));
        if (pg >= (res.pages || 1)) break;
      }
      const rec = all.filter((p) => p.status === 'RECORDED');
      const money = (paise) => pdfMoney((Number(paise) || 0) / 100);
      const adminName = (data?.admins || adminOptions).find((a) => a.id === f.adminId)?.name;
      const used = Object.entries({ ...f, search, adminId: adminName || '' }).filter(([, v]) => v).map(([k, v]) => `${k === 'adminId' ? 'admin' : k === 'paymentStatus' ? 'payment' : k}: ${v}`).join(', ');
      const units = rec.reduce((t, p) => t + (p.totalQuantity || 0), 0);
      const grand = rec.reduce((t, p) => t + (p.finalPaise || 0), 0);
      const admin = (p) => (showAdmin ? [p.adminName || ''] : []);
      downloadTablePdf({
        title: showAdmin ? 'Admin Purchases' : 'My Store Purchases',
        subtitle: `${used ? `Filters: ${used}. ` : 'All purchases. '}Recorded purchases: ${rec.length}  |  Total items purchased: ${units}  |  Total amount: ${money(grand)}`,
        columns: ['Date', 'Purchase ID', ...(showAdmin ? ['Admin'] : []), 'Supplier', 'Products', 'Qty', 'Amount', 'Payment', 'Status'],
        rows: all.map((p) => [fmtDate(p.purchaseDate), p.purchaseId, ...admin(p), p.supplierName, p.productsText || '', String(p.totalQuantity ?? ''), money(p.finalPaise), p.paymentStatus, p.status]),
        totals: ['Total (recorded)', '', ...(showAdmin ? [''] : []), '', '', String(units), money(grand), '', ''],
        numericColumns: [showAdmin ? 5 : 4, showAdmin ? 6 : 5],
        filename: `${showAdmin ? 'admin' : 'my'}-purchases-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (e) { setError(e.message || 'Could not create the PDF.'); } finally { setPdfBusy(false); }
  };
  return (
    <div className="space-y-4" data-testid="history">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500 flex-1 min-w-[180px]">Search<input data-testid="h-search" className={`${inputCls} mt-1`} placeholder="Purchase ID, supplier, product, SKU" value={f.search} onChange={(e) => set({ search: e.target.value })} /></label>
          {showAdmin && <label className="text-xs font-semibold text-slate-500">Admin<select data-testid="h-admin" className={`${inputCls} mt-1`} value={f.adminId} onChange={(e) => set({ adminId: e.target.value })}><option value="">All admins</option>{(data?.admins || adminOptions).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          <label className="text-xs font-semibold text-slate-500">Status<select data-testid="h-status" className={`${inputCls} mt-1`} value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">All</option><option value="RECORDED">Recorded</option><option value="CANCELLED">Cancelled</option></select></label>
          <label className="text-xs font-semibold text-slate-500">Payment<select data-testid="h-pay" className={`${inputCls} mt-1`} value={f.paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })}><option value="">All</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></label>
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="h-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="h-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
          {extraFilters}
          <button data-perm="purchases.export" type="button" data-testid="h-export-pdf" disabled={pdfBusy || !data?.purchases?.length} onClick={exportPdf} className={`${btnGhost} disabled:opacity-50`}><Download size={14} className="inline mr-1" />{pdfBusy ? 'Preparing...' : 'Export PDF'}</button>
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="h-summary">
            <Stat label="Purchases" value={data.summary.purchases} testId="h-s-count" />
            <Stat label="Amount" value={fmtMoney(data.summary.amountPaise)} tone="green" testId="h-s-amount" />
            <Stat label="Units" value={data.summary.quantity} testId="h-s-qty" />
            <Stat label={showAdmin ? 'Admins' : 'Still to pay'} value={showAdmin ? data.summary.admins : fmtMoney(data.summary.outstandingPaise)} tone="amber" testId="h-s-extra" />
          </div>
          <Card>
            {data.purchases.length === 0 ? <Empty>No purchases found.</Empty> : (
              <Table testId="h-table">
                <thead><tr className={headCls}><TH>Purchase</TH>{showAdmin && <TH>Admin</TH>}<TH>Supplier</TH><TH>Products</TH><TH>Date</TH><TH right>Qty</TH><TH right>Amount</TH><TH>Payment</TH><TH>Status</TH><TH /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.purchases.map((p) => (
                    <tr key={p.id} data-testid="h-row" data-id={p.purchaseId} data-status={p.status}>
                      <td className="px-3 py-3 font-bold whitespace-nowrap">{p.purchaseId}</td>
                      {showAdmin && <td className="px-3 py-3">{p.adminName}</td>}
                      <td className="px-3 py-3">{p.supplierName}</td>
                      <td className="px-3 py-3 text-xs text-slate-500 max-w-[220px] truncate">{p.productsText}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{fmtDate(p.purchaseDate)}</td>
                      <td className="px-3 py-3 text-right">{p.totalQuantity}</td>
                      <td className="px-3 py-3 text-right font-semibold">{fmtMoney(p.finalPaise)}</td>
                      <td className="px-3 py-3"><PayChip status={p.paymentStatus} /></td>
                      <td className="px-3 py-3"><StatusChip status={p.status} /></td>
                      <td className="px-3 py-3 text-right"><button type="button" data-testid="h-open" className={btnGhost} onClick={() => setOpen(p.id)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
      {open && <PurchaseDetail id={open} onClose={() => setOpen(null)} onChanged={() => { load(); onChanged?.(); }} fetcher={detailFetcher || adminPurchaseService.get} canCancel={!readOnlyDetail} invoiceLoader={invoiceLoaderFor ? (x) => invoiceLoaderFor(open, x) : undefined} />}
    </div>
  );
}

// ───────────────────────── stock updates ─────────────────────────

export function StockUpdates({ version }) {
  const [f, setF] = useState({ search: '', type: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const search = useDebounced(f.search);
  useEffect(() => { setError(''); adminPurchaseService.stockUpdates({ ...f, search, page, limit: 25 }).then(setData).catch((e) => setError(e.message)); }, [f.type, f.from, f.to, search, page, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p) => { setF({ ...f, ...p }); setPage(1); };
  return (
    <div className="space-y-4" data-testid="stock">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500 flex-1 min-w-[180px]">Search<input data-testid="st-search" className={`${inputCls} mt-1`} placeholder="Product, SKU or purchase ID" value={f.search} onChange={(e) => set({ search: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Type<select data-testid="st-type" className={`${inputCls} mt-1`} value={f.type} onChange={(e) => set({ type: e.target.value })}><option value="">All</option><option value="PURCHASE">Purchase (added)</option><option value="PURCHASE_REVERSAL">Reversal (taken back)</option><option value="PURCHASE_ROLLBACK">Rollback</option></select></label>
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="st-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="st-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <Card>
          {data.movements.length === 0 ? <Empty>No stock updates yet.</Empty> : (
            <Table testId="st-table"><thead><tr className={headCls}><TH>When</TH><TH>Purchase</TH><TH>Product</TH><TH>SKU</TH><TH>Type</TH><TH right>Change</TH><TH right>Previous</TH><TH right>Updated</TH><TH>By</TH></tr></thead>
              <tbody className="divide-y divide-slate-100">{data.movements.map((m) => <tr key={m.id} data-testid="st-row" data-type={m.type}><td className="px-3 py-2.5 whitespace-nowrap">{fmtDateTime(m.at)}</td><td className="px-3 py-2.5 font-bold">{m.purchaseId}</td><td className="px-3 py-2.5">{m.productName}</td><td className="px-3 py-2.5">{m.variantSku || m.sku || '-'}</td><td className="px-3 py-2.5">{m.type.replace('PURCHASE_', '').toLowerCase()}</td><td className={`px-3 py-2.5 text-right font-bold ${m.change > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{m.change > 0 ? '+' : ''}{m.change}</td><td className="px-3 py-2.5 text-right">{m.previousStock ?? '-'}</td><td className="px-3 py-2.5 text-right font-semibold">{m.newStock ?? '-'}</td><td className="px-3 py-2.5">{m.by}</td></tr>)}</tbody></Table>
          )}
        </Card>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}

// ───────────────────────── associated seller purchases (read only) ─────────────────────────

const SellerPurchaseDetail = ({ id, onClose }) => {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { adminPurchaseService.sellerPurchase(id).then(setD).catch((e) => setError(e.message)); }, [id]);
  const p = d?.purchase;
  return (
    <Drawer title={p ? `${p.purchaseId} · ${p.seller.name}` : 'Seller purchase'} subtitle={p ? `${p.seller.storeName} · ${fmtDate(p.purchaseDate)} · read only` : ''} onClose={onClose} testId="sp-drawer">
      {!d && !error && <Spinner />}
      {error && <Notice type="error">{error}</Notice>}
      {p && (
        <div className="space-y-4 mt-3" data-testid="sp-detail">
          <div className="flex items-center gap-2"><StatusChip status={p.status} /><PayChip status={p.paymentStatus} /><span className="text-xs text-slate-500 inline-flex items-center gap-1"><Lock size={11} /> You can view this purchase but not change it.</span></div>
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div><p className="m-0 text-[11px] text-slate-500">Seller</p><p className="m-0 font-bold">{p.seller.name}</p><p className="m-0 text-xs text-slate-500">{p.seller.storeName} · {p.seller.phone}</p></div>
            <div><p className="m-0 text-[11px] text-slate-500">Supplier</p><p className="m-0 font-bold">{p.supplierName}</p><p className="m-0 text-xs text-slate-500">{p.supplierPhone}</p></div>
            <div><p className="m-0 text-[11px] text-slate-500">Invoice no.</p><p className="m-0 font-bold">{p.invoiceNumber || '-'}</p></div>
          </div>
          <table className="w-full text-sm rounded-xl border border-slate-200" data-testid="sp-products"><thead><tr className={headCls}><TH>Product</TH><TH>SKU</TH><TH right>Qty</TH><TH right>Price</TH><TH right>Amount</TH></tr></thead>
            <tbody>{p.products.map((x, i) => <tr key={i}><td className="px-3 py-2 font-semibold">{x.productName}{x.variantTitle && ` (${x.variantTitle})`}</td><td className="px-3 py-2">{x.sku || '-'}</td><td className="px-3 py-2 text-right">{x.quantity}</td><td className="px-3 py-2 text-right">{fmtMoney(x.unitPricePaise)}</td><td className="px-3 py-2 text-right font-semibold">{fmtMoney(x.amountPaise)}</td></tr>)}</tbody></table>
          <p className="m-0 text-right font-extrabold" data-testid="sp-total">Total {fmtMoney(p.totalAmountPaise)}</p>
          {p.stockUpdated && <p className="m-0 text-xs text-slate-500">Seller stock: {p.previousStock} to {p.newStock}</p>}
          {p.notes && <p className="m-0 text-sm text-slate-600">Notes: {p.notes}</p>}
          {p.status === 'CANCELLED' && <Notice type="warning">Cancelled by the seller. {p.cancelReason}</Notice>}
          {p.invoice ? <a data-testid="sp-invoice" href={/^https?:/.test(p.invoice.url) ? p.invoice.url : `${BASE_URL}${p.invoice.url}`} target="_blank" rel="noreferrer" className={`${btnGhost} no-underline inline-block`}><Eye size={14} className="inline mr-1" />View the seller's bill ({p.invoice.name})</a> : <p className="m-0 text-xs text-slate-400">No bill was attached.</p>}
        </div>
      )}
    </Drawer>
  );
};

export function SellerPurchases({ showSummary = false }) {
  const [sellers, setSellers] = useState([]);
  const [f, setF] = useState({ search: '', sellerId: '', paymentStatus: '', status: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const search = useDebounced(f.search);
  useEffect(() => { adminPurchaseService.sellers().then((r) => setSellers(r.sellers)).catch(() => {}); }, []);
  useEffect(() => { setError(''); adminPurchaseService.sellerPurchases({ ...f, search, page, limit: 20 }).then(setData).catch((e) => setError(e.message)); }, [f.sellerId, f.paymentStatus, f.status, f.from, f.to, search, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p) => { setF({ ...f, ...p }); setPage(1); };
  return (
    <div className="space-y-4" data-testid="sellers">
      <Notice type="info"><span className="inline-flex items-center gap-1.5"><Lock size={13} /> Purchases made by your associated sellers. This is a read-only view: you can look at them but not edit, cancel or delete them.</span></Notice>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500 flex-1 min-w-[180px]">Search<input data-testid="sp-search" className={`${inputCls} mt-1`} placeholder="Seller name or purchase ID" value={f.search} onChange={(e) => set({ search: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Seller<select data-testid="sp-seller" className={`${inputCls} mt-1`} value={f.sellerId} onChange={(e) => set({ sellerId: e.target.value })}><option value="">All my sellers</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.storeName})</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Payment status<select data-testid="sp-pay" className={`${inputCls} mt-1`} value={f.paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })}><option value="">All</option><option value="NOT_RECORDED">Not recorded</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></label>
          <label className="text-xs font-semibold text-slate-500">Status<select data-testid="sp-status" className={`${inputCls} mt-1`} value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">All</option><option value="RECORDED">Recorded</option><option value="CANCELLED">Cancelled</option></select></label>
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="sp-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="sp-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        </div>
        <p className="m-0 mt-2 text-[11px] text-slate-400">Sellers do not enter a payment status when they record a purchase, so it shows as "Not recorded".</p>
      </Card>
      <SellerWiseSummary
        defaultOpen={showSummary}
        filters={{ search, sellerId: f.sellerId, paymentStatus: f.paymentStatus, status: f.status, from: f.from, to: f.to }}
        onOpenSeller={(id) => { set({ sellerId: id }); setTimeout(() => document.querySelector('[data-testid="sp-summary"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
      />
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="sp-summary">
            <Stat label="Seller purchases" value={data.summary.purchases} testId="sp-s-count" />
            <Stat label="Total amount" value={fmtMoney(data.summary.amountPaise)} tone="blue" testId="sp-s-amount" />
            <Stat label="Units" value={data.summary.quantity} testId="sp-s-qty" />
            <Stat label="Sellers with purchases" value={data.summary.sellers} testId="sp-s-sellers" />
          </div>
          <Card>
            {data.purchases.length === 0 ? <Empty>No seller purchases found.</Empty> : (
              <Table testId="sp-table">
                <thead><tr className={headCls}><TH>Seller</TH><TH>Seller ID</TH><TH>Store</TH><TH>Purchase ID</TH><TH>Product</TH><TH>SKU</TH><TH>Supplier</TH><TH>Date</TH><TH right>Qty</TH><TH right>Amount</TH><TH>Payment</TH><TH>Status</TH><TH /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.purchases.map((p) => (
                    <tr key={p.id} data-testid="sp-row" data-seller={p.sellerName} data-id={p.purchaseId}>
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">{p.sellerName}</td><td className="px-3 py-3 text-xs text-slate-500" title={p.sellerId}>{p.sellerId.slice(-8)}</td><td className="px-3 py-3">{p.storeName}</td>
                      <td className="px-3 py-3 font-bold whitespace-nowrap">{p.purchaseId}</td><td className="px-3 py-3">{p.productName}</td><td className="px-3 py-3">{p.sku || '-'}</td><td className="px-3 py-3">{p.supplierName}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{fmtDate(p.purchaseDate)}</td><td className="px-3 py-3 text-right">{p.quantity}</td><td className="px-3 py-3 text-right font-semibold">{fmtMoney(p.amountPaise)}</td>
                      <td className="px-3 py-3"><PayChip status={p.paymentStatus} /></td><td className="px-3 py-3"><StatusChip status={p.status} /></td>
                      <td className="px-3 py-3 text-right"><button type="button" data-testid="sp-open" className={btnGhost} onClick={() => setOpen(p.id)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
      {open && <SellerPurchaseDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ───────────────────────── seller-wise summary (a section of the Associated Seller Purchases page) ─────────────────────────

/** Totals per seller, from the same records and the same filters as the list below it (the server uses one shared filter for both). */
function SellerWiseSummary({ filters, onOpenSeller, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  // the old-address redirect may deliver the "open it" request just after the page has appeared
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const key = JSON.stringify(filters);
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setError('');
    adminPurchaseService.sellerSummary(filters).then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [open, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card>
      <button type="button" data-testid="sw-toggle" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full flex items-center justify-between bg-transparent border-0 cursor-pointer p-0 text-left">
        <span className="text-base font-extrabold text-slate-900">Seller-wise Purchase Summary</span>
        <span className="text-xs font-bold text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-3" data-testid="bysellers">
          {error && <Notice type="error">{error}</Notice>}
          {!data && !error && <Spinner />}
          {data && (data.sellers.length === 0 ? <Empty>No seller purchases for these filters.</Empty> : (
            <>
              <div className="overflow-x-auto"><table className="w-full text-sm" data-testid="sw-table"><thead><tr className={headCls}><TH>Seller</TH><TH>Store</TH><TH right>Total purchases</TH><TH right>Total units</TH><TH right>Total purchase amount</TH><TH>Last purchase</TH><TH right>Suppliers</TH><TH /></tr></thead>
                <tbody className="divide-y divide-slate-100">{data.sellers.map((s) => <tr key={s.id} data-testid="sw-row" data-seller={s.name}><td className="px-3 py-3 font-bold">{s.name}</td><td className="px-3 py-3">{s.storeName}</td><td className="px-3 py-3 text-right" data-testid="sw-count">{s.purchases}</td><td className="px-3 py-3 text-right" data-testid="sw-qty">{s.quantity}</td><td className="px-3 py-3 text-right font-semibold" data-testid="sw-amount">{fmtMoney(s.amountPaise)}</td><td className="px-3 py-3">{fmtDate(s.lastPurchaseDate)}</td><td className="px-3 py-3 text-right">{s.suppliers}</td><td className="px-3 py-3 text-right"><button type="button" data-testid="sw-open" className={btnGhost} onClick={() => onOpenSeller(s.id)}>Purchase details</button></td></tr>)}</tbody></table></div>
              <p className="m-0 mt-3 text-sm text-slate-600">All sellers shown together: <b data-testid="sw-total">{fmtMoney(data.totalAmountPaise)}</b></p>
            </>
          ))}
          <p className="m-0 mt-2 text-[11px] text-slate-400">Counts recorded purchases only (cancelled ones are left out), using the search, seller, status and date filters above.</p>
        </div>
      )}
    </Card>
  );
}
