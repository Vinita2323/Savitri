import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Clock3, IndianRupee, Loader2, Percent, Search, Store, CheckCircle2 } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';
import { selectClass, tableClass, tableWrap, tdClass, thClass } from '../components/seller-purchases/purchaseUi';

const PAGE_SIZE = 20;

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);

const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const BADGE = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  SETTLED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export const SuperAdminSellerSettlements = () => {
  const { selectedBrand, selectedBrandId } = useSuperAdmin();
  const brandName = selectedBrand?.name || 'this brand';
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Brand switch: drop the previous brand's data immediately
  useEffect(() => {
    setRows([]);
    setSummary(null);
    setStatus('ALL');
    setSearch('');
    setPage(1);
    setLoading(true);
  }, [selectedBrandId]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await superAdminService.getSellerSettlements({
          brandId: selectedBrandId,
          page,
          limit: PAGE_SIZE,
          status,
          search: search.trim() || undefined,
        });
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load settlements.');
        setRows(res.settlements || []);
        setSummary(res.summary || null);
        setPages(res.pages || 1);
        setTotal(res.total || 0);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setSummary(null);
        setError(err?.response?.data?.message || err?.message || 'Could not load settlements.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 350 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedBrandId, page, status, search, reload]);

  const cards = useMemo(
    () => [
      { label: 'Settled to Sellers', value: summary ? formatINR(summary.totalSettledAmount) : '—', icon: CheckCircle2 },
      { label: 'Pending Settlement', value: summary ? formatINR(summary.pendingSettlementAmount) : '—', icon: Clock3 },
      { label: 'Commission Earned', value: summary ? formatINR(summary.totalCommissionEarned) : '—', icon: Percent },
      { label: 'Settlement Records', value: summary ? String(summary.totalTransactions) : '—', icon: Store },
    ],
    [summary]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader
        title={`Seller Settlements — ${brandName}`}
        subtitle="Live order settlements per seller. Change the brand in the sidebar to see another brand."
        onRefresh={() => setReload((n) => n + 1)}
        refreshing={loading}
        titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
        subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon || IndianRupee;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]"><Icon size={15} /></span>
                </div>
                <p className="m-0 mt-2 font-mono text-xl font-medium text-[#1A2E0A]">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Order ID or seller..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#F7941D]"
            />
          </div>
          <select className={selectClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="ALL">All Settlement Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>

        <div className={tableWrap}>
          <div className="overflow-x-auto">
            <table className={tableClass} style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  {['Order', 'Seller', 'Order Total', 'Commission', 'Seller Net', 'Payment', 'Date', 'Settlement'].map((h) => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading settlements...</span></td></tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={16} /> {error}</p>
                      <div className="mt-3"><button type="button" onClick={() => setReload((n) => n + 1)} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700">Retry</button></div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-sm font-medium text-slate-500">No seller settlements found for {brandName}.</td></tr>
                ) : (
                  rows.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} font-mono text-[#F7941D]`}>{s.orderId || '—'}</td>
                      <td className={tdClass}>{s.sellerName || '—'}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(s.totalAmount)}</td>
                      <td className={`${tdClass} font-mono`}>{formatINR(s.commissionAmount)}{s.commissionRate != null ? <span className="ml-1 text-xs text-slate-400">({s.commissionRate}%)</span> : null}</td>
                      <td className={`${tdClass} font-mono font-medium`}>{formatINR(s.netSellerAmount)}</td>
                      <td className={tdClass}>{[s.paymentMethod, s.paymentStatus].filter(Boolean).join(' · ') || '—'}</td>
                      <td className={`${tdClass} whitespace-nowrap font-mono text-xs`}>{formatWhen(s.createdAt)}</td>
                      <td className={tdClass}>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${BADGE[s.settlementStatus] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{s.settlementStatus || '—'}</span>
                        {s.settledAt ? <div className="mt-0.5 font-mono text-xs text-slate-400">{formatWhen(s.settledAt)}</div> : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 p-4 text-sm">
            <span className="font-medium text-slate-500">Page <span className="text-slate-900">{Math.min(page, pages)}</span> of <span className="text-slate-900">{pages}</span> · {total} records</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
              <button type="button" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
