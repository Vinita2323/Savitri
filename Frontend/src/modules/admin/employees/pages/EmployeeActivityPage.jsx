import React, { useCallback, useEffect, useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { employeeManagementService } from '../../../../services/employeeService';
import { Badge, Card, Empty, Notice, Spinner, btnGhost, fmtDateTime, inputCls } from '../../../employee/components/ui';

const ACTIONS = ['', 'registration_submitted', 'registration_approved', 'registration_rejected', 'login', 'check_out', 'task_created', 'task_submitted', 'task_approve', 'task_changes', 'task_reject', 'leave_applied', 'leave_approved', 'leave_rejected', 'attendance_corrected', 'attendance_rules_updated', 'department_created', 'employee_status_changed', 'admin_brand_access_changed'];

const label = (a) => a.replace(/_/g, ' ');

export const EmployeeActivityPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    return employeeManagementService.activity({ action: action || undefined, page, limit: 25 }).then(setData).catch((e) => setError(e.message));
  }, [action, page]);
  useEffect(() => { setData(null); load(); }, [load, activeBrandId]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="activity" onNavigate={onNavigate} />
      <div className="px-6 pt-6 space-y-5">
        <div className="flex justify-end">
          <select className={`${inputCls} !w-auto`} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a ? label(a) : 'All activity'}</option>)}
          </select>
        </div>
        {error && <Notice type="error">{error}</Notice>}
        {!data && !error && <Spinner />}
        {data && (
          <Card>
            {data.logs.length === 0 ? <Empty>No activity recorded yet.</Empty> : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold">When</th><th className="px-3 py-3 font-semibold">Action</th><th className="px-3 py-3 font-semibold">By</th><th className="px-3 py-3 font-semibold">Employee</th><th className="px-3 py-3 font-semibold">Details</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.logs.map((l) => (
                      <tr key={l._id} className="align-top hover:bg-slate-50/60">
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">{fmtDateTime(l.createdAt)}</td>
                        <td className="px-3 py-3"><span className="font-semibold text-slate-800 capitalize">{label(l.action)}</span></td>
                        <td className="px-3 py-3 text-slate-700">{l.actor?.name || l.actor?.email || '—'} <Badge tone={l.actor?.type === 'employee' ? 'blue' : l.actor?.type === 'super_admin' ? 'violet' : 'slate'}>{String(l.actor?.type || 'system').replace('_', ' ')}</Badge></td>
                        <td className="px-3 py-3 text-slate-700">{l.employeeCode || '—'}</td>
                        <td className="px-3 py-3 text-xs text-slate-500 max-w-xs break-words">{l.details ? JSON.stringify(l.details).slice(0, 160) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="text-slate-500">Page {data.page} of {data.pages}</span>
            <button type="button" className={btnGhost} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeActivityPage;
