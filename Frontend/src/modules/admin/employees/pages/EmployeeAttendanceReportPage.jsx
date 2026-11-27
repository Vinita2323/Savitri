import React, { useCallback, useEffect, useState } from 'react';
import { Download, History, Pencil } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { employeeManagementService } from '../../../../services/employeeService';
import { Badge, Card, Empty, Field, Notice, Spinner, btnGhost, btnPrimary, fmtDate, fmtDateTime, fmtDuration, fmtTime, inputCls, todayIST } from '../../../employee/components/ui';

const STATUSES = ['ALL', 'Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Holiday', 'Weekly Off'];
const CORRECTABLE = ['Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Holiday'];

export const EmployeeAttendanceReportPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const [view, setView] = useState('daily');
  const [date, setDate] = useState(todayIST());
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null); // employee-wise drilldown
  const [fix, setFix] = useState(null);
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    setError('');
    try {
      if (view === 'daily') setData(await employeeManagementService.dailyAttendance({ date, status, search: q || undefined, page, limit: 50 }));
      else setData(await employeeManagementService.monthlyAttendance({ month }));
    } catch (e) { setError(e.message); }
  }, [view, date, month, status, q, page]);
  useEffect(() => { setData(null); load(); }, [load, activeBrandId]);

  const openEmployee = async (emp) => {
    setError('');
    try { setDetail(await employeeManagementService.employeeAttendance(emp._id, { month })); } catch (e) { setError(e.message); }
  };

  const openFix = (row) => setFix({ employeeId: row.employee._id, name: row.employee.fullName, date: row.date, recordId: row.recordId, status: CORRECTABLE.includes(row.status) ? row.status : 'Present', checkInTime: '', checkOutTime: '', reason: '' });

  const saveFix = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      await employeeManagementService.correctAttendance({ employeeId: fix.employeeId, date: fix.date, status: fix.status, checkInTime: fix.checkInTime || undefined, checkOutTime: fix.checkOutTime || undefined, reason: fix.reason });
      setMsg('Attendance updated. The employee has been notified and the change is in the audit trail.');
      setFix(null);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const showAudit = async (row) => {
    setError('');
    try { setAudit((await employeeManagementService.attendanceAudit(row.recordId)).record); } catch (e) { setError(e.message); }
  };

  const exportCsv = async () => {
    setError('');
    try { await employeeManagementService.exportAttendance({ month: view === 'daily' ? date.slice(0, 7) : month }); } catch (e) { setError(e.message); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="attendance-report" onNavigate={onNavigate} />
      <div className="px-6 pt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {[['daily', 'Daily'], ['monthly', 'Monthly']].map(([id, l]) => (
              <button key={id} type="button" onClick={() => { setView(id); setPage(1); }} className={`px-4 py-2 rounded-full text-xs font-semibold border cursor-pointer ${view === id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view === 'daily' ? (
              <>
                <input type="date" className={`${inputCls} !w-auto`} value={date} max={todayIST()} onChange={(e) => e.target.value && (setDate(e.target.value), setPage(1))} />
                <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>{STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>)}</select>
                <input className={`${inputCls} !w-52`} placeholder="Search employee" value={search} onChange={(e) => setSearch(e.target.value)} />
              </>
            ) : (
              <input type="month" className={`${inputCls} !w-auto`} value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            )}
            <button data-perm="attendance.export" type="button" className={btnGhost} onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</button>
          </div>
        </div>

        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        {!data && !error && <Spinner />}

        {data && view === 'daily' && (
          <Card>
            {data.rows.length === 0 ? <Empty>No employees match.</Empty> : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold">Employee</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Login</th><th className="px-3 py-3 font-semibold">Logout</th><th className="px-3 py-3 font-semibold">Hours</th><th className="px-3 py-3 font-semibold">Late</th><th className="px-3 py-3 font-semibold text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.map((r) => (
                      <tr key={r.employee._id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3"><button type="button" onClick={() => openEmployee(r.employee)} className="text-left bg-transparent border-0 p-0 cursor-pointer"><span className="block font-semibold text-slate-900 hover:text-emerald-700">{r.employee.fullName}</span><span className="block text-xs text-slate-500">{r.employee.employeeId} · {r.employee.department}</span></button></td>
                        <td className="px-3 py-3"><Badge status={r.status} />{r.corrected && <span className="ml-1.5 text-[11px] text-slate-400">edited</span>}</td>
                        <td className="px-3 py-3 text-slate-700">{fmtTime(r.checkIn)}</td>
                        <td className="px-3 py-3 text-slate-700">{fmtTime(r.checkOut)}</td>
                        <td className="px-3 py-3 text-slate-700">{r.workedMinutes ? fmtDuration(r.workedMinutes) : '—'}</td>
                        <td className="px-3 py-3 text-slate-700">{r.lateMinutes ? `${r.lateMinutes}m` : '—'}</td>
                        <td className="px-3 py-3"><div className="flex justify-end gap-1.5">
                          {r.recordId && r.corrected && <button type="button" className={`${btnGhost} !px-2.5 !py-1.5`} title="Audit trail" onClick={() => showAudit(r)}><History className="w-3.5 h-3.5" /></button>}
                          <button type="button" className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`} data-perm="attendance.edit" onClick={() => openFix(r)}><Pencil className="w-3.5 h-3.5" /> Correct</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
        {data && view === 'daily' && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="text-slate-500">Page {data.page} of {data.pages}</span>
            <button type="button" className={btnGhost} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}

        {data && view === 'monthly' && (
          <Card>
            {data.rows.length === 0 ? <Empty>No employees.</Empty> : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold">Employee</th><th className="px-3 py-3 font-semibold">Present</th><th className="px-3 py-3 font-semibold">Absent</th><th className="px-3 py-3 font-semibold">Late</th><th className="px-3 py-3 font-semibold">Half day</th><th className="px-3 py-3 font-semibold">Leave</th><th className="px-3 py-3 font-semibold">Holidays</th><th className="px-3 py-3 font-semibold">Hours</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.map((r) => (
                      <tr key={r.employee._id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => openEmployee(r.employee)}>
                        <td className="px-5 py-3"><span className="block font-semibold text-slate-900">{r.employee.fullName}</span><span className="block text-xs text-slate-500">{r.employee.employeeId} · {r.employee.department}</span></td>
                        <td className="px-3 py-3 font-semibold text-emerald-700">{r.present}</td><td className="px-3 py-3 font-semibold text-rose-600">{r.absent}</td><td className="px-3 py-3 text-amber-600">{r.late}</td><td className="px-3 py-3">{r.halfDay}</td><td className="px-3 py-3 text-blue-600">{r.leave}</td><td className="px-3 py-3">{r.holiday}</td><td className="px-3 py-3">{fmtDuration(r.totalWorkedMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div><h2 className="text-lg font-extrabold text-slate-900 m-0">{detail.employee.fullName}</h2><p className="text-xs text-slate-500 m-0">{detail.employee.employeeId} · {detail.month}</p></div>
              <button type="button" className={btnGhost} onClick={() => setDetail(null)}>Close</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 text-center">
              {[['Present', detail.counts.present, 'text-emerald-600'], ['Absent', detail.counts.absent, 'text-rose-600'], ['Late', detail.counts.late, 'text-amber-600'], ['Half day', detail.counts.halfDay, ''], ['Leave', detail.counts.leave, 'text-blue-600'], ['Hours', fmtDuration(detail.totalWorkedMinutes), '']].map(([l, v, c]) => (
                <div key={l} className="bg-slate-50 rounded-xl py-2.5"><p className={`m-0 text-lg font-extrabold ${c}`}>{v}</p><p className="m-0 text-[11px] text-slate-500 font-semibold uppercase">{l}</p></div>
              ))}
            </div>
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm"><tbody className="divide-y divide-slate-100">
                {[...detail.days].reverse().filter((d) => d.status).map((d) => (
                  <tr key={d.date}><td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">{fmtDate(d.date)}</td><td className="px-3 py-2"><Badge status={d.status} /></td><td className="px-3 py-2 text-slate-600">{fmtTime(d.checkIn)} – {fmtTime(d.checkOut)}</td><td className="px-3 py-2 text-slate-600">{d.workedMinutes ? fmtDuration(d.workedMinutes) : ''}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
      )}

      {fix && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setFix(null)}>
          <form onSubmit={saveFix} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div><h2 className="text-lg font-extrabold text-slate-900 m-0">Correct attendance</h2><p className="text-sm text-slate-500 m-0 mt-1">{fix.name} · {fmtDate(fix.date)}</p></div>
            <Field label="Status"><select className={inputCls} value={fix.status} onChange={(e) => setFix((f) => ({ ...f, status: e.target.value }))}>{CORRECTABLE.map((s) => <option key={s} value={s}>{s === 'On Leave' ? 'Leave' : s}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Login time (IST)"><input type="time" className={inputCls} value={fix.checkInTime} onChange={(e) => setFix((f) => ({ ...f, checkInTime: e.target.value }))} /></Field>
              <Field label="Logout time (IST)"><input type="time" className={inputCls} value={fix.checkOutTime} onChange={(e) => setFix((f) => ({ ...f, checkOutTime: e.target.value }))} /></Field>
            </div>
            <Field label="Reason (required)" hint="Recorded in the audit trail and shown to the employee"><textarea className={inputCls} rows={2} value={fix.reason} onChange={(e) => setFix((f) => ({ ...f, reason: e.target.value }))} /></Field>
            <div className="flex justify-end gap-2"><button data-perm="attendance.edit" type="button" className={btnGhost} onClick={() => setFix(null)}>Cancel</button><button data-perm="attendance.edit" type="submit" className={btnPrimary} disabled={busy || !fix.reason.trim()}>Save correction</button></div>
          </form>
        </div>
      )}

      {audit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setAudit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-slate-900 m-0">Audit trail</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">{audit.employeeName} · {fmtDate(audit.dateString)}</p>
            {audit.correctionHistory.length === 0 ? <p className="text-sm text-slate-500">No manual corrections.</p> : audit.correctionHistory.map((h, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3.5 mb-2.5 text-sm">
                <p className="m-0 text-xs font-semibold text-slate-500">{fmtDateTime(h.at)} · {h.by?.name} ({String(h.by?.role).replace('_', ' ')})</p>
                <p className="m-0 mt-1.5 text-slate-800">{h.before?.status} → <strong>{h.after?.status}</strong></p>
                <p className="m-0 mt-1 text-slate-600 break-words">Reason: {h.reason}</p>
              </div>
            ))}
            <div className="flex justify-end mt-3"><button type="button" className={btnGhost} onClick={() => setAudit(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendanceReportPage;
