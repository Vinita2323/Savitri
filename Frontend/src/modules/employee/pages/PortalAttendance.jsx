import React, { useEffect, useState } from 'react';
import employeePortalService from '../../../services/employeePortalService';
import { Badge, Card, Notice, Spinner, Stat, fmtDate, fmtDuration, fmtShort, fmtTime, inputCls, todayIST } from '../components/ui';

export default function PortalAttendance() {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    employeePortalService.attendanceMonth(month).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [month]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-slate-900 m-0 leading-tight">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">Recorded automatically when you log in (India time).</p>
        </div>
        <input type="month" className={`${inputCls} !w-auto`} value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            <Stat label="Present" value={data.counts.present} tone="green" />
            <Stat label="Absent" value={data.counts.absent} tone="red" />
            <Stat label="Late" value={data.counts.late} tone="amber" />
            <Stat label="Half day" value={data.counts.halfDay} tone="amber" />
            <Stat label="Leave" value={data.counts.leave} tone="blue" />
            <Stat label="Holidays" value={data.counts.holiday} tone="violet" />
            <Stat label="Hours worked" value={fmtDuration(data.totalWorkedMinutes)} />
          </div>

          <Card title="Daily record" className="overflow-hidden">
            <ul className="sm:hidden list-none p-0 -mx-4 -my-4 divide-y divide-slate-100">
              {[...data.days].reverse().filter((d) => d.status).map((d) => (
                <li key={d.date} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15px] font-bold text-slate-900">{fmtDate(d.date)}</span>
                    <Badge status={d.status} />
                  </div>
                  {(d.checkIn || d.holiday || d.lateMinutes > 0) && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-xl py-2"><p className="m-0 text-[10px] font-semibold text-slate-500 uppercase">In</p><p className="m-0 text-sm font-bold text-slate-900">{fmtTime(d.checkIn)}</p></div>
                      <div className="bg-slate-50 rounded-xl py-2"><p className="m-0 text-[10px] font-semibold text-slate-500 uppercase">Out</p><p className="m-0 text-sm font-bold text-slate-900">{fmtTime(d.checkOut)}</p></div>
                      <div className="bg-slate-50 rounded-xl py-2"><p className="m-0 text-[10px] font-semibold text-slate-500 uppercase">Hours</p><p className="m-0 text-sm font-bold text-slate-900">{d.workedMinutes ? fmtDuration(d.workedMinutes) : '—'}</p></div>
                    </div>
                  )}
                  {d.holiday && <p className="m-0 mt-1.5 text-xs text-slate-500">{d.holiday}</p>}
                  {d.lateMinutes > 0 && <p className="m-0 mt-1.5 text-xs font-semibold text-amber-700">Arrived {fmtShort(d.lateMinutes)} late</p>}
                </li>
              ))}
            </ul>
            <div className="hidden sm:block -mx-5 -my-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">First login</th><th className="px-3 py-3 font-semibold">Last logout</th>
                    <th className="px-3 py-3 font-semibold">Hours</th><th className="px-3 py-3 font-semibold">Logins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...data.days].reverse().filter((d) => d.status).map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">{fmtDate(d.date)}</td>
                      <td className="px-3 py-3"><Badge status={d.status} />{d.holiday && <span className="ml-2 text-xs text-slate-400">{d.holiday}</span>}{d.lateMinutes > 0 && <span className="ml-2 text-xs text-amber-600">{fmtShort(d.lateMinutes)} late</span>}</td>
                      <td className="px-3 py-3 text-slate-700">{fmtTime(d.checkIn)}</td>
                      <td className="px-3 py-3 text-slate-700">{fmtTime(d.checkOut)}</td>
                      <td className="px-3 py-3 text-slate-700">{d.workedMinutes ? fmtDuration(d.workedMinutes) : '—'}</td>
                      <td className="px-3 py-3 text-slate-700">{d.loginCount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
