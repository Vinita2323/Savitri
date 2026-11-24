import React, { useCallback, useEffect, useState } from 'react';
import payrollService from '../../../../services/payrollService';
import { Card, Empty, Notice, Spinner, btnGhost, inputCls } from '../../../employee/components/ui';
import { Pager, TYPE_LABEL, FREQ_LABEL, fmtMoney, useDebounced } from './payrollUi';
import { SalaryConfigModal } from './SalaryForm';

export default function SalarySetupTab({ brandId, version, onChanged }) {
  const [f, setF] = useState({ search: '', department: '', salaryType: '', configured: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const search = useDebounced(f.search);

  const load = useCallback(() => {
    setError('');
    return payrollService.salaryList(brandId, { ...f, search, page, limit: 25 }).then(setData).catch((e) => setError(e.message));
  }, [brandId, f.department, f.salaryType, f.configured, search, page, version]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const set = (p) => { setF({ ...f, ...p }); setPage(1); };
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500 flex-1 min-w-[180px]">Search<input data-testid="ss-search" className={`${inputCls} mt-1`} placeholder="Name or employee ID" value={f.search} onChange={(e) => set({ search: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Department<select data-testid="ss-dept" className={`${inputCls} mt-1`} value={f.department} onChange={(e) => set({ department: e.target.value })}><option value="">All</option>{(data?.departments || []).map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Salary type<select data-testid="ss-type" className={`${inputCls} mt-1`} value={f.salaryType} onChange={(e) => set({ salaryType: e.target.value })}><option value="">All</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Salary set up<select data-testid="ss-conf" className={`${inputCls} mt-1`} value={f.configured} onChange={(e) => set({ configured: e.target.value })}><option value="">All</option><option value="YES">Yes</option><option value="NO">Not yet</option></select></label>
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <Card>
          {data.employees.length === 0 ? <Empty>No employees match.</Empty> : (
            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="w-full text-sm" data-testid="ss-table">
                <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3">Employee</th><th className="px-3 py-3">Department</th><th className="px-3 py-3">Salary</th><th className="px-3 py-3">Paid</th><th className="px-3 py-3">Next payment</th><th className="px-3 py-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.map((e) => (
                    <tr key={e.id} data-testid="ss-row" data-code={e.employeeId}>
                      <td className="px-5 py-3"><p className="m-0 font-bold text-slate-900">{e.name}</p><p className="m-0 text-xs text-slate-500">{e.employeeId} · {e.designation}</p></td>
                      <td className="px-3 py-3">{e.department}</td>
                      <td className="px-3 py-3">{e.salary ? <><b>{fmtMoney(e.salary.baseAmountPaise)}</b> <span className="text-xs text-slate-500">{TYPE_LABEL[e.salary.salaryType]}</span></> : <span className="text-amber-700 text-xs font-bold">Not set up</span>}</td>
                      <td className="px-3 py-3">{e.salary ? FREQ_LABEL[e.salary.paymentFrequency] : '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.nextPaymentDate || '-'}</td>
                      <td className="px-3 py-3 text-right"><button type="button" data-testid="ss-config" className={btnGhost} onClick={() => setEdit(e)}>{e.configured ? 'View / revise' : 'Set up salary'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
      {edit && <SalaryConfigModal employee={edit} brandId={edit.brandId} onClose={() => setEdit(null)} onSaved={() => { load(); onChanged?.(); }} />}
    </div>
  );
}
