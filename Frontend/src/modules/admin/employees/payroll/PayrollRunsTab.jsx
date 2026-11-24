import React, { useCallback, useEffect, useMemo, useState } from 'react';
import payrollService from '../../../../services/payrollService';
import { Card, Empty, Notice, Spinner, btnGhost, btnPrimary, inputCls } from '../../../employee/components/ui';
import { Pager, StatusPill, TYPE_LABEL, STATUS_STYLE, fmtMoney, useDebounced, today } from './payrollUi';
import PayrollDrawer from './PayrollDrawer';

const addDays = (ds, n) => new Date(new Date(`${ds}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

function Generate({ brandId, onDone }) {
  const [freq, setFreq] = useState('MONTHLY');
  const [period, setPeriod] = useState({ periodFrom: '', periodTo: '' });
  const [emps, setEmps] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [dept, setDept] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { payrollService.nextPeriod(brandId, { frequency: freq }).then((r) => setPeriod({ periodFrom: r.periodFrom, periodTo: r.periodTo })).catch(() => {}); }, [brandId, freq]);
  useEffect(() => { payrollService.salaryList(brandId, { configured: 'YES', limit: 200 }).then((r) => setEmps(r.employees)).catch((e) => setError(e.message)); }, [brandId]);

  const shown = useMemo(() => emps.filter((e) => !dept || e.department === dept), [emps, dept]);
  const depts = [...new Set(emps.map((e) => e.department).filter(Boolean))].sort();
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = shown.length > 0 && shown.every((e) => sel.has(e.id));

  const go = async () => {
    setBusy(true); setError(''); setResult(null);
    try { const r = await payrollService.generate(brandId, { employeeIds: [...sel], ...period }); setResult(r); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Card title="Run payroll">
      <div className="space-y-3" data-testid="gen">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500">Suggest the last completed<select data-testid="gen-freq" className={`${inputCls} mt-1`} value={freq} onChange={(e) => setFreq(e.target.value)}><option value="MONTHLY">month</option><option value="WEEKLY">week (Mon to Sun)</option><option value="DAILY">day</option></select></label>
          <label className="text-xs font-semibold text-slate-500">Period from<input data-testid="gen-from" type="date" className={`${inputCls} mt-1`} value={period.periodFrom} max={addDays(today(), -1)} onChange={(e) => setPeriod({ ...period, periodFrom: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Period to<input data-testid="gen-to" type="date" className={`${inputCls} mt-1`} value={period.periodTo} max={addDays(today(), -1)} onChange={(e) => setPeriod({ ...period, periodTo: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Department<select data-testid="gen-dept" className={`${inputCls} mt-1`} value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></label>
        </div>
        <p className="m-0 text-xs text-slate-500">A period must be completely over so attendance is final. Payroll is calculated from approved attendance and leave; selfie records never change pay.</p>
        {emps.length === 0 ? <Empty>No employee has a salary set up yet. Use the Salary setup tab first.</Empty> : (
          <div className="rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-xs font-bold sticky top-0"><input type="checkbox" data-testid="gen-all" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(shown.map((e) => e.id)))} /> Select all ({shown.length})</label>
            {shown.map((e) => (
              <label key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm border-t border-slate-100 cursor-pointer" data-testid="gen-emp">
                <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} /> {e.name} <span className="text-xs text-slate-400">{e.employeeId} · {TYPE_LABEL[e.salary.salaryType]}</span>
              </label>
            ))}
          </div>
        )}
        {error && <Notice type="error">{error}</Notice>}
        <button type="button" data-testid="gen-go" className={btnPrimary} disabled={busy || sel.size === 0} onClick={go}>{busy ? 'Calculating…' : `Calculate payroll for ${sel.size} employee(s)`}</button>
        {result && (
          <div data-testid="gen-result" className="text-sm space-y-1">
            <Notice type={result.created ? 'success' : 'warning'}>{result.created} payroll(s) created, {result.skipped} skipped.</Notice>
            {result.results.filter((r) => !r.ok).map((r) => <p key={r.employee} className="m-0 text-xs text-rose-700" data-testid="gen-skip">{r.name}: {r.reason}</p>)}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PayrollRunsTab({ brandId, isSuper, version, onChanged, departments }) {
  const [f, setF] = useState({ status: '', search: '', from: '', to: '', department: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const search = useDebounced(f.search);

  const load = useCallback(() => payrollService.payrolls(brandId, { ...f, search, page, limit: 25 }).then(setData).catch((e) => setError(e.message)), [brandId, f.status, f.from, f.to, f.department, search, page, version]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const set = (p) => { setF({ ...f, ...p }); setPage(1); };

  return (
    <div className="space-y-4">
      <Generate brandId={brandId} onDone={() => { load(); onChanged?.(); }} />
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500 flex-1 min-w-[160px]">Search<input data-testid="pl-search" className={`${inputCls} mt-1`} placeholder="Name, ID or payroll no." value={f.search} onChange={(e) => set({ search: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Status<select data-testid="pl-status" className={`${inputCls} mt-1`} value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">All</option>{Object.entries(STATUS_STYLE).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Department<select data-testid="pl-dept" className={`${inputCls} mt-1`} value={f.department} onChange={(e) => set({ department: e.target.value })}><option value="">All</option>{(departments || []).map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="pl-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="pl-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
          {(f.status || f.from || f.to || f.department) && <button type="button" className={btnGhost} onClick={() => set({ status: '', from: '', to: '', department: '' })}>Clear</button>}
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <Card>
          {data.payrolls.length === 0 ? <Empty>No payrolls yet.</Empty> : (
            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="w-full text-sm" data-testid="pl-table">
                <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3">Employee</th><th className="px-3 py-3">Period</th><th className="px-3 py-3">Type</th><th className="px-3 py-3 text-right">Gross</th><th className="px-3 py-3 text-right">Deductions</th><th className="px-3 py-3 text-right">Net</th><th className="px-3 py-3 text-right">Paid</th><th className="px-3 py-3">Status</th><th className="px-3 py-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.payrolls.map((p) => (
                    <tr key={p.id} data-testid="pl-row" data-code={p.employeeCode} data-status={p.status}>
                      <td className="px-5 py-3"><p className="m-0 font-bold">{p.employeeName}</p><p className="m-0 text-xs text-slate-500">{p.employeeCode} · {p.payrollCode}</p></td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs">{p.periodFrom}<br />{p.periodTo}</td>
                      <td className="px-3 py-3">{TYPE_LABEL[p.salaryType]}</td>
                      <td className="px-3 py-3 text-right">{fmtMoney(p.grossPaise)}</td>
                      <td className="px-3 py-3 text-right text-rose-700">{fmtMoney(p.deductionsPaise)}</td>
                      <td className="px-3 py-3 text-right font-bold" data-testid="pl-net">{fmtMoney(p.netPaise)}</td>
                      <td className="px-3 py-3 text-right">{fmtMoney(p.paidPaise)}</td>
                      <td className="px-3 py-3"><StatusPill status={p.status} /></td>
                      <td className="px-3 py-3 text-right"><button type="button" data-testid="pl-open" className={btnGhost} onClick={() => setOpen(p.id)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
      {open && <PayrollDrawer id={open} brandId={brandId} isSuper={isSuper} onClose={() => setOpen(null)} onChanged={() => { load(); onChanged?.(); }} />}
    </div>
  );
}
