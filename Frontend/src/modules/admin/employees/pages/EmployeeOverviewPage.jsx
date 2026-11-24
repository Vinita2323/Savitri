import React, { useCallback, useEffect, useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { employeeManagementService } from '../../../../services/employeeService';
import { Card, Notice, Spinner, Stat } from '../../../employee/components/ui';

export const EmployeeOverviewPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    return employeeManagementService.overview().then(setO).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setO(null);
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load, activeBrandId]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="overview" onNavigate={onNavigate} />
      <div className="px-6 pt-6 space-y-6">
        {error && <Notice type="error">{error}</Notice>}
        {!o && !error && <Spinner />}
        {o && (
          <>
            {o.pendingRegistrations > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
                <p className="m-0 text-sm font-semibold text-amber-900">{o.pendingRegistrations} employee registration{o.pendingRegistrations === 1 ? '' : 's'} waiting for approval</p>
                <button type="button" onClick={() => onNavigate?.('registrations')} className="text-sm font-bold text-amber-900 underline cursor-pointer bg-transparent border-0">Review now</button>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total employees" value={o.totalEmployees} />
              <Stat label="Active employees" value={o.activeEmployees} tone="green" />
              <Stat label="Pending registrations" value={o.pendingRegistrations} tone="amber" />
              <Stat label="Pending leave requests" value={o.pendingLeaves} tone="blue" />
              <Stat label="Present today" value={o.presentToday} tone="green" hint={o.lateToday ? `${o.lateToday} late` : ''} />
              <Stat label="Absent today" value={o.absentToday} tone="red" hint={!o.isWorkingDay ? 'Not a working day' : ''} />
              <Stat label="On leave" value={o.onLeaveToday} tone="blue" />
              <Stat label="Overdue tasks" value={o.tasksOverdue} tone="red" />
              <Stat label="Tasks completed" value={o.tasksCompleted} tone="green" />
              <Stat label="Tasks pending" value={o.tasksPending} tone="amber" />
              <Stat label="Awaiting review" value={o.tasksUnderReview} tone="violet" />
              <Stat label="Total tasks" value={o.tasksTotal} />
            </div>
            {o.brandStats?.length > 0 && (
              <Card title="Brand-wise employees">
                <div className="overflow-x-auto -mx-5 -my-5">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold">Brand</th><th className="px-3 py-3 font-semibold">Employees</th><th className="px-3 py-3 font-semibold">Active</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {o.brandStats.map((b) => (<tr key={b.brandId}><td className="px-5 py-3 font-semibold text-slate-800">{b.name}</td><td className="px-3 py-3">{b.total}</td><td className="px-3 py-3 text-emerald-700 font-semibold">{b.active}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeOverviewPage;
