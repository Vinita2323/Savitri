import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, EyeOff, Search, ShieldCheck, X } from 'lucide-react';
import { catalogAdminService } from '../../../services/bulkProductService';
import { categoryService } from '../../../services/authService';
import API from '../../../services/api';

const inputCls = 'w-full px-3.5 py-2.5 text-[15px] bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';
const btnGhost = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-60';
const TABS = [['ALL', 'All'], ['live', 'Live'], ['hidden', 'Hidden'], ['blocked', 'Blocked'], ['out', 'Out of stock']];

const Badge = ({ tone, children }) => {
  const t = { green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700', slate: 'bg-slate-100 text-slate-600', blue: 'bg-blue-50 text-blue-700' }[tone];
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${t}`}>{children}</span>;
};

const apiBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') || `${window.location.protocol}//${window.location.hostname}:5000`;
const img = (u) => (u && u.startsWith('/uploads/') ? `${apiBase()}${u}` : u);

/** Admin / Super Admin: every seller's products, with filters and moderation (deactivate, block). */
export default function CatalogControlPage() {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [seller, setSeller] = useState('');
  const [city, setCity] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');
  const [blocking, setBlocking] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    API.get('/admin/sellers').then((r) => setSellers(r.data?.sellers || [])).catch(() => {});
    categoryService.getCategories().then((r) => setCats((r?.categories || []).filter((c) => !c.parent))).catch(() => {});
  }, []);

  const cities = useMemo(() => [...new Set(sellers.map((s) => s.warehouseLocation?.city).filter(Boolean))].sort(), [sellers]);

  const load = useCallback(() => {
    setError('');
    const params = { page, limit: 25, search: q || undefined, category: category || undefined, brand: brand || undefined, city: city || undefined, adminSellerId: seller || undefined };
    if (tab === 'blocked') params.blocked = 'true';
    if (tab === 'hidden') params.published = 'false';
    if (tab === 'out') params.stockState = 'out';
    if (tab === 'live') { params.blocked = 'false'; params.published = 'true'; params.stockState = 'in'; }
    return catalogAdminService.products(params).then(setData).catch((e) => setError(e.message));
  }, [page, q, category, brand, city, seller, tab]);
  useEffect(() => { setData(null); load(); }, [load]);

  const act = async (p, action, why) => {
    setBusyId(p._id); setError(''); setMsg('');
    try { await catalogAdminService.moderate(p._id, action, why); setMsg(`"${p.name}" ${action === 'deactivate' ? 'deactivated' : action === 'activate' ? 'activated' : action === 'block' ? 'blocked' : 'unblocked'}.`); setBlocking(null); setReason(''); await load(); }
    catch (e) { setError(e.message); } finally { setBusyId(''); }
  };

  const sellerName = (p) => (typeof p.seller === 'string' ? p.seller : '') || sellers.find((s) => String(s._id) === String(p.sellerId))?.businessName || '—';
  const pages = data ? Math.max(1, Math.ceil((data.total || 0) / 25)) : 1;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 m-0">Catalog control</h1>
        <p className="text-[15px] text-slate-500 mt-1 mb-0">Every seller's products in one place. Deactivate a product to hide it, or block a restricted product so it can never be shown to customers.</p>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-[15px] font-medium text-rose-800">{error}</div>}
      {msg && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[15px] font-medium text-emerald-800">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => { setTab(k); setPage(1); }} className={`px-4 py-2 rounded-full text-sm font-semibold border cursor-pointer ${tab === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>{l}</button>)}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputCls} pl-10`} placeholder="Search product name" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className={inputCls} value={seller} onChange={(e) => { setSeller(e.target.value); setPage(1); }}><option value="">All sellers</option>{sellers.map((s) => <option key={s._id} value={s._id}>{s.businessName || s.ownerName}</option>)}</select>
        <select className={inputCls} value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}><option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={inputCls} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">All categories</option>{cats.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}</select>
        <input className={inputCls} placeholder="Brand (exact)" value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} />
      </div>

      {!data && !error && <p className="text-[15px] text-slate-500">Loading…</p>}
      {data && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3 font-semibold">Product</th><th className="px-3 py-3 font-semibold">Seller</th><th className="px-3 py-3 font-semibold">Category / brand</th><th className="px-3 py-3 font-semibold">Price</th><th className="px-3 py-3 font-semibold">Stock</th><th className="px-3 py-3 font-semibold">State</th><th className="px-4 py-3 font-semibold text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.products.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No products match these filters.</td></tr>}
                {data.products.map((p) => {
                  const hidden = p.isPublished === false || p.status !== 'Published';
                  return (
                    <tr key={p._id} className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3"><div className="flex items-center gap-3 min-w-[220px]">{p.mainImage ? <img src={img(p.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover bg-slate-100" /> : <span className="w-11 h-11 rounded-lg bg-slate-100" />}<div className="min-w-0"><p className="m-0 font-semibold text-slate-900 break-words">{p.name}</p><p className="m-0 text-xs text-slate-500">{p.sku}{p.source === 'bulk' ? ' · bulk upload' : ''}</p></div></div></td>
                      <td className="px-3 py-3 text-slate-700">{sellerName(p)}</td>
                      <td className="px-3 py-3 text-slate-700">{p.category}{p.subCategory ? ` / ${p.subCategory}` : ''}<span className="block text-xs text-slate-500">{p.brand || '—'}</span></td>
                      <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-900">₹{p.salePrice}<span className="block text-xs font-normal text-slate-400 line-through">₹{p.mrp}</span></td>
                      <td className="px-3 py-3 text-slate-700">{p.stock}</td>
                      <td className="px-3 py-3"><div className="flex flex-col items-start gap-1">
                        {p.adminBlocked ? <Badge tone="red">Blocked</Badge> : hidden ? <Badge tone="slate">Hidden</Badge> : p.stock <= 0 ? <Badge tone="amber">Out of stock</Badge> : <Badge tone="green">Live</Badge>}
                        {p.adminBlocked && p.blockedReason && <span className="text-xs text-rose-600 max-w-[180px] break-words">{p.blockedReason}</span>}
                      </div></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">
                        {hidden ? <button type="button" className={btnGhost} disabled={busyId === p._id} onClick={() => act(p, 'activate')}><CheckCircle2 className="w-3.5 h-3.5" /> Activate</button> : <button type="button" className={btnGhost} disabled={busyId === p._id} onClick={() => act(p, 'deactivate')}><EyeOff className="w-3.5 h-3.5" /> Deactivate</button>}
                        {p.adminBlocked ? <button type="button" className={btnGhost} disabled={busyId === p._id} onClick={() => act(p, 'unblock')}><ShieldCheck className="w-3.5 h-3.5" /> Unblock</button> : <button type="button" className={`${btnGhost} !text-rose-600`} disabled={busyId === p._id} onClick={() => { setBlocking(p); setReason(''); }}><Ban className="w-3.5 h-3.5" /> Block</button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-slate-500">Page {page} of {pages} · {data.total} products</span>
          <button type="button" className={btnGhost} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {blocking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setBlocking(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-extrabold text-slate-900 m-0">Block this product?</h2><button type="button" className="bg-transparent border-none cursor-pointer" onClick={() => setBlocking(null)}><X className="w-5 h-5 text-slate-500" /></button></div>
            <p className="text-[15px] text-slate-600 mt-2 mb-4 break-words">“{blocking.name}” will disappear from the customer app and cannot be ordered. The seller cannot undo this.</p>
            <textarea className={inputCls} rows={3} placeholder="Reason (required, shown to admins)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2 mt-5"><button type="button" className={btnGhost} onClick={() => setBlocking(null)}>Cancel</button><button type="button" className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer border-none disabled:opacity-60" disabled={!reason.trim() || busyId === blocking._id} onClick={() => act(blocking, 'block', reason.trim())}>Block product</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
