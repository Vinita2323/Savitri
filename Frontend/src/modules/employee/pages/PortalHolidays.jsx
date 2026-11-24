import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Badge, Card, Empty, Notice, Spinner, fmtDate, inputCls, todayIST } from '../components/ui';

const WEEKDAY = (ds) => new Date(`${ds}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

export default function PortalHolidays() {
  const [year, setYear] = useState(todayIST().slice(0, 4));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    employeePortalService.holidays(year).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [year]);

  const thisYear = Number(todayIST().slice(0, 4));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-slate-900 m-0 leading-tight">Holidays</h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">Holidays announced by your administrator. These days are not counted as absent.</p>
        </div>
        <select className={`${inputCls} !w-auto`} value={year} onChange={(e) => setYear(e.target.value)}>
          {[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          {data.weeklyOffs?.length > 0 && (
            <Notice type="info">Weekly off: <strong>{data.weeklyOffs.join(', ')}</strong></Notice>
          )}
          <Card title={`${data.year} holidays (${data.holidays.length})`}>
            {data.holidays.length === 0 ? (
              <Empty>No holidays have been announced for {data.year} yet.</Empty>
            ) : (
              <ul className="list-none p-0 m-0 -my-2 divide-y divide-slate-100">
                {data.holidays.map((h) => {
                  const past = h.dateString < data.today;
                  const today = h.dateString === data.today;
                  return (
                    <li key={h._id} className={`py-4 flex flex-wrap items-center justify-between gap-3 ${past ? 'opacity-55' : ''}`}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${today ? 'bg-emerald-600 text-white' : 'bg-violet-100 text-violet-700'}`}><CalendarDays className="w-5 h-5" /></span>
                        <div className="min-w-0">
                          <p className="m-0 text-base font-bold text-slate-900 break-words">{h.name}</p>
                          <p className="m-0 text-sm text-slate-500">{fmtDate(`${h.dateString}T12:00:00+05:30`)} · {WEEKDAY(h.dateString)}</p>
                          {h.description && <p className="m-0 mt-0.5 text-xs text-slate-400 break-words">{h.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {today && <Badge tone="green">Today</Badge>}
                        {h.isOptional && <Badge tone="amber">Optional</Badge>}
                        <Badge tone="slate">{h.scope}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
