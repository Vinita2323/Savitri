import React, { useCallback, useEffect, useState } from 'react';
import employeePortalService from '../../../services/employeePortalService';
import { Badge, Card, Empty, Field, Notice, Spinner, btnGhost, btnPrimary, fmtDate, inputCls, todayIST } from '../components/ui';

const TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave', 'Maternity/Paternity', 'Compensatory Off'];
const BLANK = { leaveType: 'Casual Leave', startDate: '', endDate: '', isHalfDay: false, halfDayType: 'First Half', reason: '' };

export default function PortalLeaves() {
  const [leaves, setLeaves] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => employeePortalService.leaves().then(setLeaves).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!form.startDate) return setError('Select a start date.');
    setBusy(true);
    try {
      await employeePortalService.applyLeave({ ...form, endDate: form.isHalfDay ? form.startDate : form.endDate || form.startDate });
      setForm(BLANK);
      setMsg('Leave request submitted.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    setError('');
    try { await employeePortalService.cancelLeave(id); await load(); } catch (err) { setError(err.message); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-slate-900 m-0 leading-tight">Leave</h1>
        <p className="text-sm text-slate-500 mt-1 mb-0">Approved leave is marked in your attendance automatically.</p>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {msg && <Notice type="success">{msg}</Notice>}

      <Card title="Apply for leave">
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="Leave type"><select className={inputCls} value={form.leaveType} onChange={set('leaveType')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <div className="flex items-end"><label className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-2.5 cursor-pointer"><input type="checkbox" checked={form.isHalfDay} onChange={set('isHalfDay')} className="w-4 h-4 accent-emerald-600" /> Half day</label></div>
          <Field label={form.isHalfDay ? 'Date' : 'Start date'}><input type="date" className={inputCls} min={todayIST()} value={form.startDate} onChange={set('startDate')} /></Field>
          {form.isHalfDay ? (
            <Field label="Which half"><select className={inputCls} value={form.halfDayType} onChange={set('halfDayType')}><option>First Half</option><option>Second Half</option></select></Field>
          ) : (
            <Field label="End date"><input type="date" className={inputCls} min={form.startDate || todayIST()} value={form.endDate} onChange={set('endDate')} /></Field>
          )}
          <div className="sm:col-span-2"><Field label="Reason"><textarea className={inputCls} rows={2} value={form.reason} onChange={set('reason')} /></Field></div>
          <div className="sm:col-span-2"><button type="submit" className={btnPrimary} disabled={busy || !form.reason.trim()}>{busy ? 'Submitting…' : 'Submit request'}</button></div>
        </form>
      </Card>

      <Card title="My leave requests">
        {!leaves ? <Spinner /> : leaves.length === 0 ? <Empty>You have not applied for any leave.</Empty> : (
          <ul className="list-none p-0 m-0 divide-y divide-slate-100">
            {leaves.map((l) => (
              <li key={l._id} className="py-3.5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-bold text-slate-900">{l.leaveType} <span className="font-normal text-slate-400">· {l.leaveId}</span></p>
                  <p className="m-0 mt-0.5 text-sm text-slate-600">{fmtDate(l.startDate)}{l.startDate !== l.endDate ? ` → ${fmtDate(l.endDate)}` : ''} · {l.totalDays} day{l.totalDays === 1 ? '' : 's'}{l.isHalfDay ? ` (${l.halfDayType})` : ''}</p>
                  <p className="m-0 mt-1 text-xs text-slate-500 break-words">{l.reason}</p>
                  {l.reviewedBy?.notes && <p className="m-0 mt-1 text-xs text-slate-500 break-words"><em>Admin: {l.reviewedBy.notes}</em></p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={l.status} />
                  {l.status === 'Pending' && <button type="button" className={`${btnGhost} !py-1.5 !px-3 !text-xs`} onClick={() => cancel(l._id)}>Cancel</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
