import React, { useCallback, useEffect, useState } from 'react';
import payrollService from '../../../../services/payrollService';
import { Card, Empty, Notice, Spinner, btnGhost, btnPrimary, inputCls } from '../../../employee/components/ui';
import { Labeled, Pager, fmtMoney, today } from './payrollUi';

const TYPES = { BONUS: 'Bonus', INCENTIVE: 'Incentive', DEDUCTION: 'Other deduction', ADVANCE: 'Advance' };

export default function AdjustmentsTab({ brandId, version, onChanged }) {
  const [emps, setEmps] = useState([]);
  const [form, setForm] = useState({ employeeId: '', type: 'ADVANCE', amount: '', date: today(), description: '', recoveryMode: 'FULL', installment: '' });
  const [filter, setFilter] = useState({ type: '', status: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { payrollService.salaryList(brandId, { limit: 200 }).then((r) => setEmps(r.employees)).catch(() => {}); }, [brandId]);
  const load = useCallback(() => payrollService.adjustments(brandId, { ...filter, page, limit: 25 }).then(setData).catch((e) => setError(e.message)), [brandId, filter, page, version]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setError(''); setMsg('');
    try { await payrollService.createAdjustment(brandId, form); setMsg('Saved.'); setForm({ ...form, amount: '', description: '', installment: '' }); load(); onChanged?.(); } catch (e) { setError(e.message); }
  };
  const cancel = async (id) => {
    const reason = window.prompt('Reason for cancelling this entry?');
    if (!reason) return;
    try { await payrollService.cancelAdjustment(brandId, id, reason); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card title="Add a bonus, deduction or advance">
        <div className="grid sm:grid-cols-3 gap-3" data-testid="adj-form">
          <Labeled label="Employee"><select data-testid="adj-emp" className={inputCls} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Choose…</option>{emps.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}</select></Labeled>
          <Labeled label="Type"><select data-testid="adj-type" className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Labeled>
          <Labeled label="Amount (₹)"><input data-testid="adj-amount" inputMode="decimal" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Labeled>
          <Labeled label={form.type === 'ADVANCE' ? 'Given on' : 'Date it belongs to'}><input data-testid="adj-date" type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Labeled>
          <Labeled label="Note / reason" className="sm:col-span-2"><input data-testid="adj-desc" className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Labeled>
          {form.type === 'ADVANCE' && (
            <>
              <Labeled label="Recovered"><select data-testid="adj-mode" className={inputCls} value={form.recoveryMode} onChange={(e) => setForm({ ...form, recoveryMode: e.target.value })}><option value="FULL">All from the next payroll</option><option value="INSTALLMENT">In instalments</option></select></Labeled>
              {form.recoveryMode === 'INSTALLMENT' && <Labeled label="Instalment per payroll (₹)"><input data-testid="adj-inst" inputMode="decimal" className={inputCls} value={form.installment} onChange={(e) => setForm({ ...form, installment: e.target.value })} /></Labeled>}
            </>
          )}
        </div>
        {error && <div className="mt-3"><Notice type="error">{error}</Notice></div>}
        {msg && <div className="mt-3"><Notice type="success">{msg}</Notice></div>}
        <button type="button" data-testid="adj-save" className={`${btnPrimary} mt-3`} onClick={save}>Save entry</button>
        <p className="m-0 mt-2 text-[11px] text-slate-400">Bonuses and deductions go into the next payroll that covers their date. Advances are recovered automatically, never taking net pay below zero.</p>
      </Card>
      <Card>
        <div className="flex gap-3 mb-3">
          <select data-testid="adj-ftype" className={`${inputCls} !w-auto`} value={filter.type} onChange={(e) => { setFilter({ ...filter, type: e.target.value }); setPage(1); }}><option value="">All types</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select data-testid="adj-fstatus" className={`${inputCls} !w-auto`} value={filter.status} onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}><option value="">Any status</option><option value="ACTIVE">Waiting for payroll</option><option value="ATTACHED">In a draft payroll</option><option value="APPLIED">Applied</option><option value="CANCELLED">Cancelled</option></select>
        </div>
        {!data && <Spinner />}
        {data && data.adjustments.length === 0 && <Empty>Nothing here yet.</Empty>}
        {data && data.adjustments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="adj-table">
              <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">Date</th><th>Employee</th><th>Type</th><th className="text-right">Amount</th><th className="text-right">Outstanding</th><th>Status</th><th>Note</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.adjustments.map((a) => (
                  <tr key={a.id} data-testid="adj-row" data-type={a.type}><td className="py-2">{a.date}</td><td>{a.employeeCode}</td><td>{a.typeLabel}</td><td className="text-right font-semibold">{fmtMoney(a.amountPaise)}</td><td className="text-right">{a.type === 'ADVANCE' ? fmtMoney(a.outstandingPaise) : '-'}</td><td>{a.status.toLowerCase()}</td><td className="text-slate-500">{a.description}</td>
                    <td className="text-right">{['ACTIVE'].includes(a.status) && !(a.type === 'ADVANCE' && a.recoveredPaise > 0) && <button type="button" data-testid="adj-cancel" className={btnGhost} onClick={() => cancel(a.id)}>Cancel</button>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
      </Card>
    </div>
  );
}
