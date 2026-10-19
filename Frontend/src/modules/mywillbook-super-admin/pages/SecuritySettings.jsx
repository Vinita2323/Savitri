import React, { useEffect, useState } from 'react';
import { Save, Shield } from 'lucide-react';
import {
  PageHeader,
  ConfirmDialog,
  StatusBadge,
  fieldClass,
  labelClass,
  btnPrimaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import {
  INITIAL_SECURITY_SETTINGS,
  DEMO_SESSIONS,
  SECURITY_EVENTS,
} from '../data/mockData';

const formatAt = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const severityStyle = {
  Info: 'bg-sky-50 text-sky-700',
  Warning: 'bg-amber-50 text-amber-700',
  Critical: 'bg-rose-50 text-rose-700',
};

const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-medium text-slate-500">{hint}</p> : null}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 shrink-0 accent-[#FF9418]"
    />
  </label>
);

const SecuritySettings = () => {
  const ctx = useMyWillBookSuperAdmin();
  const stored = ctx?.securitySettings ?? INITIAL_SECURITY_SETTINGS;
  const updateSecuritySettings = ctx?.updateSecuritySettings;

  const [form, setForm] = useState(() => ({ ...INITIAL_SECURITY_SETTINGS, ...stored }));
  const [confirmSave, setConfirmSave] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setForm({ ...INITIAL_SECURITY_SETTINGS, ...stored });
  }, [stored]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    updateSecuritySettings?.(form);
    setToast('Security settings saved (demo — UI only)');
    window.setTimeout(() => setToast(null), 2800);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Security Settings"
        subtitle="Authentication preferences and session policy (UI only)"
        breadcrumbs={['MyWillBook', 'Security', 'Security Settings']}
        actions={
          <button type="button" onClick={() => setConfirmSave(true)} className={btnPrimaryClass}>
            <Save size={14} /> Save security settings
          </button>
        }
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
        UI only — toggles update demo state. No MFA, session, or password enforcement is applied.
      </div>

      {toast && (
        <div className="rounded-xl border border-[#31551C]/30 bg-[#31551C]/10 px-3 py-2 text-xs font-bold text-[#31551C]">
          {toast}
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Shield size={16} className="text-[#FF9418]" /> Access controls
        </h2>
        <Toggle
          label="Require MFA"
          hint="Prompt for a second factor on admin login (demo flag)"
          checked={!!form.mfaRequired}
          onChange={(v) => set('mfaRequired', v)}
        />
        <Toggle
          label="Login alerts"
          hint="Notify on new device sign-in (demo flag)"
          checked={!!form.loginAlerts}
          onChange={(v) => set('loginAlerts', v)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Session timeout (minutes)</label>
            <input
              type="number"
              min={5}
              max={480}
              className={fieldClass}
              value={form.sessionTimeoutMinutes}
              onChange={(e) => set('sessionTimeoutMinutes', Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Max concurrent sessions</label>
            <input
              type="number"
              min={1}
              max={20}
              className={fieldClass}
              value={form.maxSessions}
              onChange={(e) => set('maxSessions', Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Password policy</h2>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className={labelClass}>Minimum length</dt>
            <dd className="text-sm font-extrabold text-slate-900">{form.passwordMinLength} characters</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className={labelClass}>Special character</dt>
            <dd className="text-sm font-extrabold text-slate-900">
              {form.requireSpecialChar ? 'Required' : 'Optional'}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className={labelClass}>IP allowlist</dt>
            <dd className="text-sm font-extrabold text-slate-900">
              {form.ipAllowlistEnabled ? 'Enabled' : 'Disabled'}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[10px] font-semibold text-slate-400">
          Password rules are display-only in this demo.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Active demo sessions</h2>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Device</th>
                <th className={thClass}>Location</th>
                <th className={thClass}>Last active</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_SESSIONS.map((s) => (
                <tr key={s.id}>
                  <td className={tdClass}>{s.device}</td>
                  <td className={tdClass}>{s.location}</td>
                  <td className={tdClass}>{formatAt(s.lastActive)}</td>
                  <td className={tdClass}>
                    {s.current ? (
                      <StatusBadge status="Active" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-slate-400">Idle</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Security event history</h2>
        <ul className="space-y-2">
          {SECURITY_EVENTS.map((ev) => (
            <li
              key={ev.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{ev.event}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">{formatAt(ev.at)}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  severityStyle[ev.severity] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {ev.severity}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleSave}
        title="Save security settings?"
        message="Update MFA, login alerts, session timeout, and max sessions in demo state. No real authentication changes occur."
        confirmLabel="Save settings"
      />
    </div>
  );
};

export default SecuritySettings;
