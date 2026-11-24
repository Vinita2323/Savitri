import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import payrollService from '../../../../services/payrollService';
import { Card, Empty, Notice, Spinner, btnGhost, inputCls } from '../../../employee/components/ui';
import { fmtMoney, monthStart, today, TYPE_LABEL } from './payrollUi';

const REPORTS = [
  ['monthly', 'Monthly payroll'], ['weekly', 'Weekly payroll'], ['daily-wage', 'Daily wage'], ['employee-wise', 'Employee-wise salary'],
  ['outstanding', 'Outstanding salary'], ['deductions', 'Deductions'], ['payments', 'Payment history'], ['advances', 'Advances'],
];

export default function ReportsTab({ brandId, version, departments }) {
  const [type, setType] = useState('monthly');
  const [f, setF] = useState({ from: monthStart().slice(0, 4) + '-01-01', to: today(), department: '', salaryType: '' });
  const [t, setT] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { setT(null); setError(''); payrollService.report(brandId, type, f).then(setT).catch((e) => setError(e.message)); }, [brandId, type, f, version]);

  const dl = async (format) => {
    setBusy(format); setError('');
    try { await payrollService.downloadReport(brandId, type, f, format); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const show = (c, v) => (c.type === 'money' ? fmtMoney(v) : v ?? '');

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500">Report<select data-testid="rp-type" className={`${inputCls} mt-1`} value={type} onChange={(e) => setType(e.target.value)}>{REPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="rp-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="rp-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Department<select data-testid="rp-dept" className={`${inputCls} mt-1`} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">All</option>{(departments || []).map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Salary type<select data-testid="rp-stype" className={`${inputCls} mt-1`} value={f.salaryType} onChange={(e) => setF({ ...f, salaryType: e.target.value })}><option value="">All</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <span className="flex-1" />
          <button type="button" data-testid="rp-xlsx" className={btnGhost} disabled={!!busy} onClick={() => dl('xlsx')}><FileSpreadsheet className="w-4 h-4 inline mr-1" />{busy === 'xlsx' ? 'Preparing…' : 'Excel'}</button>
          <button type="button" data-testid="rp-pdf" className={btnGhost} disabled={!!busy} onClick={() => dl('pdf')}><FileText className="w-4 h-4 inline mr-1" />{busy === 'pdf' ? 'Preparing…' : 'PDF'}</button>
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!t && !error && <Spinner />}
      {t && (
        <Card title={t.title}>
          {t.rows.length === 0 ? <Empty>No records for these filters.</Empty> : (
            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="w-full text-sm" data-testid="rp-table">
                <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">{t.columns.map((c) => <th key={c.key} className={`px-3 py-3 whitespace-nowrap ${c.type === 'money' || c.type === 'int' ? 'text-right' : ''}`}>{c.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {t.rows.map((r, i) => <tr key={i} data-testid="rp-row">{t.columns.map((c) => <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.type === 'money' || c.type === 'int' ? 'text-right' : ''}`}>{show(c, r[c.key])}</td>)}</tr>)}
                  <tr className="bg-slate-50 font-bold" data-testid="rp-total">{t.columns.map((c, i) => <td key={c.key} className={`px-3 py-2 ${c.type === 'money' || c.type === 'int' ? 'text-right' : ''}`}>{i === 0 ? 'Total' : c.key in (t.totals || {}) ? show(c, t.totals[c.key]) : ''}</td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
