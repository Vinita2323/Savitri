import React, { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Card, Empty, Notice, Spinner, btnGhost } from '../components/ui';
import { StatusPill, TYPE_LABEL, FREQ_LABEL, METHOD_LABEL, fmtMoney, fmtDays, fmtMinutes } from '../../admin/employees/payroll/payrollUi';

const qty = (i) => (i.unit === 'DAY_CENTI' ? `${fmtDays(i.quantity)} day(s)` : i.unit === 'MINUTE' ? fmtMinutes(i.quantity) : i.code === 'LATE' ? `${i.quantity} late` : '');

const Lines = ({ items, total, title, tid }) => (
  <div className="rounded-xl border border-slate-200 overflow-hidden">
    <p className="m-0 px-3 py-2 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
    <table className="w-full text-sm" data-testid={tid}>
      <tbody className="divide-y divide-slate-100">
        {items.length === 0 && <tr><td className="px-3 py-2 text-slate-400">None</td></tr>}
        {items.map((i, k) => <tr key={i.id || k} data-testid="ps-line"><td className="px-3 py-2">{i.label}{qty(i) && <span className="block text-[11px] text-slate-400">{qty(i)}</span>}</td><td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtMoney(i.amountPaise)}</td></tr>)}
        <tr className="bg-slate-50 font-bold"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right">{fmtMoney(total)}</td></tr>
      </tbody>
    </table>
  </div>
);

