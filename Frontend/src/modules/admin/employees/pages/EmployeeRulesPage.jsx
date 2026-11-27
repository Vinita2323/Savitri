import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Coffee, Moon, ShieldCheck, Timer } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { employeeManagementService } from '../../../../services/employeeService';
import { Spinner } from '../../../employee/components/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const GRACE_CHOICES = [0, 5, 10, 15, 30];
const HALF_DAY_CHOICES = [120, 180, 240, 300, 360]; // minutes worked

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fmt12 = (mins) => {
  if (mins === null || Number.isNaN(mins)) return '—';
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const hoursLabel = (mins) => `${mins / 60} hour${mins === 60 ? '' : 's'}`;

const Section = ({ icon: Icon, title, help, children }) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-6">
    <div className="flex items-start gap-3.5 mb-5">
      <span className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Icon className="w-5 h-5" /></span>
      <div>
        <h3 className="text-lg font-bold text-slate-900 m-0">{title}</h3>
        <p className="text-[15px] text-slate-500 mt-1 mb-0">{help}</p>
      </div>
    </div>
    {children}
  </section>
);

const Chip = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`px-4 py-2.5 rounded-xl text-[15px] font-semibold border cursor-pointer transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>{children}</button>
);

const timeCls = 'px-4 py-3 text-[17px] font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

export const EmployeeRulesPage = ({ onNavigate }) => {
  const { activeBrandId, brandsList } = useEmployee();
  const isSuper = useLocation().pathname.startsWith('/super-admin');

  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [scope, setScope] = useState('');
  const [inherited, setInherited] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState(null);

  const load = useCallback(() => {
    setError('');
    return employeeManagementService
      .getRules()
      .then((d) => {
        const r = {
          officeStartTime: d.rules.officeStartTime,
          officeEndTime: d.rules.officeEndTime,
          graceMinutes: Number(d.rules.graceMinutes),
          halfDayMinutes: Number(d.rules.halfDayMinutes),
          weeklyOffs: [...(d.rules.weeklyOffs || [])],
        };
        setSaved(r);
        setForm(r);
        setScope(d.scope);
        setInherited(d.scope !== 'GLOBAL' && d.rules.source !== d.scope);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => { setForm(null); setMsg(''); load(); }, [load, activeBrandId]);

  const loadAccess = useCallback(() => employeeManagementService.listAdminAccess().then(setAccess).catch((e) => setError(e.message)), []);
  useEffect(() => { if (isSuper) loadAccess(); }, [isSuper, loadAccess]);

  const dirty = useMemo(() => form && saved && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const startM = form ? toMinutes(form.officeStartTime) : null;
  const endM = form ? toMinutes(form.officeEndTime) : null;
  const lateAfter = startM === null ? null : startM + (Number(form.graceMinutes) || 0);
  const timeProblem = form && (startM === null ? 'Choose a valid opening time.' : endM !== null && endM <= startM ? 'Closing time must be after opening time.' : '');
  const scopeName = scope === 'GLOBAL' ? 'every brand (default rules)' : brandsList?.find((b) => (b.id || b.brandId) === scope)?.name || scope;

  const save = async () => {
    setBusy(true); setError(''); setMsg('');
    try {
      const body = { ...form, graceMinutes: Number(form.graceMinutes), halfDayMinutes: Number(form.halfDayMinutes) };
      if (isSuper && (!activeBrandId || activeBrandId === 'ALL')) body.scope = 'GLOBAL';
      await employeeManagementService.saveRules(body);
      await load();
      setMsg('Saved. The new rules apply from the next login.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const toggleBrand = async (admin, brandId) => {
    const cur = admin.authorizedBrands || [];
    const next = cur.includes(brandId) ? cur.filter((b) => b !== brandId) : [...cur.filter((b) => b !== '*'), brandId];
    setError(''); setMsg('');
    try { await employeeManagementService.saveAdminAccess(admin._id, next); setMsg(`Brand access updated for ${admin.name}.`); await loadAccess(); } catch (err) { setError(err.message); }
  };

  const halfChoices = form ? [...new Set([...HALF_DAY_CHOICES, form.halfDayMinutes])].sort((a, b) => a - b) : HALF_DAY_CHOICES;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <EmployeeHeader activeTabName="rules" onNavigate={onNavigate} />
      <div className="px-6 pt-6 max-w-5xl space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 m-0">Attendance rules</h2>
          <p className="text-[16px] text-slate-500 mt-1.5 mb-0">Set office timings once. Attendance is then marked automatically when an employee logs in (India time).</p>
        </div>

        {error && <div className="px-5 py-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[15px] font-semibold text-rose-800">{error}</div>}
        {msg && <div className="px-5 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[15px] font-semibold text-emerald-800">{msg}</div>}

        {!form ? <Spinner /> : (
          <>
            <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="m-0 text-[15px] text-slate-700">These rules apply to <strong className="text-slate-900">{scopeName}</strong>.{inherited && ' This brand has no rules of its own yet, so it is using the default rules. Saving creates rules just for this brand.'}{scope === 'GLOBAL' && ' A brand can have its own rules: pick that brand at the top of the panel.'}</p>
            </div>

            <Section icon={Clock} title="Office hours" help="When does the working day start and end?">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <label className="block"><span className="block text-sm font-semibold text-slate-600 mb-1.5">Office opens</span><input type="time" className={timeCls} value={form.officeStartTime} onChange={(e) => setForm((f) => ({ ...f, officeStartTime: e.target.value }))} /></label>
                <label className="block"><span className="block text-sm font-semibold text-slate-600 mb-1.5">Office closes</span><input type="time" className={timeCls} value={form.officeEndTime} onChange={(e) => setForm((f) => ({ ...f, officeEndTime: e.target.value }))} /></label>
              </div>
              {timeProblem && <p className="text-[15px] font-semibold text-rose-600 mt-3 mb-0">{timeProblem}</p>}
            </Section>

            <Section icon={Timer} title="When is someone late?" help="Give a short grace period after opening time before an employee is marked Late.">
              <div className="flex flex-wrap gap-2.5">
                {GRACE_CHOICES.map((g) => <Chip key={g} active={Number(form.graceMinutes) === g} onClick={() => setForm((f) => ({ ...f, graceMinutes: g }))}>{g === 0 ? 'No grace' : `${g} min`}</Chip>)}
                <label className="inline-flex items-center gap-2 text-[15px] text-slate-600 ml-1">Other:
                  <input type="number" min="0" max="240" className={`${timeCls} !w-24 !py-2 !text-[15px]`} value={form.graceMinutes} onChange={(e) => setForm((f) => ({ ...f, graceMinutes: e.target.value === '' ? '' : Number(e.target.value) }))} /> min
                </label>
              </div>
              {lateAfter !== null && <p className="text-[15px] text-slate-600 mt-4 mb-0">Logging in up to <strong className="text-slate-900">{fmt12(lateAfter)}</strong> counts as on time. Later than that is marked <strong className="text-amber-700">Late</strong>.</p>}
            </Section>

            <Section icon={Coffee} title="Half day" help="If an employee works fewer hours than this in a day, the day is marked Half Day.">
              <div className="flex flex-wrap gap-2.5">
                {halfChoices.map((m) => <Chip key={m} active={Number(form.halfDayMinutes) === m} onClick={() => setForm((f) => ({ ...f, halfDayMinutes: m }))}>Under {hoursLabel(m)}</Chip>)}
              </div>
            </Section>

            <Section icon={Moon} title="Weekly off" help="Days when the office is closed. These are never counted as absent.">
              <div className="flex flex-wrap gap-2.5">
                {DAYS.map((d) => {
                  const on = form.weeklyOffs.includes(d);
                  return <Chip key={d} active={on} onClick={() => setForm((f) => ({ ...f, weeklyOffs: on ? f.weeklyOffs.filter((x) => x !== d) : [...f.weeklyOffs, d] }))}>{d}</Chip>;
                })}
              </div>
              <p className="text-[15px] text-slate-500 mt-3 mb-0">{form.weeklyOffs.length ? `Closed every ${form.weeklyOffs.join(' and ')}.` : 'No weekly off: every day is a working day.'} Public holidays are added on the Shifts & Holidays page.</p>
            </Section>

            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl shadow-lg px-5 py-4">
              <p className="m-0 text-[15px] font-semibold text-slate-600">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
              <div className="flex gap-3">
                <button type="button" disabled={!dirty || busy} onClick={() => { setForm(saved); setMsg(''); }} className="px-5 py-3 text-[15px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 cursor-pointer">Undo changes</button>
                <button data-perm="attendance.edit" type="button" disabled={!dirty || busy || Boolean(timeProblem) || form.graceMinutes === ''} onClick={save} className="px-7 py-3 text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 cursor-pointer border-0">{busy ? 'Saving…' : 'Save rules'}</button>
              </div>
            </div>
          </>
        )}

        {isSuper && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 m-0">Which brands can each admin manage?</h3>
            <p className="text-[15px] text-slate-500 mt-1 mb-5">Tick the brands an admin is allowed to manage. An admin with no brand ticked can manage every brand. A change applies immediately and signs that admin in again.</p>
            {!access ? <Spinner /> : access.admins.length === 0 ? <p className="text-[15px] text-slate-500 m-0">There are no admins yet.</p> : (
              <div className="space-y-4">
                {access.admins.map((a) => (
                  <div key={a._id} className="border border-slate-200 rounded-xl p-4">
                    <p className="m-0 text-[16px] font-bold text-slate-900">{a.name} <span className="font-normal text-slate-500 text-[15px]">· {a.email}</span></p>
                    <div className="flex flex-wrap gap-2 mt-3 items-center">
                      {access.brands.map((b) => <Chip key={b.brandId} active={(a.authorizedBrands || []).includes(b.brandId)} onClick={() => toggleBrand(a, b.brandId)}>{b.name}</Chip>)}
                      {(a.authorizedBrands?.length || 0) === 0 && <span className="text-[15px] font-semibold text-amber-700 ml-1">Can manage all brands</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default EmployeeRulesPage;
