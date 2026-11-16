import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarCheck, CalendarDays, CheckSquare, LogIn, LogOut } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { Badge, Card, Empty, Notice, Spinner, fmtClock, fmtDate, fmtDateTime, fmtDuration, fmtShort, fmtTime } from '../components/ui';

const Tile = ({ label, value, tone, to }) => {
  const colors = { slate: 'text-slate-900', amber: 'text-amber-600', violet: 'text-violet-600', blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-rose-600' };
  return (
    <Link to={to} className="bg-white border border-slate-200 rounded-xl px-2 py-2.5 no-underline text-center active:bg-slate-50">
      <p className={`text-lg font-extrabold m-0 leading-none ${colors[tone]}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 mt-1.5 mb-0 uppercase tracking-wide leading-tight">{label}</p>
    </Link>
  );
};

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

  const role = [employee?.designation, employee?.department].filter((v) => v && v !== 'NA').join(' · ');

  return (
    <div className="space-y-3 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 m-0 leading-tight">Hi, {employee?.fullName?.split(' ')[0]} 👋</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 mb-0">{[employee?.employeeId, role].filter(Boolean).join(' · ')}</p>
      </div>

      {error && <Notice type="error">{error}</Notice>}

      {/* Today's attendance: the main action, big and thumb-friendly */}
      <section className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900 m-0">Today</p>
          <Badge status={today.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-500 m-0 uppercase tracking-wide">First login</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5 mb-0">{fmtTime(today.firstLogin)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-500 m-0 uppercase tracking-wide">Working time</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5 mb-0">{fmtDuration(today.workedMinutes)}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2 mb-0 leading-snug">
          {today.isCheckedIn ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" /> You are checked in</span> : today.lastLogout ? `Checked out at ${fmtTime(today.lastLogout)}` : 'You have not checked in yet'}
        </p>
        {today.lateMinutes > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2 mb-0 leading-snug">
            You arrived <strong>{fmtShort(today.lateMinutes)}</strong> after office time ({fmtClock(rules.officeStartTime, Number(rules.graceMinutes) || 0)}).
          </p>
        )}

        {today.isCheckedIn ? (
          <button type="button" disabled={busy} onClick={() => act(() => employeePortalService.checkOut())} className="mt-2.5 w-full h-10 inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-800 bg-white border-2 border-slate-300 rounded-xl active:bg-slate-50 disabled:opacity-60 cursor-pointer">
            <LogOut className="w-4 h-4" /> Check out
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => act(() => employeePortalService.checkIn())} className="mt-2.5 w-full h-10 inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-emerald-600 active:bg-emerald-700 rounded-xl disabled:opacity-60 cursor-pointer border-0">
            <LogIn className="w-4 h-4" /> Check in
          </button>
        )}

        <p className="text-[11px] text-slate-400 mt-2 mb-0 text-center">Office opens {fmtClock(rules.officeStartTime)} · on time until {fmtClock(rules.officeStartTime, Number(rules.graceMinutes) || 0)}</p>
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/employee/leaves" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 h-11 no-underline text-slate-800 active:bg-slate-50">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><CalendarCheck className="w-4 h-4" /></span>
          <span className="text-[13px] font-bold leading-tight whitespace-nowrap">Apply leave</span>
        </Link>
        <Link to="/employee/holidays" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 h-11 no-underline text-slate-800 active:bg-slate-50">
          <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><CalendarDays className="w-4 h-4" /></span>
          <span className="text-[13px] font-bold leading-tight">Holidays</span>
        </Link>
      </div>

      {/* Tasks */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-bold text-slate-900 m-0 inline-flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-slate-500" /> My tasks</h2>
          <Link to="/employee/tasks" className="inline-block py-3 -my-3 pl-4 text-[13px] font-semibold text-emerald-700 no-underline">View all</Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile label="Assigned" value={tasks.total} tone="slate" to="/employee/tasks" />
          <Tile label="Pending" value={tasks.pending} tone="amber" to="/employee/tasks" />
          <Tile label="In progress" value={tasks.inProgress} tone="violet" to="/employee/tasks" />
          <Tile label="In review" value={tasks.underReview} tone="blue" to="/employee/tasks" />
          <Tile label="Done" value={tasks.completed} tone="green" to="/employee/tasks" />
          <Tile label="Overdue" value={tasks.overdue} tone="red" to="/employee/tasks" />
        </div>
      </section>

      <Card title="Upcoming holidays" action={<Link to="/employee/holidays" className="inline-block py-3 -my-3 pl-4 text-[13px] font-semibold text-emerald-700 no-underline">View all</Link>}>
        {!data.upcomingHolidays?.length ? (
          <Empty>No upcoming holidays announced yet.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 list-none p-0 m-0 -my-1">
            {data.upcomingHolidays.map((h) => (
              <li key={h._id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-slate-900 min-w-0 break-words">{h.name}{h.isOptional && <span className="ml-1.5 text-xs font-medium text-slate-400">(optional)</span>}</span>
                <span className="text-xs text-slate-600 whitespace-nowrap">{fmtDate(`${h.dateString}T12:00:00+05:30`)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Notifications${data.unreadNotifications ? ` (${data.unreadNotifications} new)` : ''}`} action={<Link to="/employee/notifications" className="inline-block py-3 -my-3 pl-4 text-[13px] font-semibold text-emerald-700 no-underline">View all</Link>}>
        {data.notifications.length === 0 ? (
          <Empty>No notifications yet.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100 list-none p-0 m-0 -my-1">
            {data.notifications.map((n) => (
              <li key={n._id} className="py-2 flex gap-2.5">
                <span className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}><Bell className="w-3.5 h-3.5" /></span>
                <div className="min-w-0">
                  <p className={`text-[13px] m-0 leading-snug ${n.isRead ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                  {n.message && <p className="text-xs text-slate-500 m-0 mt-0.5 break-words leading-snug">{n.message}</p>}
                  <p className="text-[11px] text-slate-400 m-0 mt-0.5">{fmtDateTime(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
