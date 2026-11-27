import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Camera, ImageOff, Search, Settings2, X } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { FilePreview } from '../components/FilePreview';
import { employeeManagementService } from '../../../../services/employeeService';
import { subscribeRealtime } from '../../../../services/financeSocket';
import { fileHref } from '../../../../utils/fileUrl';
import { Card, Empty, Notice, Spinner, btnGhost, btnPrimary, fmtDate, fmtDateTime, fmtTime, inputCls, todayIST } from '../../../employee/components/ui';

const STATUS = {
  COMPLETED: ['Completed', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  PENDING: ['Pending', 'bg-amber-50 text-amber-700 border-amber-200'],
  DUE_SOON: ['Due soon', 'bg-amber-50 text-amber-800 border-amber-300'],
  OVERDUE: ['Overdue', 'bg-rose-50 text-rose-700 border-rose-200'],
  MISSED: ['Missed', 'bg-rose-100 text-rose-800 border-rose-300'],
  NO_RECORD: ['No record', 'bg-slate-100 text-slate-600 border-slate-200'],
  NOT_REQUIRED: ['Not required', 'bg-slate-100 text-slate-600 border-slate-200'],
};
const Chip = ({ status, id }) => {
  const [label, cls] = STATUS[status] || STATUS.PENDING;
  return <span data-testid={id || 'sm-chip'} data-status={status} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${cls}`}>{label}</span>;
};
const typeLabel = (s) => (s.verificationType === 'LOGIN' ? 'Login selfie' : `2-hour check #${s.sequence}`);
const GROUPS = [['ALL', 'All'], ['COMPLETED', 'Completed'], ['PENDING', 'Pending'], ['MISSED', 'Missed']];

const Thumb = ({ s, onOpen, size = 'w-12 h-12' }) =>
  s?.imageUrl ? (
    <button type="button" data-testid="sm-thumb" onClick={onOpen} className={`${size} rounded-lg overflow-hidden bg-slate-100 border border-slate-200 p-0 cursor-zoom-in shrink-0`}>
      <img src={fileHref(s.imageUrl)} alt={s.employeeName ? `Selfie of ${s.employeeName}` : 'Selfie'} loading="lazy" className="w-full h-full object-cover" />
    </button>
  ) : (
    <div className={`${size} rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 shrink-0`}><ImageOff className="w-4 h-4" /></div>
  );

/** One employee's selfies: login selfie, the day's checks in order, missed history, any date range */
const DetailDrawer = ({ employeeId, initialDate, onClose }) => {
  const [range, setRange] = useState({ from: initialDate, to: initialDate });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const load = useCallback(() => {
    setError('');
    return employeeManagementService.selfieEmployee(employeeId, range).then(setData).catch((e) => setError(e.message));
  }, [employeeId, range]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const off = subscribeRealtime('admin', ['selfie:changed'], () => load());
    return off;
  }, [load]);

  const gallery = useMemo(() => (data?.days || []).flatMap((d) => d.selfies).filter((s) => s.imageUrl).map((s) => ({ id: s.id, name: `${fmtDate(s.workDate)} · ${fmtTime(s.capturedAt)} · ${typeLabel(s)}`, url: s.imageUrl, kind: 'image' })), [data]);
  const open = (s) => setPreview({ files: gallery, index: Math.max(0, gallery.findIndex((g) => g.id === s.id)) });
  const emp = data?.employee;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" role="dialog" aria-label="Employee selfies" data-testid="sm-drawer">
      <div className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="m-0 text-lg font-extrabold text-slate-900 truncate" data-testid="sm-drawer-name">{emp ? emp.name : 'Loading…'}</p>
            {emp && <p className="m-0 text-xs text-slate-500">{emp.employeeId} · {emp.department || '—'} · {emp.designation || '—'}</p>}
          </div>
          <button type="button" className={btnGhost} onClick={onClose} aria-label="Close" data-testid="sm-drawer-close"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-500">From<input data-testid="sm-d-from" type="date" className={`${inputCls} mt-1`} value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} /></label>
            <label className="text-xs font-semibold text-slate-500">To<input data-testid="sm-d-to" type="date" className={`${inputCls} mt-1`} value={range.to} min={range.from} max={todayIST()} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} /></label>
          </div>
          {error && <Notice type="error">{error}</Notice>}
          {!data && !error && <Spinner />}
          {data && data.days.length === 0 && <Empty>No selfie records for these dates.</Empty>}
          {data && data.days.map((d) => (
            <div key={d.workDate} data-testid="sm-day" className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="m-0 font-extrabold text-slate-800">{fmtDate(d.workDate)}</p>
                <span className="text-xs text-slate-500">{d.total} selfie{d.total === 1 ? '' : 's'}{d.missed.length ? ` · ${d.missed.length} missed` : ''}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {d.selfies.map((s) => (
                  <div key={s.id} data-testid="sm-selfie" className="rounded-lg border border-slate-200 overflow-hidden">
                    <Thumb s={s} onOpen={() => open(s)} size="w-full aspect-[3/4] !rounded-none !border-0" />
                    <div className="p-2">
                      <p className="m-0 text-xs font-bold text-slate-900">{typeLabel(s)}</p>
                      <p className="m-0 text-[11px] text-slate-500">{fmtTime(s.capturedAt)}{s.late ? ` · ${s.minutesLate} min late` : ''}</p>
                    </div>
                  </div>
                ))}
                {d.missed.map((s) => (
                  <div key={`m${s.id}`} data-testid="sm-missed" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex flex-col justify-center">
                    <p className="m-0 font-bold">{typeLabel(s)}</p>
                    <p className="m-0">Missed · due {fmtTime(s.scheduledAt)}</p>
                    {s.status === 'COMPLETED' && <p className="m-0 mt-1 text-emerald-700">Later completed</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {data && (
            <div>
              <p className="m-0 mb-2 text-sm font-extrabold text-slate-800">Missed history ({data.missedTotal})</p>
              {data.missedHistory.length === 0 ? <p className="text-sm text-slate-500 m-0">No missed selfies.</p> : (
                <ul className="m-0 p-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200" data-testid="sm-missed-list">
                  {data.missedHistory.map((s) => <li key={s.id} className="px-4 py-2 text-sm flex justify-between gap-3"><span>{fmtDate(s.workDate)} · {typeLabel(s)}</span><span className="text-slate-500">due {fmtTime(s.scheduledAt)}</span></li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      {preview && <FilePreview files={preview.files} index={preview.index} onIndex={(i) => setPreview((p) => ({ ...p, index: i }))} onClose={() => setPreview(null)} />}
    </div>
  );
};

const AlertsPanel = ({ onClose, onOpenEmployee }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => employeeManagementService.selfieAlerts({ limit: 100 }).then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeRealtime('admin', ['selfie:alert'], () => load()), [load]);
  const markRead = async () => { try { await employeeManagementService.selfieAlertsRead(); await load(); } catch (e) { setError(e.message); } };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" role="dialog" aria-label="Selfie alerts" data-testid="sm-alerts">
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <p className="m-0 text-lg font-extrabold text-slate-900">Selfie alerts</p>
          <div className="flex gap-2">
            {data?.unread > 0 && <button type="button" className={btnGhost} data-testid="sm-alerts-readall" onClick={markRead}>Mark all read</button>}
            <button type="button" className={btnGhost} onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {error && <Notice type="error">{error}</Notice>}
          {!data && !error && <Spinner />}
          {data && data.alerts.length === 0 && <Empty>No alerts yet.</Empty>}
          {data && data.alerts.map((a) => (
            <button key={a.id} type="button" data-testid="sm-alert" data-read={a.read ? '1' : '0'} onClick={() => onOpenEmployee(a)} className={`w-full text-left rounded-xl border p-3 ${a.read ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50'}`}>
              <p className="m-0 text-sm font-semibold text-slate-900">{a.message}</p>
              <p className="m-0 mt-1 text-xs text-slate-500">{a.employeeName} ({a.employeeId}) · {fmtDateTime(a.createdAt)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = ({ onClose, onSaved }) => {
  const { activeBrandId } = useEmployee();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    employeeManagementService.selfieSettings(activeBrandId && activeBrandId !== 'ALL' ? { scope: activeBrandId } : {}).then((d) => setForm({ scope: d.scope, enabled: d.enabled, intervalMinutes: d.intervalMinutes, graceMinutes: d.graceMinutes, source: d.source })).catch((e) => setError(e.message));
  }, [activeBrandId]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      await employeeManagementService.saveSelfieSettings({ scope: form.scope, enabled: form.enabled, intervalMinutes: Number(form.intervalMinutes), graceMinutes: Number(form.graceMinutes) });
      setMsg('Saved. New settings apply to selfies scheduled from now on.');
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-label="Selfie settings" data-testid="sm-settings">
      <form onSubmit={save} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between"><p className="m-0 text-lg font-extrabold text-slate-900">Selfie verification settings</p><button type="button" className={btnGhost} onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button></div>
        {!form && !error && <Spinner />}
        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        {form && (
          <>
            <p className="m-0 text-xs text-slate-500">Applies to: <b>{form.scope === 'GLOBAL' ? 'all brands (default)' : form.scope}</b></p>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input data-testid="sm-s-enabled" type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Selfie verification is on</label>
            <label className="block text-xs font-semibold text-slate-500">Verification every (minutes, 30–480)<input data-testid="sm-s-interval" type="number" className={`${inputCls} mt-1`} value={form.intervalMinutes} onChange={(e) => setForm({ ...form, intervalMinutes: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-slate-500">Grace period (minutes, 1–120)<input data-testid="sm-s-grace" type="number" className={`${inputCls} mt-1`} value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: e.target.value })} /></label>
            <div className="flex justify-end gap-2"><button data-perm="attendance.edit" type="button" className={btnGhost} onClick={onClose}>Close</button><button data-perm="attendance.edit" type="submit" data-testid="sm-s-save" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Save'}</button></div>
          </>
        )}
      </form>
    </div>
  );
};

export const EmployeeSelfieMonitoringPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const [filters, setFilters] = useState({ search: '', department: '', status: 'ALL', date: todayIST() });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  const [detail, setDetail] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preview, setPreview] = useState(null);
  const seq = useRef(0);

  useEffect(() => { const t = setTimeout(() => { setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput })); setPage(1); }, 300); return () => clearTimeout(t); }, [searchInput]);

  const load = useCallback(() => {
    const my = ++seq.current;
    setError('');
    return employeeManagementService.selfieOverview({ search: filters.search || undefined, department: filters.department || undefined, status: filters.status, date: filters.date, page, limit: 20 })
      .then((d) => { if (my === seq.current) setData(d); })
      .catch((e) => { if (my === seq.current) setError(e.message); });
  }, [filters, page]);
  const loadAlerts = useCallback(() => employeeManagementService.selfieAlerts({ limit: 1 }).then((d) => setUnread(d.unread)).catch(() => {}), []);

  useEffect(() => { setData(null); load(); }, [load, activeBrandId]);
  useEffect(() => { loadAlerts(); }, [loadAlerts, activeBrandId]);
  // Live: the server pings when a selfie arrives or an employee misses one; the page refetches through the normal scoped APIs
  useEffect(() => subscribeRealtime('admin', ['selfie:changed', 'selfie:alert'], (ev) => { load(); if (ev === 'selfie:alert') loadAlerts(); }), [load, loadAlerts]);
  // Statuses also change with the clock (due soon, overdue): refresh quietly every minute when looking at today
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) load(); }, 60000); return () => clearInterval(t); }, [load]);

  const set = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const sum = data?.summary;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="selfies" onNavigate={onNavigate} />
      <div className="px-4 sm:px-6 pt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-extrabold text-slate-900 flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-600" /> Employee Selfie Monitoring</h2>
            <p className="m-0 text-sm text-slate-500">Live selfie at login and every few hours. Status updates as employees submit.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" data-testid="sm-open-alerts" className={`${btnGhost} relative`} onClick={() => setShowAlerts(true)}>
              <Bell className="w-4 h-4 inline mr-1" /> Alerts
              {unread > 0 && <span data-testid="sm-unread" className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold">{unread}</span>}
            </button>
            <button type="button" data-testid="sm-open-settings" className={btnGhost} onClick={() => setShowSettings(true)}><Settings2 className="w-4 h-4 inline mr-1" /> Settings</button>
          </div>
        </div>

        {sum && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="sm-summary">
            {[['Employees', sum.total, 'text-slate-900'], ['Completed', sum.completed, 'text-emerald-700'], ['Pending', sum.pending, 'text-amber-700'], ['With missed', sum.missed, 'text-rose-700']].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-xl border border-slate-200 p-4"><p className="m-0 text-xs font-semibold text-slate-500">{l}</p><p className={`m-0 text-2xl font-extrabold ${c}`} data-testid={`sm-sum-${l.split(' ')[0].toLowerCase()}`}>{v}</p></div>
            ))}
          </div>
        )}

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-500 flex-1 min-w-[200px]">Search<div className="relative mt-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input data-testid="sm-search" className={`${inputCls} !pl-9`} placeholder="Name or employee ID" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div></label>
            <label className="text-xs font-semibold text-slate-500">Department<select data-testid="sm-dept" className={`${inputCls} mt-1`} value={filters.department} onChange={(e) => set({ department: e.target.value })}><option value="">All</option>{(data?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-500">Date<input data-testid="sm-date" type="date" className={`${inputCls} mt-1`} value={filters.date} max={todayIST()} onChange={(e) => e.target.value && set({ date: e.target.value })} /></label>
            <div className="flex gap-1" role="group" aria-label="Status">
              {GROUPS.map(([k, l]) => <button key={k} type="button" data-testid={`sm-st-${k}`} aria-pressed={filters.status === k} onClick={() => set({ status: k })} className={`px-3 py-2 rounded-lg text-xs font-bold border ${filters.status === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>{l}</button>)}
            </div>
          </div>
        </Card>

        {error && <Notice type="error">{error}</Notice>}
        {!data && !error && <Spinner />}
        {data && (
          <Card>
            {data.employees.length === 0 ? <Empty>No employees match these filters.</Empty> : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-sm" data-testid="sm-table">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Employee</th><th className="px-3 py-3 font-semibold">Department</th><th className="px-3 py-3 font-semibold">Login selfie</th><th className="px-3 py-3 font-semibold">Last selfie</th><th className="px-3 py-3 font-semibold">Last submitted</th><th className="px-3 py-3 font-semibold">Next due</th><th className="px-3 py-3 font-semibold">Today</th><th className="px-3 py-3 font-semibold">Missed</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3" />
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.employees.map((r) => (
                      <tr key={r.employee.id} data-testid="sm-row" data-code={r.employee.employeeId} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3"><p className="m-0 font-bold text-slate-900" data-testid="sm-name">{r.employee.name}</p><p className="m-0 text-xs text-slate-500">{r.employee.employeeId} · {r.employee.designation || '—'}</p></td>
                        <td className="px-3 py-3 text-slate-700">{r.employee.department || '—'}</td>
                        <td className="px-3 py-3">{r.loginSelfie ? <div className="flex items-center gap-2"><Thumb s={r.loginSelfie} onOpen={() => setPreview({ files: [{ id: r.loginSelfie.id, name: `${r.employee.name} · Login selfie`, url: r.loginSelfie.imageUrl, kind: 'image' }], index: 0 })} /><span className="text-xs text-slate-500">{fmtTime(r.loginSelfie.capturedAt)}</span></div> : <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-3">{r.lastSelfie ? <Thumb s={r.lastSelfie} onOpen={() => setPreview({ files: [{ id: r.lastSelfie.id, name: `${r.employee.name} · ${typeLabel(r.lastSelfie)}`, url: r.lastSelfie.imageUrl, kind: 'image' }], index: 0 })} /> : <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{r.lastSubmissionAt ? fmtTime(r.lastSubmissionAt) : '—'}</td>
                        <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{r.nextDueAt ? fmtTime(r.nextDueAt) : '—'}</td>
                        <td className="px-3 py-3 font-semibold" data-testid="sm-total">{r.totalSelfies}</td>
                        <td className="px-3 py-3" data-testid="sm-missed-count">{r.missed > 0 ? <span className="inline-flex items-center gap-1 text-rose-700 font-bold"><AlertTriangle className="w-3.5 h-3.5" />{r.missed}</span> : 0}</td>
                        <td className="px-3 py-3"><Chip status={r.currentStatus} />{!r.required && r.notRequiredReason && <p className="m-0 text-[11px] text-slate-400 mt-0.5">{r.notRequiredReason.replace(/_/g, ' ').toLowerCase()}</p>}</td>
                        <td className="px-3 py-3 text-right"><button type="button" data-testid="sm-view" className={btnGhost} onClick={() => setDetail(r.employee.id)}>View selfies</button></td>
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

      {detail && <DetailDrawer employeeId={detail} initialDate={filters.date} onClose={() => setDetail(null)} />}
      {showAlerts && <AlertsPanel onClose={() => { setShowAlerts(false); loadAlerts(); }} onOpenEmployee={(a) => { setShowAlerts(false); setDetail(a.employee); }} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onSaved={load} />}
      {preview && <FilePreview files={preview.files} index={preview.index} onIndex={(i) => setPreview((p) => ({ ...p, index: i }))} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default EmployeeSelfieMonitoringPage;
