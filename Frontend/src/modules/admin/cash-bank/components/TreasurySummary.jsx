import React from 'react';
import { useCashBank } from '../context/CashBankContext';
import { formatINR } from '../utils/cashBankUtils';

const FILTERS = [
  { id: 'all', label: 'All Accounts' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank' },
  { id: 'clearing', label: 'Razorpay Clearing' },
];

const Card = ({ label, value, hint, tone = 'text-slate-900', testId }) => (
  <div className="bg-white rounded-xl border border-slate-200/80 px-3.5 py-3 shadow-xs min-w-0" data-testid={testId}>
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">{label}</div>
    <div className={`text-base font-semibold tracking-tight mt-0.5 truncate ${tone}`}>{value}</div>
    {hint ? <div className="text-[10px] text-slate-400 mt-0.5 truncate">{hint}</div> : null}
  </div>
);

export const TreasurySummary = () => {
  const { summary, filter, setFilter, integrity, loading } = useCashBank();
  if (!summary) {
    return loading ? <div className="text-xs text-slate-400">Loading treasury figures...</div> : null;
  }
  const f = filter;
  const show = (group) => f === 'all' || f === group;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-slate-200/70 p-0.5 rounded-lg flex items-center text-xs" role="tablist" aria-label="Account filter">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={f === x.id}
              onClick={() => setFilter(x.id)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${f === x.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        {integrity ? (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${integrity.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
            {integrity.ok ? 'Ledger balanced' : 'Ledger imbalance detected'}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Card testId="card-net" label="Total Net Balance" value={formatINR(summary.totalNetBalance)} hint="Cash + bank (excludes Razorpay clearing)" />
        {show('cash') && <Card testId="card-cash" label="Cash in Hand" value={formatINR(summary.cashInHand)} />}
        {show('bank') && <Card testId="card-bank" label="Bank Balances" value={formatINR(summary.bankBalance)} />}
        {show('clearing') && <Card testId="card-clearing" label="Razorpay Clearing" value={formatINR(summary.razorpayClearing)} hint="Collected, not yet settled" tone="text-amber-700" />}
        {f === 'all' && <Card testId="card-collections" label="Razorpay Collections" value={formatINR(summary.razorpayCollections)} hint={`${summary.razorpayPaymentsCount} payments`} />}
        {f === 'all' && <Card testId="card-pending" label="Pending Settlements" value={formatINR(summary.pendingSettlements)} hint={`${summary.pendingSettlementRecords} awaiting posting`} />}
        {f === 'all' && <Card testId="card-completed" label="Completed Settlements" value={String(summary.completedSettlements)} hint={formatINR(summary.completedSettlementAmount)} />}
        {f === 'all' && <Card testId="card-fees" label="Gateway Fees" value={formatINR(summary.gatewayFees)} hint="Fees + tax from settlements" />}
        {f === 'all' && <Card testId="card-refunds" label="Refunds" value={formatINR(summary.refunds)} hint={summary.refundsInProgress ? `${formatINR(summary.refundsInProgress)} in progress` : 'Processed by Razorpay'} />}
        {f === 'all' && <Card testId="card-in" label="Total Money In" value={formatINR(summary.totalMoneyIn)} tone="text-emerald-700" />}
        {f === 'all' && <Card testId="card-out" label="Total Money Out" value={formatINR(summary.totalMoneyOut)} tone="text-rose-700" />}
        {f === 'all' && <Card testId="card-unlinked" label="Unlinked Transactions" value={String(summary.unlinkedCount)} hint={formatINR(summary.unlinkedTotal)} tone="text-amber-700" />}
      </div>
    </div>
  );
};

export default TreasurySummary;
