import React, { useEffect, useState } from 'react';
import payrollService from '../../../../services/payrollService';
import { Card, Empty, Notice, Spinner, btnPrimary } from '../../../employee/components/ui';
import { Pager } from './payrollUi';

const Check = ({ label, hint, checked, onChange, testId, disabled }) => (
  <label className={`flex items-start gap-2 text-sm text-slate-700 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" data-testid={testId} className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}<span className="block text-[11px] text-slate-400">{hint}</span></span>
  </label>
);

export default function PolicyAuditTab({ brandId, isSuper }) {
  const [pol, setPol] = useState(null);
  const [can, setCan] = useState(false);
  const [scopeName, setScopeName] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [audit, setAudit] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { payrollService.policy(brandId).then((r) => { setPol(r.policy); setCan(r.canEdit); setScopeName(r.scope); }).catch((e) => setError(e.message)); }, [brandId]);
  useEffect(() => { if (isSuper) payrollService.audit(brandId, { page, limit: 20 }).then(setAudit).catch((e) => setError(e.message)); }, [brandId, isSuper, page, msg]);

  const save = async () => {
    setError(''); setMsg('');
    try { const r = await payrollService.savePolicy(brandId, { ...pol, scope: scopeName }); setPol(r.policy); setMsg('Policy saved.'); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card title={`Approval and permission policy (${scopeName === 'GLOBAL' ? 'all brands' : scopeName})`}>
        {!pol && !error && <Spinner />}
        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        {pol && (
          <div className="space-y-3" data-testid="policy">
            {!can && <Notice type="info">Only a Super Admin can change these settings.</Notice>}
            <Check testId="pol-approve" disabled={!can} label="Admins can approve payroll" hint="Off: only a Super Admin approves." checked={pol.adminCanApprove} onChange={(v) => setPol({ ...pol, adminCanApprove: v })} />
            <Check testId="pol-self" disabled={!can} label="An Admin may approve a payroll they submitted themselves" hint="Off keeps two people involved (maker and checker)." checked={pol.allowSelfApproval} onChange={(v) => setPol({ ...pol, allowSelfApproval: v })} />
            <Check testId="pol-pay" disabled={!can} label="Admins can record salary payments" hint="Reversing a payment is always Super Admin only." checked={pol.adminCanRecordPayments} onChange={(v) => setPol({ ...pol, adminCanRecordPayments: v })} />
            <Check testId="pol-ot" disabled={!can} label="Pay all detected overtime automatically" hint="Off: only the overtime minutes an admin approves are paid." checked={pol.overtimeApproval === 'AUTO'} onChange={(v) => setPol({ ...pol, overtimeApproval: v ? 'AUTO' : 'MANUAL' })} />
            {can && <button data-perm="super.only" type="button" data-testid="pol-save" className={btnPrimary} onClick={save}>Save policy</button>}
          </div>
        )}
      </Card>
      {isSuper && (
        <Card title="Payroll audit trail">
          {!audit && <Spinner />}
          {audit && audit.logs.length === 0 && <Empty>Nothing recorded yet.</Empty>}
          {audit && audit.logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="audit-table">
                <thead><tr className="text-left uppercase text-slate-500"><th className="py-2">When</th><th>Action</th><th>By</th><th>Employee</th><th>Details</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{audit.logs.map((l) => <tr key={l._id} data-testid="audit-row"><td className="py-1.5 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td><td className="font-bold">{l.action.replace(/_/g, ' ')}</td><td>{l.actor?.name || l.actor?.email}</td><td>{l.employeeCode}</td><td className="text-slate-500 max-w-xs truncate">{l.details ? JSON.stringify(l.details) : ''}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {audit && <Pager page={audit.page} pages={audit.pages} onPage={setPage} />}
        </Card>
      )}
    </div>
  );
}
