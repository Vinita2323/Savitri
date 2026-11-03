import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, Link2, Unlink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { formatINR, formatDate } from '../utils/cashBankUtils';

const RECON_BADGE = {
  MATCHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  DISCREPANCY: 'bg-rose-50 text-rose-700 border-rose-200',
};
const RECON_LABEL = { MATCHED: 'Matched', PENDING: 'Pending', PARTIAL: 'Partially matched', DISCREPANCY: 'Discrepancy' };

const Badge = ({ tone, children }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${tone}`}>{children}</span>
);

export const RazorpayPanel = () => {
  const {
    settlements, reconciliation, gatewayPayments, bankAccounts, clearingAccounts, summary,
    razorpayRefresh, syncSettlements, postSettlement, matchSettlement, unmatchSettlement, autoReconcile,
    setSettlementAccount, exportSettlements, showToast,
  } = useCashBank();
  const [tab, setTab] = useState('settlements');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [destByRow, setDestByRow] = useState({});
  const [stmtByRow, setStmtByRow] = useState({});

  useEffect(() => { razorpayRefresh(); }, [razorpayRefresh]);

  const unmatchedCredits = reconciliation?.unmatchedBankCredits || [];
  const defaultSettlementAccount = bankAccounts.find((a) => a.isSettlementAccount);
  const clearingBalance = clearingAccounts.reduce((s, a) => s + a.balance, 0);

  const run = async (key, fn) => {
    setError('');
    setBusy(key);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const counts = reconciliation?.counts || { matched: 0, pending: 0, partial: 0, discrepancies: 0, unmatchedBankCredits: 0 };
  const groups = useMemo(() => ([
    { id: 'matched', label: 'Matched settlements', list: reconciliation?.matched || [] },
    { id: 'pending', label: 'Pending settlements (no bank credit matched yet)', list: reconciliation?.pending || [] },
    { id: 'partial', label: 'Partially matched (confirm the probable credit)', list: reconciliation?.partial || [] },
    { id: 'discrepancies', label: 'Settlement discrepancies', list: reconciliation?.discrepancies || [] },
  ]), [reconciliation]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Razorpay Clearing &amp; Settlements</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer payments are held in Razorpay Clearing until Razorpay settles them into your bank. A captured payment is never treated as settled.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Clearing balance</span>
          <span className="text-xl font-semibold tracking-tight text-amber-700" data-testid="clearing-balance">{formatINR(clearingBalance)}</span>
        </div>
      </div>

      <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/40 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" disabled={!!busy} onClick={() => run('sync', () => syncSettlements({}))} className="px-3 py-1.5 rounded-lg bg-[#1A2E0A] text-white font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> Sync from Razorpay
        </button>
        <button type="button" disabled={!!busy} onClick={() => run('auto', () => autoReconcile())} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Auto-match bank credits
        </button>
        <button type="button" onClick={() => exportSettlements('csv')} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5 text-slate-500" /> CSV</button>
        <button type="button" onClick={() => exportSettlements('xlsx')} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5 text-slate-500" /> Excel</button>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-slate-500">Default settlement account:</span>
          <select
            value={defaultSettlementAccount?.id || ''}
            onChange={(e) => e.target.value && run('setacc', () => setSettlementAccount(e.target.value))}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white outline-none cursor-pointer"
          >
            <option value="">{bankAccounts.length ? 'Not set' : 'Add a bank account first'}</option>
            {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <span>{error}</span>
        </div>
      ) : null}

      <div className="px-4 pt-3 flex items-center gap-1 text-xs border-b border-slate-100">
        {[['settlements', `Settlements (${settlements.length})`], ['reconciliation', `Reconciliation (${counts.matched + counts.pending + counts.partial + counts.discrepancies})`], ['payments', `Payments (${gatewayPayments.length})`]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-3 py-2 -mb-px border-b-2 font-medium cursor-pointer ${tab === id ? 'border-[#1A2E0A] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'settlements' && (
        <div className="overflow-x-auto min-h-[300px]">
          {settlements.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No settlements yet. They appear when Razorpay settles funds (webhook) or after you sync.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200/80">
                <tr>{['Settlement', 'Date', 'Gross', 'Fees (incl. tax)', 'Net', 'Bank account', 'UTR', 'Status', 'Action'].map((h) => <th key={h} className="py-2.5 px-3 font-medium whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60" data-testid={`settlement-${s.settlementId}`}>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">{s.settlementId}{!s.itemized && s.status === 'processed' ? <span title="Webhook data only: no per-payment detail" className="ml-1 text-amber-600">*</span> : null}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(s.settledAt)}</td>
                    <td className="py-2.5 px-3 text-right">{s.itemized ? formatINR(s.gross) : '-'}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600">{formatINR(s.fees)}{s.tax ? <span className="text-slate-400"> ({formatINR(s.tax)} tax)</span> : null}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{formatINR(s.net)}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{s.destinationAccount || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{s.utr || '-'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <Badge tone={s.status === 'processed' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>{s.status}{s.posted ? ' · posted' : ''}</Badge>
                        <Badge tone={RECON_BADGE[s.reconStatus]}>{RECON_LABEL[s.reconStatus]}</Badge>
                      </div>
                      {s.discrepancyNote ? <div className="text-[10px] text-rose-600 mt-1 max-w-[220px]">{s.discrepancyNote}</div> : null}
                    </td>
                    <td className="py-2.5 px-3 min-w-[220px]">
                      {s.status === 'processed' && !s.posted && (
                        <div className="flex items-center gap-1.5">
                          <select value={destByRow[s.id] || defaultSettlementAccount?.id || ''} onChange={(e) => setDestByRow((p) => ({ ...p, [s.id]: e.target.value }))} className="px-1.5 py-1 border border-slate-200 rounded bg-white outline-none max-w-[120px]">
                            <option value="">Bank...</option>
                            {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                          </select>
                          <button type="button" disabled={!!busy} onClick={() => run('post' + s.id, () => postSettlement(s.id, destByRow[s.id] || defaultSettlementAccount?.id))} className="px-2 py-1 rounded bg-[#1A2E0A] text-white font-medium cursor-pointer disabled:opacity-50" title="Credit the bank, expense the fees, release clearing">Post</button>
                        </div>
                      )}
                      {s.status === 'processed' && s.reconStatus !== 'MATCHED' && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <select value={stmtByRow[s.id] || ''} onChange={(e) => setStmtByRow((p) => ({ ...p, [s.id]: e.target.value }))} className="px-1.5 py-1 border border-slate-200 rounded bg-white outline-none max-w-[130px]">
                            <option value="">Bank credit...</option>
                            {unmatchedCredits.map((c) => <option key={c.id} value={c.id}>{formatINR(c.amount)} · {c.referenceNumber || formatDate(c.date)}</option>)}
                          </select>
                          <button type="button" disabled={!stmtByRow[s.id] || !!busy} onClick={() => run('match' + s.id, () => matchSettlement(s.id, stmtByRow[s.id]))} className="px-2 py-1 rounded border border-slate-200 bg-white font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"><Link2 className="w-3 h-3" /> Match</button>
                        </div>
                      )}
                      {s.reconStatus === 'MATCHED' && (
                        <button type="button" disabled={!!busy} onClick={() => run('unmatch' + s.id, () => unmatchSettlement(s.id))} className="px-2 py-1 rounded border border-slate-200 bg-white font-medium inline-flex items-center gap-1 cursor-pointer text-slate-600"><Unlink className="w-3 h-3" /> Unmatch</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'reconciliation' && (
        <div className="p-4 space-y-4 min-h-[300px] text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[['Matched', counts.matched, 'text-emerald-700'], ['Pending', counts.pending, 'text-slate-700'], ['Partial', counts.partial, 'text-amber-700'], ['Discrepancies', counts.discrepancies, 'text-rose-700'], ['Unmatched bank credits', counts.unmatchedBankCredits, 'text-amber-700']].map(([l, v, t]) => (
              <div key={l} className="rounded-lg border border-slate-200 px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-slate-400">{l}</div><div className={`text-lg font-semibold ${t}`}>{v}</div></div>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.id}>
              <h4 className="font-semibold text-slate-700 mb-1">{g.label} ({g.list.length})</h4>
              {g.list.length === 0 ? <p className="text-slate-400">None</p> : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {g.list.map((s) => (
                    <li key={s.id} className="px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-mono">{s.settlementId}</span><span>{formatINR(s.net)}</span><span className="text-slate-400">{s.utr}</span>
                      {s.discrepancy ? <span className="text-rose-600">difference {formatINR(s.discrepancy)}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Unmatched bank credits ({unmatchedCredits.length})</h4>
            {unmatchedCredits.length === 0 ? <p className="text-slate-400">None</p> : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {unmatchedCredits.map((c) => <li key={c.id} className="px-3 py-2 flex flex-wrap gap-x-4"><span>{formatDate(c.date)}</span><span className="font-medium">{formatINR(c.amount)}</span><span className="font-mono text-slate-500">{c.referenceNumber || '-'}</span><span className="text-slate-400">{c.description}</span></li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="overflow-x-auto min-h-[300px]">
          {gatewayPayments.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No Razorpay payments recorded yet.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200/80"><tr>{['Payment', 'Order', 'Amount', 'Method', 'Status', 'Refunded', 'Settlement'].map((h) => <th key={h} className="py-2.5 px-3 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {gatewayPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 font-mono">{p.razorpayPaymentId}</td><td className="py-2.5 px-3">{p.orderId}</td>
                    <td className="py-2.5 px-3 font-semibold">{formatINR(p.amount)}</td><td className="py-2.5 px-3">{p.method || '-'}</td>
                    <td className="py-2.5 px-3"><Badge tone={p.status === 'captured' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>{p.status}</Badge></td>
                    <td className="py-2.5 px-3">{p.refunded ? formatINR(p.refunded) : '-'}{p.refundPending ? <span className="text-amber-600"> (+{formatINR(p.refundPending)} pending)</span> : null}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{p.settlementId || 'Not settled'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {summary ? (
        <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/30">
          Posted settlements: {summary.completedSettlements} · awaiting posting: {summary.pendingSettlementRecords} · * = webhook data only (no per-payment detail; verify against the Razorpay settlement report)
        </div>
      ) : null}
    </div>
  );
};

export default RazorpayPanel;
