import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogIn, LogOut } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { Badge, Card, Empty, Notice, Spinner, Stat, btnGhost, btnPrimary, fmtDate, fmtDateTime, fmtDuration, fmtTime } from '../components/ui';

export default function PortalDashboard() {
  const { employee } = useEmployeeAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => employeePortalService.dashboard().then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  if (error && !data) return <Notice type="error">{error}</Notice>;
  if (!data) return <Spinner />;

  const { today, tasks, rules } = data;
  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 m-0">Welcome, {employee?.fullName?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-1 mb-0">
          {employee?.employeeId} · {employee?.designation}, {employee?.department} · {employee?.brandName}
        </p>
      </div>

      {error && <Notice type="error">{error}</Notice>}

      <Card
        title="Today's attendance"
        action={
          today.isCheckedIn ? (
            <button type="button" className={btnGhost} disabled={busy} onClick={() => act(() => employeePortalService.checkOut())}>
              <LogOut className="w-4 h-4" /> Check out
            </button>
          ) : (
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => act(() => employeePortalService.checkIn())}>
              <LogIn className="w-4 h-4" /> Check in
            </button>
          )
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div><p className="text-xs text-slate-500 font-semibold m-0">STATUS</p><div className="mt-1.5"><Badge status={today.status} /></div></div>
          <div><p className="text-xs text-slate-500 font-semibold m-0">FIRST LOGIN</p><p className="text-lg font-bold text-slate-900 mt-1 mb-0">{fmtTime(today.firstLogin)}</p></div>
          <div>
            <p className="text-xs text-slate-500 font-semibold m-0">CHECK-IN / OUT</p>
            <p className="text-lg font-bold text-slate-900 mt-1 mb-0">{today.isCheckedIn ? 'Checked in' : today.lastLogout ? `Out at ${fmtTime(today.lastLogout)}` : 'Not checked in'}</p>
          </div>
          <div><p className="text-xs text-slate-500 font-semibold m-0">WORKING HOURS</p><p className="text-lg font-bold text-slate-900 mt-1 mb-0">{fmtDuration(today.workedMinutes)}</p></div>
        </div>
        <p className="text-xs text-slate-400 mt-4 mb-0">
          Office starts {rules.officeStartTime} (grace {rules.graceMinutes} min) · {today.loginCount} login{today.loginCount === 1 ? '' : 's'} today
          {today.lateMinutes > 0 && <span className="text-amber-600 font-semibold"> · {today.lateMinutes} min late</span>}
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Assigned" value={tasks.total} />
        <Stat label="Pending" value={tasks.pending} tone="amber" />
        <Stat label="In progress" value={tasks.inProgress} tone="violet" />
        <Stat label="Under review" value={tasks.underReview} tone="blue" />
        <Stat label="Completed" value={tasks.completed} tone="green" />
        <Stat label="Overdue" value={tasks.overdue} tone="red" />
      </div>

      <Card title="Upcoming holidays" action={<Link to="/employee/holidays" className="text-sm font-semibold text-emerald-700">View all</Link>}>
        {!data.upcomingHolidays?.length ? (
          <Empty>No upcoming holidays have been announced yet.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 list-none p-0 m-0">
            {data.upcomingHolidays.map((h) => (
              <li key={h._id} className="py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{h.name}{h.isOptional && <span className="ml-2 text-xs font-medium text-slate-400">(optional)</span>}</span>
                <span className="text-sm text-slate-600 whitespace-nowrap">{fmtDate(h.dateString + 'T12:00:00+05:30')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Recent notifications${data.unreadNotifications ? ` (${data.unreadNotifications} new)` : ''}`} action={<Link to="/employee/notifications" className="text-sm font-semibold text-emerald-700">View all</Link>}>
        {data.notifications.length === 0 ? (
          <Empty>No notifications yet.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 list-none p-0 m-0">
            {data.notifications.map((n) => (
              <li key={n._id} className="py-3 flex gap-3">
                <span className={`mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}><Bell className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <p className={`text-sm m-0 ${n.isRead ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                  {n.message && <p className="text-xs text-slate-500 m-0 mt-0.5 break-words">{n.message}</p>}
                  <p className="text-xs text-slate-400 m-0 mt-0.5">{fmtDateTime(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
