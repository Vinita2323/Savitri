import React, { useEffect, useState } from 'react';
import payrollService from '../../../../services/payrollService';
import { Card, Empty, Notice, Spinner, inputCls } from '../../../employee/components/ui';
import { Stat, TYPE_LABEL, FREQ_LABEL, fmtMoney, monthStart, today } from './payrollUi';

export default function PayrollDashboardTab({ brandId, version, departments }) {
  const [f, setF] = useState({ from: monthStart(), to: today(), department: '', salaryType: '', paymentStatus: '', employeeId: '' });
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [emps, setEmps] = useState([]);

  useEffect(() => { payrollService.salaryList(brandId, { limit: 200 }).then((r) => setEmps(r.employees)).catch(() => {}); }, [brandId]);
  useEffect(() => { setError(''); payrollService.dashboard(brandId, f).then(setD).catch((e) => setError(e.message)); }, [brandId, f, version]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="pd-from" type="date" className={`${inputCls} mt-1`} value={f.from} onChange={(e) => e.target.value && setF({ ...f, from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="pd-to" type="date" className={`${inputCls} mt-1`} value={f.to} onChange={(e) => e.target.value && setF({ ...f, to: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Employee<select data-testid="pd-emp" className={`${inputCls} mt-1`} value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}><option value="">All</option>{emps.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Department<select data-testid="pd-dept" className={`${inputCls} mt-1`} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">All</option>{(departments || []).map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Salary type<select data-testid="pd-type" className={`${inputCls} mt-1`} value={f.salaryType} onChange={(e) => setF({ ...f, salaryType: e.target.value })}><option value="">All</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Payment status<select data-testid="pd-pay" className={`${inputCls} mt-1`} value={f.paymentStatus} onChange={(e) => setF({ ...f, paymentStatus: e.target.value })}><option value="">All</option><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partly paid</option><option value="PAID">Paid</option></select></label>
        </div>
      </Card>
      {error && <Notice type="error">{error}</Notice>}
      {!d && !error && <Spinner />}
      {d && (
        <>
          {d.unconfiguredEmployees > 0 && <Notice type="info">{d.unconfiguredEmployees} employee(s) have no salary set up yet. Open the Salary setup tab.</Notice>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="pd-stats">
            <Stat label="Total employees" value={d.totalEmployees} testId="pd-employees" hint={`${d.configuredEmployees} with salary`} />
            <Stat label="Estimated payroll (monthly)" value={fmtMoney(d.totalEstimatedPayrollPaise)} testId="pd-estimated" hint="From current salary setups" />
            <Stat label="Processed payroll" value={fmtMoney(d.totalProcessedPaise)} tone="blue" testId="pd-processed" hint="Approved payrolls in range" />
            <Stat label="Paid salary" value={fmtMoney(d.totalPaidPaise)} tone="green" testId="pd-paid" />
            <Stat label="Pending salary" value={fmtMoney(d.totalPendingPaise)} tone="amber" testId="pd-pending" />
            <Stat label="Total deductions" value={fmtMoney(d.totalDeductionsPaise)} tone="rose" testId="pd-deductions" />
            <Stat label="Advances outstanding" value={fmtMoney(d.totalAdvancesPaise)} tone="violet" testId="pd-advances" />
            <Stat label="Awaiting approval" value={d.awaitingApproval} testId="pd-awaiting" />
          </div>
          <Card title="Upcoming payment dates">
            {d.upcomingPayments.length === 0 ? <Empty>No salary is set up yet.</Empty> : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-sm" data-testid="pd-upcoming">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500"><th className="px-5 py-3">Date</th><th className="px-3 py-3">Employee</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Frequency</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{d.upcomingPayments.map((u) => <tr key={u.employee}><td className="px-5 py-2.5 font-semibold">{u.date}</td><td className="px-3 py-2.5">{u.name} <span className="text-xs text-slate-400">{u.employeeCode}</span></td><td className="px-3 py-2.5">{TYPE_LABEL[u.salaryType]}</td><td className="px-3 py-2.5">{FREQ_LABEL[u.frequency]}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
