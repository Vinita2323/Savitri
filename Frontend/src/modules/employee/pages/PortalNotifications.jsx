import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Card, Empty, Notice, Spinner, btnGhost, fmtDateTime } from '../components/ui';

const changed = () => window.dispatchEvent(new Event('employee-notifications-changed'));

export default function PortalNotifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => employeePortalService.notifications({ limit: 50 }).then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.isRead) {
      try { await employeePortalService.markRead(n._id); changed(); } catch { /* non-blocking */ }
    }
    if (n.link) navigate(n.link);
    else load();
  };
  const readAll = async () => {
    try { await employeePortalService.markAllRead(); changed(); await load(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-slate-900 m-0 leading-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">Account, task, leave and attendance updates.</p>
        </div>
        {data?.unread > 0 && <button type="button" className={btnGhost} onClick={readAll}><CheckCheck className="w-4 h-4" /> Mark all read</button>}
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <Card>
          {data.notifications.length === 0 ? <Empty>You have no notifications.</Empty> : (
            <ul className="list-none p-0 m-0 -my-2 divide-y divide-slate-100">
              {data.notifications.map((n) => (
                <li key={n._id}>
                  <button type="button" onClick={() => open(n)} className="w-full text-left py-3.5 flex gap-3 bg-transparent border-0 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                    <span className={`mt-0.5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}><Bell className="w-4 h-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.isRead ? 'text-slate-600' : 'font-bold text-slate-900'}`}>{n.title}</span>
                      {n.message && <span className="block text-xs text-slate-500 mt-0.5 break-words">{n.message}</span>}
                      <span className="block text-xs text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</span>
                    </span>
                    {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-2 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
