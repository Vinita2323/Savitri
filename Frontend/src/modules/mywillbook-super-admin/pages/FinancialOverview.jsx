import React, { useMemo, useState } from 'react';
import {
  IndianRupee,
  RotateCcw,
  Percent,
  CreditCard,
  Wallet,
  CheckCircle2,
  Users,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  EmptyState,
  FilterBar,
  formatINR,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
  fieldClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import {
  FINANCE_SUMMARY,
  INITIAL_BRANDS,
  INITIAL_PAYOUTS,
  RECENT_FINANCIAL,
} from '../data/mockData';

const FinancialOverview = () => {
  const ctx = useMyWillBookSuperAdmin();
  const financeSummary = ctx?.financeSummary ?? FINANCE_SUMMARY;
  const brands = ctx?.brands ?? INITIAL_BRANDS;
  const payouts = ctx?.payouts ?? INITIAL_PAYOUTS;

  const [brandFilter, setBrandFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pendingSeller = useMemo(
    () =>
      payouts
        .filter(
          (p) =>
            p.type === 'Seller' && ['Pending', 'Approved', 'Processing'].includes(p.status)
        )
        .reduce((s, p) => s + (p.amount || 0), 0),
    [payouts]
  );

  const pendingCaptain = useMemo(
    () =>
      payouts
        .filter(
          (p) =>
            p.type === 'Captain' && ['Pending', 'Approved', 'Processing'].includes(p.status)
        )
        .reduce((s, p) => s + (p.amount || 0), 0),
    [payouts]
  );

  const settled = useMemo(
    () => payouts.filter((p) => p.status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0),
    [payouts]
  );

  const brandRows = useMemo(
    () =>
      brands.map((b) => ({
        id: b.id,
        name: b.name,
        sales: b.sales || 0,
        commission: b.commission || 0,
        pendingPayout: b.pendingPayout || 0,
        orders: b.orders || 0,
        rate: b.commissionRate ?? b.config?.commissionPercent ?? 0,
      })),
    [brands]
  );

  const filteredTxns = useMemo(() => {
    return RECENT_FINANCIAL.filter((tx) => {
      const matchesBrand = brandFilter === 'all' || tx.brand === brandFilter;
      const day = (tx.time || '').slice(0, 10);
      const matchesFrom = !dateFrom || day >= dateFrom;
      const matchesTo = !dateTo || day <= dateTo;
      return matchesBrand && matchesFrom && matchesTo;
    });
  }, [brandFilter, dateFrom, dateTo]);

  const brandOptions = useMemo(() => {
    const names = new Set([
      ...brands.map((b) => b.name),
      ...RECENT_FINANCIAL.map((t) => t.brand),
    ]);
    return [...names].filter(Boolean).sort();
  }, [brands]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Financial Overview"
        subtitle="Gross sales (GMV) is not profit — demo aggregates only"
        breadcrumbs={['MyWillBook', 'Finance', 'Financial Overview']}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross sales (GMV)"
          value={formatINR(financeSummary.gmv)}
          hint="Not platform profit"
          icon={IndianRupee}
          accent="#FF9418"
        />
        <StatCard
          label="Refunds"
          value={formatINR(financeSummary.refunds)}
          hint="Demo adjustments"
          icon={RotateCcw}
          accent="#e11d48"
        />
        <StatCard
          label="Commission earned"
          value={formatINR(financeSummary.commissionEarned)}
          hint="Platform take (demo)"
          icon={Percent}
          accent="#31551C"
        />
        <StatCard
          label="Membership revenue"
          value={formatINR(financeSummary.membershipRevenue)}
          hint="Seller / captain plans"
          icon={CreditCard}
          accent="#0ea5e9"
        />
        <StatCard
          label="Pending seller payouts"
          value={formatINR(pendingSeller)}
          hint="Seller type · open pipeline"
          icon={Wallet}
          accent="#f59e0b"
        />
        <StatCard
          label="Pending captain payouts"
          value={formatINR(pendingCaptain)}
          hint="Captain type · open pipeline"
          icon={Users}
          accent="#6366f1"
        />
        <StatCard
          label="Settled (paid)"
          value={formatINR(settled)}
          hint="Paid payouts sum (demo)"
          icon={CheckCircle2}
          accent="#059669"
        />
        <StatCard
          label="Pending payouts (summary)"
          value={formatINR(financeSummary.pendingPayouts)}
          hint="From finance summary"
          icon={Wallet}
          accent="#64748b"
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">Brand-wise comparison</h2>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Orders</th>
                <th className={thClass}>Gross sales</th>
                <th className={thClass}>Commission</th>
                <th className={thClass}>Rate</th>
                <th className={thClass}>Pending payout</th>
              </tr>
            </thead>
            <tbody>
              {brandRows.map((b) => (
                <tr key={b.id}>
                  <td className={`${tdClass} font-extrabold text-slate-900`}>{b.name}</td>
                  <td className={tdClass}>{b.orders.toLocaleString('en-IN')}</td>
                  <td className={`${tdClass} font-extrabold text-[#31551C]`}>{formatINR(b.sales)}</td>
                  <td className={tdClass}>{formatINR(b.commission)}</td>
                  <td className={tdClass}>{b.rate}%</td>
                  <td className={tdClass}>{formatINR(b.pendingPayout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">Recent transactions</h2>
        <FilterBar>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className={fieldClass}
          >
            <option value="all">All brands</option>
            {brandOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-bold uppercase text-slate-400">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={fieldClass}
            />
            <label className="text-[10px] font-bold uppercase text-slate-400">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={fieldClass}
            />
          </div>
        </FilterBar>

        {filteredTxns.length === 0 ? (
          <EmptyState
            title="No transactions in range."
            description="Client-side date / brand filter on demo RECENT_FINANCIAL."
          />
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Time</th>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map((tx) => (
                  <tr key={tx.id}>
                    <td className={tdClass}>{tx.time}</td>
                    <td className={tdClass}>{tx.type}</td>
                    <td className={tdClass}>{tx.brand}</td>
                    <td
                      className={`${tdClass} font-extrabold ${
                        tx.amount < 0 ? 'text-rose-600' : 'text-[#31551C]'
                      }`}
                    >
                      {formatINR(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialOverview;