export default function PortalSalary() {
  const [sal, setSal] = useState(null);
  const [rolls, setRolls] = useState([]);
  const [pays, setPays] = useState([]);
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [a, b, c] = await Promise.all([employeePortalService.salary(), employeePortalService.salaryPayrolls(), employeePortalService.salaryPayments()]);
      setSal(a); setRolls(b.payrolls); setPays(c.payments);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setDetail(null);
    try { setDetail((await employeePortalService.salaryPayroll(id)).payroll); } catch (e) { setError(e.message); }
  };
  const slip = async (id) => {
    setBusy(id); setError('');
    try { await employeePortalService.downloadSlip(id); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  if (!sal && !error) return <Spinner />;
  const st = sal?.structure;
  const cp = sal?.currentPeriod;
  return (
    <div className="space-y-4 sm:space-y-6" data-testid="salary-page">
      <div>
        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 m-0">My Salary</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 mb-0">Your salary setup, this period so far, and your salary slips. You can view them here but only your admin can change them.</p>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {sal && !sal.configured && <Card><Empty>Your salary has not been set up yet. Please contact your admin.</Empty></Card>}

      {st && (
        <Card title="Salary setup">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm" data-testid="ps-config">
            <div><p className="m-0 text-xs text-slate-500">Salary type</p><p className="m-0 font-bold" data-testid="ps-type">{TYPE_LABEL[st.salaryType]}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Amount</p><p className="m-0 font-bold" data-testid="ps-amount">{fmtMoney(st.baseAmountPaise)} <span className="text-xs font-normal text-slate-500">{{ MONTHLY: 'a month', WEEKLY: 'a week', DAILY: 'a day', HOURLY: 'an hour' }[st.salaryType]}</span></p></div>
            <div><p className="m-0 text-xs text-slate-500">Paid</p><p className="m-0 font-bold" data-testid="ps-freq">{FREQ_LABEL[st.paymentFrequency]}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Next payment date</p><p className="m-0 font-bold" data-testid="ps-next">{sal.nextPaymentDate || '-'}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Weekly off</p><p className="m-0 font-bold">{st.weeklyOffDays.join(', ') || 'None'}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Working hours a day</p><p className="m-0 font-bold">{st.workingHoursPerDay}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Paid by</p><p className="m-0 font-bold">{METHOD_LABEL[st.paymentMethod]}{st.paymentMethod === 'BANK_TRANSFER' && st.bank?.accountNumber ? ` · ${st.bank.accountNumber}` : st.paymentMethod === 'UPI' ? ` · ${st.upiId}` : ''}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Salary from</p><p className="m-0 font-bold">{st.effectiveFrom}</p></div>
          </div>
        </Card>
      )}

      {cp && (
        <Card title={`This period so far (${cp.periodFrom} to ${cp.periodTo})`}>
          <Notice type="info">An estimate from your attendance until yesterday. The final amount is set when payroll is approved.</Notice>
          <div className="grid sm:grid-cols-2 gap-4 mt-3" data-testid="ps-current">
            <Lines title="Earnings" tid="ps-earn" items={cp.lines.filter((l) => l.kind === 'EARNING')} total={cp.grossPaise} />
            <Lines title="Deductions" tid="ps-ded" items={cp.lines.filter((l) => l.kind === 'DEDUCTION')} total={cp.deductionsPaise} />
          </div>
          <p className="mt-3 mb-0 text-sm">Estimated net pay: <b className="text-emerald-700" data-testid="ps-est-net">{fmtMoney(cp.netPaise)}</b></p>
          <p className="mt-1 mb-0 text-xs text-slate-500" data-testid="ps-att">Present {cp.summary.present} · Paid leave {cp.summary.paidLeave} · Unpaid leave {cp.summary.unpaidLeave} · Absent {cp.summary.absent} · Late {cp.summary.late} · Half days {cp.summary.halfDay}</p>
        </Card>
      )}

      {sal?.advances?.length > 0 && (
        <Card title="Advances being recovered">
          <table className="w-full text-sm" data-testid="ps-advances"><tbody className="divide-y divide-slate-100">{sal.advances.map((a) => <tr key={a.id}><td className="py-2">{a.date} {a.description && <span className="text-slate-400">· {a.description}</span>}</td><td className="text-right">Given {fmtMoney(a.amountPaise)}</td><td className="text-right font-bold">Outstanding {fmtMoney(a.outstandingPaise)}</td></tr>)}</tbody></table>
        </Card>
      )}

      <Card title="Salary slips and history">
        {rolls.length === 0 ? <Empty>No approved salary yet.</Empty> : (
          <div className="space-y-2" data-testid="ps-history">
            {rolls.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200" data-testid="ps-roll">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <button type="button" className="text-left flex-1 min-w-[180px] bg-transparent border-0 cursor-pointer p-0" onClick={() => toggle(r.id)} data-testid="ps-roll-open">
                    <p className="m-0 font-bold text-slate-900">{r.periodFrom} to {r.periodTo}</p>
                    <p className="m-0 text-xs text-slate-500">Net {fmtMoney(r.netPaise)} · Paid {fmtMoney(r.paidPaise)} · Balance {fmtMoney(r.balancePaise)}</p>
                  </button>
                  <StatusPill status={r.status} />
                  <button type="button" data-testid="ps-slip" className={btnGhost} disabled={busy === r.id} onClick={() => slip(r.id)}><Download className="w-4 h-4 inline mr-1" />Slip</button>
                </div>
                {open === r.id && (
                  <div className="p-3 border-t border-slate-100 space-y-3" data-testid="ps-roll-detail">
                    {!detail ? <Spinner /> : (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Lines title="Earnings" tid="ps-d-earn" items={detail.items.filter((i) => i.kind === 'EARNING')} total={detail.grossPaise} />
                          <Lines title="Deductions" tid="ps-d-ded" items={detail.items.filter((i) => i.kind === 'DEDUCTION')} total={detail.deductionsPaise} />
                        </div>
                        <p className="m-0 text-xs text-slate-500">Paid days {fmtDays(detail.summary?.paidDayCenti)} · Present {detail.summary?.present} · Unpaid leave {detail.summary?.unpaidLeave} · Absent {detail.summary?.absent}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Payment history">
        {pays.length === 0 ? <Empty>No payment has been recorded yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="ps-payments">
              <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">Date</th><th>For period</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{pays.map((p) => <tr key={p.id} data-testid="ps-pay"><td className="py-2">{p.paidOn}</td><td>{p.periodFrom} to {p.periodTo}</td><td>{METHOD_LABEL[p.method]}</td><td>{p.reference || '-'}</td><td className="text-right font-semibold">{fmtMoney(p.amountPaise)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
