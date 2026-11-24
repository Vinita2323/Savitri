import React, { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import payrollService from '../../../../services/payrollService';
import { Notice, Spinner, btnGhost, btnPrimary, btnDanger, inputCls } from '../../../employee/components/ui';
import { Drawer, Labeled, Modal, StatusPill, TYPE_LABEL, METHOD_LABEL, fmtMoney, fmtMinutes, fmtDays, today } from './payrollUi';

const DAY_CLS = { PRESENT: 'text-emerald-700', LATE: 'text-amber-700', HALF_DAY: 'text-amber-700', ABSENT: 'text-rose-700', UNPAID_LEAVE: 'text-rose-700', PAID_LEAVE: 'text-sky-700', HOLIDAY: 'text-slate-400', WEEKLY_OFF: 'text-slate-400', HALF_LEAVE: 'text-sky-700' };
const qtyText = (i) => (i.unit === 'DAY_CENTI' ? `${fmtDays(i.quantity)} day(s)` : i.unit === 'MINUTE' ? fmtMinutes(i.quantity) : i.code === 'LATE' ? `${i.quantity} late` : '');

export default function PayrollDrawer({ id, brandId, isSuper, onClose, onChanged }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(null); // {kind:'reject'|'cancel'|'reverse', paymentId?}
  const [askText, setAskText] = useState('');
  const [adj, setAdj] = useState({ type: 'BONUS', amount: '', description: '' });
  const [ot, setOt] = useState('');
  const [pay, setPay] = useState({ amount: '', method: 'BANK_TRANSFER', reference: '', remarks: '', paidOn: today() });
  const [showDays, setShowDays] = useState(false);

  const load = useCallback(() => payrollService.payroll(brandId, id).then((r) => { setP(r.payroll); setOt(String(r.payroll.overtimeApprovedMinutes)); }).catch((e) => setError(e.message)), [brandId, id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg) => {
    setBusy(true); setError(''); setMsg('');
    try { const r = await fn(); if (r?.payroll) setP(r.payroll); if (okMsg) setMsg(okMsg); onChanged?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!p) return <Drawer title="Payroll" onClose={onClose}>{error ? <Notice type="error">{error}</Notice> : <Spinner />}</Drawer>;
  const editable = ['DRAFT', 'CALCULATED'].includes(p.status);
  const canApprove = p.status === 'PENDING_APPROVAL' && (isSuper || p.policy?.adminCanApprove);
  const canPay = ['APPROVED', 'PARTIALLY_PAID'].includes(p.status) && (isSuper || p.policy?.adminCanRecordPayments);
  const earn = p.items.filter((i) => i.kind === 'EARNING');
  const ded = p.items.filter((i) => i.kind === 'DEDUCTION');
  const s = p.summary || {};

  const submitAsk = async () => {
    const reason = askText.trim();
    if (!reason) { setError('Please give a reason.'); return; }
    const a = ask; setAsk(null); setAskText('');
    if (a.kind === 'reject') await run(() => payrollService.reject(brandId, p.id, reason), 'Sent back to the preparer.');
    if (a.kind === 'cancel') await run(() => payrollService.cancel(brandId, p.id, reason), 'Payroll cancelled.');
    if (a.kind === 'reverse') await run(() => payrollService.reversePayment(brandId, a.paymentId, reason).then((r) => r), 'Payment reversed.');
  };

  return (
    <Drawer title={`${p.employeeName} · ${p.periodFrom} to ${p.periodTo}`} subtitle={`${p.payrollCode} · ${p.employeeCode} · ${p.department} · ${TYPE_LABEL[p.salaryType]}`} onClose={onClose}>
      <div className="space-y-5" data-testid="pr-detail">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={p.status} />
          {p.locked && <span className="text-xs font-bold text-slate-500" data-testid="pr-locked">Attendance locked</span>}
          <span className="flex-1" />
          {['APPROVED', 'PARTIALLY_PAID', 'PAID'].includes(p.status) && <button type="button" data-testid="pr-slip" className={btnGhost} onClick={() => run(() => payrollService.downloadSlip(brandId, p.id), 'Salary slip downloaded.')}><Download className="w-4 h-4 inline mr-1" />Salary slip (PDF)</button>}
        </div>
        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        {p.warnings?.length > 0 && <Notice type="warning"><ul className="m-0 pl-4" data-testid="pr-warnings">{p.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></Notice>}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="pr-totals">
          {[['Gross', p.grossPaise, ''], ['Deductions', p.deductionsPaise, 'text-rose-700'], ['Net payable', p.netPaise, 'text-emerald-700'], ['Paid', p.paidPaise, ''], ['Balance', p.balancePaise, p.balancePaise > 0 ? 'text-amber-700' : '']].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-slate-200 p-3"><p className="m-0 text-[11px] text-slate-500">{l}</p><p className={`m-0 text-lg font-extrabold ${c}`} data-testid={`pr-${l.split(' ')[0].toLowerCase()}`}>{fmtMoney(v)}</p></div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[['Earnings', earn, p.grossPaise], ['Deductions', ded, p.deductionsPaise]].map(([title, rows, total]) => (
            <div key={title} className="rounded-xl border border-slate-200 overflow-hidden">
              <p className="m-0 px-3 py-2 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
              <table className="w-full text-sm" data-testid={`pr-${title.toLowerCase()}`}>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 && <tr><td className="px-3 py-2 text-slate-400">None</td></tr>}
                  {rows.map((i) => (
                    <tr key={i.id} data-testid="pr-line" data-code={i.code}>
                      <td className="px-3 py-2">{i.label}{qtyText(i) && <span className="block text-[11px] text-slate-400">{qtyText(i)}</span>}</td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtMoney(i.amountPaise)}</td>
                      {editable && i.source === 'ADJUSTMENT' && <td className="pr-2"><button type="button" data-testid="pr-remove-adj" className="text-xs text-rose-600 bg-transparent border-0 cursor-pointer" disabled={busy} onClick={() => run(() => payrollService.removeAdjustment(brandId, p.id, i.refId), 'Entry removed.')}>Remove</button></td>}
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right">{fmtMoney(total)}</td>{editable && <td />}</tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 p-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="pr-summary">
          <span>Paid days: <b>{fmtDays(s.paidDayCenti)}</b></span><span>Present: <b>{s.present}</b></span><span>Paid leave: <b>{s.paidLeave}</b></span><span>Unpaid leave: <b>{s.unpaidLeave}</b></span>
          <span>Absent: <b>{s.absent}</b></span><span>Late: <b>{s.late}</b></span><span>Half days: <b>{s.halfDay}</b></span><span>Holidays/offs: <b>{(s.holiday || 0) + (s.weeklyOff || 0)}</b></span>
          <span className="col-span-2">Missed selfies (audit only, no effect on pay): <b data-testid="pr-selfie">{p.selfieMissedCount}</b></span>
        </div>

        {editable && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-slate-500">Review and adjust</p>
            {p.overtimeCandidateMinutes > 0 && (
              <div className="flex flex-wrap items-end gap-3">
                <Labeled label={`Overtime worked: ${fmtMinutes(p.overtimeCandidateMinutes)}. Minutes to approve`}><input data-testid="pr-ot" type="number" min="0" max={p.overtimeCandidateMinutes} className={`${inputCls} w-36`} value={ot} onChange={(e) => setOt(e.target.value)} /></Labeled>
                <button type="button" data-testid="pr-ot-save" className={btnGhost} disabled={busy} onClick={() => run(() => payrollService.setOvertime(brandId, p.id, Number(ot)), 'Overtime saved.')}>Approve overtime</button>
              </div>
            )}
            <div className="grid sm:grid-cols-4 gap-2 items-end">
              <Labeled label="Add"><select data-testid="pr-adj-type" className={inputCls} value={adj.type} onChange={(e) => setAdj({ ...adj, type: e.target.value })}><option value="BONUS">Bonus</option><option value="INCENTIVE">Incentive</option><option value="DEDUCTION">Other deduction</option></select></Labeled>
              <Labeled label="Amount (₹)"><input data-testid="pr-adj-amount" inputMode="decimal" className={inputCls} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} /></Labeled>
              <Labeled label="Reason (audited)"><input data-testid="pr-adj-desc" className={inputCls} value={adj.description} onChange={(e) => setAdj({ ...adj, description: e.target.value })} /></Labeled>
              <button type="button" data-testid="pr-adj-add" className={btnGhost} disabled={busy} onClick={() => run(async () => { const r = await payrollService.addAdjustment(brandId, p.id, adj); setAdj({ ...adj, amount: '', description: '' }); return r; }, 'Entry added.')}>Add to payroll</button>
            </div>
            <button type="button" data-testid="pr-recalc" className={btnGhost} disabled={busy} onClick={() => run(() => payrollService.recalculate(brandId, p.id), 'Recalculated from the latest attendance.')}>Recalculate from attendance</button>
          </div>
        )}

        <div className="flex flex-wrap gap-2" data-testid="pr-actions">
          {p.status === 'CALCULATED' && <button type="button" data-testid="pr-submit" className={btnPrimary} disabled={busy} onClick={() => run(() => payrollService.submit(brandId, p.id), 'Submitted for approval.')}>Submit for approval</button>}
          {canApprove && <button type="button" data-testid="pr-approve" className={btnPrimary} disabled={busy} onClick={() => run(() => payrollService.approve(brandId, p.id), 'Approved. Attendance for this period is locked.')}>Approve payroll</button>}
          {p.status === 'PENDING_APPROVAL' && (isSuper || p.policy?.adminCanApprove) && <button type="button" data-testid="pr-reject" className={btnGhost} disabled={busy} onClick={() => setAsk({ kind: 'reject' })}>Send back</button>}
          {p.status === 'PENDING_APPROVAL' && !canApprove && <span className="text-xs text-slate-500 self-center" data-testid="pr-needs-super">Waiting for a Super Admin to approve.</span>}
          {p.status !== 'CANCELLED' && p.status !== 'PAID' && (editable || p.status === 'PENDING_APPROVAL' || isSuper) && <button type="button" data-testid="pr-cancel" className={btnDanger} disabled={busy} onClick={() => setAsk({ kind: 'cancel' })}>Cancel payroll</button>}
        </div>

        {(canPay || p.payments.length > 0) && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-3" data-testid="pr-payments">
            <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-slate-500">Salary payments</p>
            {canPay && (
              <div className="grid sm:grid-cols-5 gap-2 items-end">
                <Labeled label={`Amount (balance ${fmtMoney(p.balancePaise)})`}><input data-testid="pay-amount" inputMode="decimal" className={inputCls} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Labeled>
                <Labeled label="Method"><select data-testid="pay-method" className={inputCls} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Labeled>
                <Labeled label="Reference / UTR"><input data-testid="pay-ref" className={inputCls} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Labeled>
                <Labeled label="Paid on"><input data-testid="pay-date" type="date" max={today()} className={inputCls} value={pay.paidOn} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} /></Labeled>
                <button type="button" data-testid="pay-record" className={btnPrimary} disabled={busy} onClick={() => run(async () => { const r = await payrollService.pay(brandId, p.id, { ...pay, idempotencyKey: `${p.id}-${pay.amount}-${pay.reference}-${Date.now()}`.slice(0, 80) }); setPay({ ...pay, amount: '', reference: '', remarks: '' }); return { payroll: r.payroll }; }, 'Payment recorded.')}>Record payment</button>
                <Labeled className="sm:col-span-5" label="Remarks (optional)"><input data-testid="pay-remarks" className={inputCls} value={pay.remarks} onChange={(e) => setPay({ ...pay, remarks: e.target.value })} /></Labeled>
              </div>
            )}
            <p className="m-0 text-[11px] text-slate-400">This records a payment that was already made. No money is moved from here.</p>
            {p.payments.length > 0 && (
              <table className="w-full text-sm" data-testid="pay-list">
                <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-1.5">Date</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th><th>By</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {p.payments.map((x) => (
                    <tr key={x.id} data-testid="pay-row" data-status={x.status} className={x.status === 'REVERSED' ? 'text-slate-400 line-through' : ''}>
                      <td className="py-1.5">{x.paidOn}</td><td>{METHOD_LABEL[x.method]}</td><td>{x.reference || '-'}</td><td className="text-right font-semibold">{fmtMoney(x.amountPaise)}</td><td>{x.recordedBy?.name}</td>
                      <td className="text-right">{isSuper && x.status === 'RECORDED' && <button type="button" data-testid="pay-reverse" className="text-xs text-rose-600 bg-transparent border-0 cursor-pointer" onClick={() => setAsk({ kind: 'reverse', paymentId: x.id })}>Reverse</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div>
          <button type="button" data-testid="pr-days-toggle" className={btnGhost} onClick={() => setShowDays(!showDays)}>{showDays ? 'Hide' : 'Show'} day-by-day attendance used</button>
          {showDays && (
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs" data-testid="pr-days">
                <thead><tr className="bg-slate-50 text-left uppercase text-slate-500"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Counted as</th><th className="px-3 py-2">Worked</th><th className="px-3 py-2">Note</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{p.days.map((d) => <tr key={d.date}><td className="px-3 py-1.5">{d.date}</td><td className={`px-3 py-1.5 font-bold ${DAY_CLS[d.cls] || ''}`}>{d.cls.replace('_', ' ')}</td><td className="px-3 py-1.5">{d.workedMinutes ? fmtMinutes(d.workedMinutes) : '-'}</td><td className="px-3 py-1.5 text-slate-500">{d.note}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>

        {p.history && (
          <div>
            <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Audit trail</p>
            <ul className="m-0 p-0 list-none space-y-1.5 text-xs text-slate-600" data-testid="pr-history">
              {[...p.history].reverse().map((h, i) => <li key={i}><b>{h.action.replace(/_/g, ' ').toLowerCase()}</b> · {h.by?.name || 'system'} · {new Date(h.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{h.note ? ` · ${h.note}` : ''}</li>)}
            </ul>
          </div>
        )}
      </div>
      {ask && (
        <Modal title={ask.kind === 'reject' ? 'Send back to the preparer' : ask.kind === 'cancel' ? 'Cancel this payroll' : 'Reverse this payment'} onClose={() => { setAsk(null); setAskText(''); }} testId="pr-ask"
          footer={<><button type="button" className={btnGhost} onClick={() => { setAsk(null); setAskText(''); }}>Back</button><button type="button" data-testid="pr-ask-ok" className={btnPrimary} onClick={submitAsk}>Confirm</button></>}>
          <Labeled label="Reason (kept in the audit trail)"><textarea data-testid="pr-ask-text" rows={3} className={inputCls} value={askText} onChange={(e) => setAskText(e.target.value)} /></Labeled>
        </Modal>
      )}
    </Drawer>
  );
}
