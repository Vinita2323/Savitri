import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Badge, Card, Empty, Notice, Spinner, fmtDate, inputCls } from '../components/ui';

const FILTERS = ['ALL', 'Pending', 'In Progress', 'Under Review', 'Completed', 'Overdue', 'Rejected'];

export default function PortalTasks() {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setData(null);
    employeePortalService.tasks({ status, search: q || undefined, limit: 100 }).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [status, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 m-0">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-1 mb-0">Tasks assigned to you. Open a task to start it, report progress and submit it for review.</p>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-10`} placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setStatus(f)} className={`px-3.5 py-2 rounded-full text-xs font-semibold border cursor-pointer ${status === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (data.tasks.length === 0 ? (
        <Card><Empty>No tasks found.</Empty></Card>
      ) : (
        <div className="grid gap-3">
          {data.tasks.map((t) => (
            <Link key={t._id} to={`/employee/tasks/${t._id}`} className="block no-underline bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-emerald-400 hover:shadow-sm transition">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-400 m-0">{t.taskId} · {t.category}</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1 mb-0 break-words">{t.title}</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge status={t.priority} />
                  <Badge status={t.isOverdue ? 'Overdue' : t.status} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.progressPercent || 0}%` }} /></div>
                <span className="text-xs font-semibold text-slate-600 w-9 text-right">{t.progressPercent || 0}%</span>
              </div>
              <p className={`text-xs mt-2.5 mb-0 ${t.isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>Due {fmtDate(t.dueDate)}</p>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
