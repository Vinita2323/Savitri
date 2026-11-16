import React, { useEffect, useState } from 'react';
import employeePortalService from '../../../services/employeePortalService';
import { Badge, Card, Notice, Spinner, Stat, fmtDate, fmtDuration, fmtTime, inputCls, todayIST } from '../components/ui';

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
          <h1 className="text-2xl font-extrabold text-slate-900 m-0">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">Recorded automatically when you log in (India time).</p>
        </div>
        <input type="month" className={`${inputCls} !w-auto`} value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat label="Present" value={data.counts.present} tone="green" />
            <Stat label="Absent" value={data.counts.absent} tone="red" />
            <Stat label="Late" value={data.counts.late} tone="amber" />
            <Stat label="Half day" value={data.counts.halfDay} tone="amber" />
            <Stat label="Leave" value={data.counts.leave} tone="blue" />
            <Stat label="Holidays" value={data.counts.holiday} tone="violet" />
            <Stat label="Hours worked" value={fmtDuration(data.totalWorkedMinutes)} />
          </div>

          <Card title="Daily record" className="overflow-hidden">
            <div className="-mx-5 -my-5 overflow-x-auto">
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
                      <td className="px-3 py-3"><Badge status={d.status} />{d.holiday && <span className="ml-2 text-xs text-slate-400">{d.holiday}</span>}{d.lateMinutes > 0 && <span className="ml-2 text-xs text-amber-600">{d.lateMinutes}m late</span>}</td>
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
