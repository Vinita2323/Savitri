import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Boxes, CalendarRange, Download, IndianRupee, Loader2, Minus, ShoppingBag, TrendingUp } from 'lucide-react';
import { superAdminService } from '../../../../services/superAdminService';
import { selectClass, tableClass, tableWrap, tdClass, thClass } from './purchaseUi';

const RANGES = {
  week: [{ v: 4, l: 'Last 4 weeks' }, { v: 8, l: 'Last 8 weeks' }, { v: 12, l: 'Last 12 weeks' }, { v: 26, l: 'Last 26 weeks' }, { v: 52, l: 'Last 52 weeks' }],
  month: [{ v: 3, l: 'Last 3 months' }, { v: 6, l: 'Last 6 months' }, { v: 12, l: 'Last 12 months' }, { v: 24, l: 'Last 24 months' }],
};
const DEFAULT_RANGE = { week: 12, month: 12 };
const BAR = '#79B433';
const BAR_CURRENT = '#F7941D';

const inr = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const compact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${+(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};
const d = (s) => new Date(`${s}T00:00:00`);
const dm = (s) => d(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const dmy = (s) => d(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const periodLabel = (b, period) => (period === 'week' ? `${dm(b.start)} – ${dmy(b.end)}` : d(b.start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
const shortLabel = (b, period) => (period === 'week' ? dm(b.start) : d(b.start).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }));

const niceMax = (max) => {
  if (max <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(max));
  const f = max / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
};

const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const Change = ({ cur, prev }) => {
  const p = pct(cur, prev);
  if (p === null) return <span className="text-slate-300">—</span>;
  if (Math.abs(p) < 0.05) return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500"><Minus size={12} /> 0%</span>;
  const up = p > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-700' : 'text-rose-600'}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(p).toFixed(1)}%
    </span>
  );
};

const BarChart = ({ buckets, period }) => {
  const [hover, setHover] = useState(null);
  const W = 960; const H = 300; const padL = 64; const padR = 12; const padT = 14; const padB = 44;
  const innerW = W - padL - padR; const innerH = H - padT - padB;
  const max = niceMax(Math.max(...buckets.map((b) => b.totalSpend), 0));
  const slot = innerW / Math.max(1, buckets.length);
  const barW = Math.min(46, slot * 0.66);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const every = buckets.length > 26 ? 4 : buckets.length > 14 ? 2 : 1;
  const hb = hover !== null ? buckets[hover] : null;

  return (
    <div className="relative" data-testid="pr-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Purchase value by ${period}`}>
        {ticks.map((t) => {
          const y = padT + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={t === 0 ? '0' : '3 4'} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">{compact(t)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = (b.totalSpend / max) * innerH;
          const y = padT + innerH - h;
          return (
            <g key={b.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${periodLabel(b, period)}: ${inr(b.totalSpend)}`} style={{ outline: 'none' }}>
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill={hover === i ? '#f1f5f9' : 'transparent'} />
              {b.totalSpend > 0 ? <rect data-testid="pr-bar" data-key={b.key} x={x} y={y} width={barW} height={Math.max(2, h)} rx="4" fill={b.current ? BAR_CURRENT : BAR} /> : <rect x={x} y={padT + innerH - 2} width={barW} height="2" rx="1" fill="#cbd5e1" />}
              {i % every === 0 && <text x={padL + i * slot + slot / 2} y={H - padB + 18} textAnchor="middle" fontSize="11" fill={b.current ? '#c2410c' : '#64748b'} fontWeight={b.current ? 700 : 400}>{shortLabel(b, period)}</text>}
            </g>
          );
        })}
      </svg>
      {hb && (
        <div className="pointer-events-none absolute z-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${Math.min(80, Math.max(2, ((padL + hover * slot + slot / 2) / W) * 100 - 8))}%`, top: 4 }} data-testid="pr-tip">
          <div className="font-semibold text-slate-900">{periodLabel(hb, period)}{hb.current ? ' · in progress' : ''}</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-[#1A2E0A]">{inr(hb.totalSpend)}</div>
          <div className="text-slate-500">{hb.purchases} purchases · {hb.units} units</div>
        </div>
      )}
      <div className="mt-1 flex items-center gap-4 pl-16 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAR }} /> Completed {period === 'week' ? 'weeks' : 'months'}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAR_CURRENT }} /> Current {period} (in progress)</span>
      </div>
    </div>
  );
};

const Breakdown = ({ title, rows, testId }) => {
  const max = Math.max(...rows.map((r) => r.totalSpend), 0) || 1;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs" data-testid={testId}>
      <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      {rows.length === 0 ? <p className="m-0 py-4 text-center text-sm text-slate-400">No data in this range.</p> : (
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.slice(0, 6).map((r) => (
            <li key={r.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-700">{r.name}</span>
                <span className="shrink-0 font-mono text-xs font-semibold text-[#1A2E0A]">{inr(r.totalSpend)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.totalSpend / max) * 100)}%`, background: BAR }} /></div>
              <div className="mt-0.5 text-[11px] text-slate-400">{r.purchases} purchases · {r.units} units</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const PurchaseReportView = ({ brandId, facets, reloadKey, onLive }) => {
  const [period, setPeriod] = useState('week');
  const [range, setRange] = useState(DEFAULT_RANGE.week);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [f, setF] = useState({ sellerId: '', supplier: '', category: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { setData(null); setF({ sellerId: '', supplier: '', category: '' }); }, [brandId]);

  const params = useMemo(() => {
    const p = { brandId, period };
    Object.entries(f).forEach(([k, v]) => { if (v) p[k] = v; });
    if (range === 'custom') {
      if (custom.from) p.from = custom.from;
      if (custom.to) p.to = custom.to;
    } else {
      p.last = Number(range); // the server works out the weeks / months in Indian time
    }
    return p;
  }, [brandId, period, range, custom, f]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading((l) => (data ? l : true));
      setError('');
      try {
        const res = await superAdminService.getSellerPurchaseReport(params);
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Could not load the report.');
        setData(res);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Could not load the report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const changePeriod = (p) => { setPeriod(p); setRange(DEFAULT_RANGE[p]); };
  const unit = period === 'week' ? 'week' : 'month';
  const rows = data?.buckets || [];
  const current = rows.find((b) => b.current) || rows[rows.length - 1];
  const prev = current ? rows[rows.indexOf(current) - 1] : null;
  const best = rows.reduce((a, b) => (b.totalSpend > (a?.totalSpend ?? -1) ? b : a), null);
  const avg = rows.length ? (data?.totals?.totalSpend || 0) / rows.length : 0;

  const cards = data ? [
    { label: `This ${unit}`, value: inr(current?.totalSpend), hint: <span className="inline-flex items-center gap-1">vs last {unit} <Change cur={current?.totalSpend || 0} prev={prev?.totalSpend || 0} /></span>, icon: TrendingUp },
    { label: `Total · ${rows.length} ${unit}s`, value: inr(data.totals.totalSpend), hint: `${data.totals.purchases} purchases`, icon: IndianRupee },
    { label: 'Units purchased', value: data.totals.units.toLocaleString('en-IN'), hint: `${data.totals.sellers} sellers · ${data.totals.suppliers} suppliers`, icon: Boxes },
    { label: `Average / ${unit}`, value: inr(avg), hint: 'Across the range shown', icon: ShoppingBag },
    { label: `Best ${unit}`, value: best && best.totalSpend > 0 ? inr(best.totalSpend) : '—', hint: best && best.totalSpend > 0 ? periodLabel(best, period) : 'No purchases yet', icon: CalendarRange },
  ] : [];

  const exportCsv = () => {
    const head = ['Period', 'From', 'To', 'Purchases', 'Units', 'Sellers', 'Suppliers', 'Total (INR)'];
    const lines = [head.join(',')];
    rows.forEach((b) => lines.push([`"${periodLabel(b, period)}${b.current ? ' (in progress)' : ''}"`, b.start, b.end, b.purchases, b.units, b.sellers, b.suppliers, b.totalSpend].join(',')));
    lines.push(['"Total"', data.from, data.to, data.totals.purchases, data.totals.units, data.totals.sellers, data.totals.suppliers, data.totals.totalSpend].join(','));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `seller-purchases-${period}ly-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-5" data-testid="pr-view">
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Report period">
            {[['week', 'Weekly'], ['month', 'Monthly']].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={period === k} data-testid={`pr-period-${k}`} onClick={() => changePeriod(k)} className={`cursor-pointer rounded-lg border-none px-4 py-1.5 text-sm font-semibold transition ${period === k ? 'bg-[#1A2E0A] text-white shadow-xs' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}>{l}</button>
            ))}
          </div>
          <select data-testid="pr-range" className={`${selectClass} !w-auto`} value={range} onChange={(e) => setRange(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}>
            {RANGES[period].map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            <option value="custom">Custom range…</option>
          </select>
          {range === 'custom' && (
            <>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">From <input data-testid="pr-from" type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className={`${selectClass} !w-auto`} /></label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">To <input data-testid="pr-to" type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className={`${selectClass} !w-auto`} /></label>
            </>
          )}
          <button data-testid="pr-export" type="button" onClick={exportCsv} disabled={!data || loading} className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[#79B433] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#689A2B] disabled:cursor-not-allowed disabled:opacity-40"><Download size={14} /> Export report</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select data-testid="pr-seller" className={selectClass} value={f.sellerId} onChange={(e) => setF({ ...f, sellerId: e.target.value })}><option value="">All Sellers</option>{facets.sellers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select data-testid="pr-supplier" className={selectClass} value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })}><option value="">All Suppliers</option>{facets.suppliers.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select data-testid="pr-category" className={selectClass} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">All Categories</option>{facets.categories.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </div>
        <p className="m-0 text-xs text-slate-500">
          {period === 'week' ? 'Weeks run Monday to Sunday' : 'Calendar months'} (Indian time). Cancelled purchases are not counted.
          {data ? <> Showing <strong className="text-slate-700">{dmy(data.from)}</strong> to <strong className="text-slate-700">{dmy(data.to)}</strong>.</> : null}
          {onLive ? <span className="ml-2 inline-flex items-center gap-1 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span> : null}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-rose-700"><AlertCircle size={16} /> {error}</p></div>
      ) : !data ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" /> Loading report...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="pr-cards">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2"><p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{c.label}</p><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]"><c.icon size={15} /></span></div>
                <p className="m-0 mt-2 font-mono text-lg font-medium leading-snug text-[#1A2E0A] sm:text-xl">{c.value}</p>
                <p className="m-0 mt-1 text-xs font-medium text-slate-500">{c.hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <h3 className="m-0 mb-2 text-sm font-semibold text-slate-800">Purchase value by {unit}</h3>
            {data.totals.purchases === 0 ? <p className="m-0 py-16 text-center text-sm text-slate-400">No purchases recorded in this range.</p> : <BarChart buckets={rows} period={period} />}
          </div>

          <div className={tableWrap}>
            <div className="overflow-x-auto">
              <table className={tableClass} style={{ minWidth: 820 }} data-testid="pr-table">
                <thead><tr>{[period === 'week' ? 'Week' : 'Month', 'Purchases', 'Units', 'Sellers', 'Suppliers', 'Total value', `vs previous ${unit}`].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {[...rows].reverse().map((b) => {
                    const prevRow = rows[rows.indexOf(b) - 1];
                    return (
                      <tr key={b.key} data-testid="pr-row" className={b.current ? 'bg-orange-50/40' : 'hover:bg-slate-50/70'}>
                        <td className={tdClass}><span className="font-medium text-slate-900">{periodLabel(b, period)}</span>{b.current ? <span className="ml-2 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">In progress</span> : null}</td>
                        <td className={`${tdClass} font-mono`}>{b.purchases}</td>
                        <td className={`${tdClass} font-mono`}>{b.units.toLocaleString('en-IN')}</td>
                        <td className={`${tdClass} font-mono`}>{b.sellers}</td>
                        <td className={`${tdClass} font-mono`}>{b.suppliers}</td>
                        <td className={`${tdClass} font-mono font-medium`}>{inr(b.totalSpend)}</td>
                        <td className={tdClass}>{prevRow ? <Change cur={b.totalSpend} prev={prevRow.totalSpend} /> : <span className="text-slate-300">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/80 font-semibold text-slate-900">
                    <td className={tdClass}>Total</td>
                    <td className={`${tdClass} font-mono`}>{data.totals.purchases}</td>
                    <td className={`${tdClass} font-mono`}>{data.totals.units.toLocaleString('en-IN')}</td>
                    <td className={`${tdClass} font-mono`}>{data.totals.sellers}</td>
                    <td className={`${tdClass} font-mono`}>{data.totals.suppliers}</td>
                    <td className={`${tdClass} font-mono`} data-testid="pr-total">{inr(data.totals.totalSpend)}</td>
                    <td className={tdClass} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Breakdown title="Top sellers" rows={data.breakdown.sellers} testId="pr-top-sellers" />
            <Breakdown title="Top suppliers" rows={data.breakdown.suppliers} testId="pr-top-suppliers" />
            <Breakdown title="By category" rows={data.breakdown.categories} testId="pr-top-categories" />
            <Breakdown title="Most purchased products" rows={data.breakdown.products} testId="pr-top-products" />
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseReportView;
