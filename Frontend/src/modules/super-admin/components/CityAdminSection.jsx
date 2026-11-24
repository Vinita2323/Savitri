import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Power, ShieldCheck, UserPlus, X, Copy } from 'lucide-react';
import cityAdminService from '../../../services/cityAdminService';

const PERMS = [
  ['sellers', 'Sellers'], ['customers', 'Customers'], ['products', 'Products'], ['inventory', 'Inventory and purchases'], ['orders', 'Orders and returns'],
  ['captains', 'Delivery partners (captains)'], ['employees', 'Employees and payroll'], ['finance', 'Expenses, transactions, payouts and reports'], ['notifications', 'Notifications'],
];
const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 outline-none focus:border-[#79B433] focus:bg-white';
const label = 'mb-1 block text-sm font-bold text-slate-600';
const btn = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer';
const btnPrimary = 'inline-flex items-center gap-1.5 rounded-xl border-none bg-[#79B433] px-4 py-2 text-sm font-bold text-white hover:bg-[#689A2B] cursor-pointer disabled:opacity-60';

export const emptyCityAdmin = () => ({ mode: 'LATER', name: '', email: '', mobile: '', username: '', password: '', confirmPassword: '', generatePassword: false, status: 'active', permissions: PERMS.map(([k]) => k) });

const Permissions = ({ value, onChange, disabled }) => (
  <div className="grid gap-2 sm:grid-cols-2" data-testid="ca-perms">
    {PERMS.map(([k, l]) => (
      <label key={k} className="flex items-center gap-2 text-base text-slate-700 cursor-pointer">
        <input type="checkbox" data-testid={`ca-perm-${k}`} disabled={disabled} checked={value.includes(k)} onChange={(e) => onChange(e.target.checked ? [...value, k] : value.filter((x) => x !== k))} /> {l}
      </label>
    ))}
  </div>
);

/** The person's fields (shared by create, edit and reassign) */
const PersonFields = ({ f, set, withPassword = true, idPrefix = 'ca' }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <div><label className={label}>Admin full name *</label><input data-testid={`${idPrefix}-name`} className={input} value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
    <div><label className={label}>Admin email *</label><input data-testid={`${idPrefix}-email`} type="email" autoComplete="off" className={input} value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
    <div><label className={label}>Mobile number *</label><input data-testid={`${idPrefix}-mobile`} inputMode="numeric" className={input} value={f.mobile} onChange={(e) => set({ mobile: e.target.value })} placeholder="10-digit mobile" /></div>
    <div><label className={label}>Username (optional)</label><input data-testid={`${idPrefix}-username`} autoComplete="off" className={input} value={f.username} onChange={(e) => set({ username: e.target.value })} placeholder="letters, numbers, . - _" /></div>
    {withPassword && (
      <>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-base font-semibold text-slate-700 cursor-pointer"><input type="checkbox" data-testid={`${idPrefix}-generate`} checked={f.generatePassword} onChange={(e) => set({ generatePassword: e.target.checked })} /> Generate a temporary password (the admin must change it at the first login)</label>
        </div>
        {!f.generatePassword && (
          <>
            <div><label className={label}>Password *</label><input data-testid={`${idPrefix}-password`} type="password" autoComplete="new-password" className={input} value={f.password} onChange={(e) => set({ password: e.target.value })} placeholder="8+ characters, a letter and a number" /></div>
            <div><label className={label}>Confirm password *</label><input data-testid={`${idPrefix}-confirm`} type="password" autoComplete="new-password" className={input} value={f.confirmPassword} onChange={(e) => set({ confirmPassword: e.target.value })} /></div>
          </>
        )}
      </>
    )}
  </div>
);

const TempPassword = ({ value, onClose }) => (
  <div role="alert" data-testid="ca-temp" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-base">
    <p className="m-0 font-bold text-amber-900">Temporary password (shown only now)</p>
    <p className="m-0 mt-1 text-sm text-amber-800">Give it to the admin securely. It can not be viewed again. They must change it when they first sign in.</p>
    <div className="mt-2 flex items-center gap-2"><code data-testid="ca-temp-value" className="rounded-lg bg-white px-3 py-1.5 font-mono text-lg font-bold text-slate-900 border border-amber-200">{value}</code>
      <button type="button" className={btn} onClick={() => navigator.clipboard?.writeText(value)}><Copy size={13} /> Copy</button><button type="button" className={btn} onClick={onClose}>Done</button></div>
  </div>
);

/** Section F of Create Brand: create the City Admin now, or leave it for later */
export const CityAdminCreateSection = ({ value, onChange }) => {
  const set = (p) => onChange({ ...value, ...p });
  return (
    <div className="space-y-4" data-testid="ca-create-section">
      <div className="grid gap-2 sm:grid-cols-2">
        {[['NOW', 'Create City Admin now', 'The admin account is created together with the brand.'], ['LATER', 'Configure Admin later', 'The brand is published without an admin. It will show "Admin pending" until you set one up.']].map(([k, t, d]) => (
          <label key={k} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${value.mode === k ? 'border-[#79B433] bg-[#79B433]/5' : 'border-slate-200'}`}>
            <input type="radio" name="ca-mode" data-testid={`ca-mode-${k}`} checked={value.mode === k} onChange={() => set({ mode: k })} className="mt-1" />
            <span><span className="block text-base font-bold text-slate-900">{t}</span><span className="block text-sm text-slate-500">{d}</span></span>
          </label>
        ))}
      </div>
      {value.mode === 'LATER' && <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" data-testid="ca-pending-note">Admin setup will be pending for this brand. You can complete it later from Edit Brand.</p>}
      {value.mode === 'NOW' && (
        <div className="space-y-4">
          <PersonFields f={value} set={set} />
          <div><label className={label}>Account status</label>
            <select data-testid="ca-status" className={input} value={value.status} onChange={(e) => set({ status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div><label className={label}>Assign permissions</label><Permissions value={value.permissions} onChange={(p) => set({ permissions: p })} /></div>
          <p className="m-0 text-sm text-slate-500">The admin is tied to this brand and its city automatically. They can only see and change this brand's data.</p>
        </div>
      )}
    </div>
  );
};

const StatusChip = ({ s }) => {
  const m = { CONFIGURED: ['Admin configured', 'bg-emerald-50 text-emerald-700 border-emerald-200'], PENDING: ['Admin pending', 'bg-amber-50 text-amber-800 border-amber-200'], INACTIVE: ['Admin inactive', 'bg-slate-100 text-slate-600 border-slate-300'] }[s] || [s, ''];
  return <span data-testid="ca-status-chip" data-status={s} className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-bold ${m[1]}`}>{m[0]}</span>;
};
export { StatusChip as CityAdminStatusChip };

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never');

/** Edit Brand: "City Admin & Login Credentials" for an already registered brand */
export const CityAdminManageSection = ({ brandId, onChanged }) => {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [temp, setTemp] = useState('');
  const [mode, setMode] = useState(''); // create | edit | reset | perms | reassign | details
  const [form, setForm] = useState(emptyCityAdmin());
  const [perms, setPerms] = useState([]);
  const [reset, setReset] = useState({ generatePassword: true, password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => cityAdminService.getAdmin(brandId).then((r) => { setD(r); setError(''); }).catch((e) => setError(e.message)), [brandId]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setBusy(true); setError(''); setMsg('');
    try { const r = await fn(); if (r?.temporaryPassword) setTemp(r.temporaryPassword); setMsg(ok || r?.message || 'Saved.'); setMode(''); await load(); onChanged?.(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const a = d?.admin;
  const open = (m) => {
    setError(''); setMsg(''); setTemp('');
    if (m === 'create') { setForm({ ...emptyCityAdmin(), generatePassword: true }); }
    if (m === 'edit' && a) setForm({ ...emptyCityAdmin(), name: a.name, email: a.email, mobile: a.mobile, username: a.username });
    if (m === 'perms' && a) setPerms([...a.permissions]);
    if (m === 'reset') setReset({ generatePassword: true, password: '', confirmPassword: '' });
    setMode(m);
  };
  const body = (f) => ({ name: f.name, email: f.email, mobile: f.mobile, username: f.username, password: f.password, confirmPassword: f.confirmPassword, generatePassword: f.generatePassword, status: f.status, permissions: f.permissions });

  if (!d && !error) return <p className="m-0 text-base text-slate-500">Loading City Admin...</p>;
  return (
    <div className="space-y-4" data-testid="ca-manage">
      {error && <p role="alert" data-testid="ca-error" className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {msg && <p data-testid="ca-msg" className="m-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{msg}</p>}
      {temp && <TempPassword value={temp} onClose={() => setTemp('')} />}
      {d && (
        <>
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-base sm:grid-cols-3">
            <div><p className="m-0 text-xs text-slate-500">Brand name</p><p className="m-0 font-bold" data-testid="ca-brand-name">{d.brand.name}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Brand code</p><p className="m-0 font-bold">{d.brand.code}</p></div>
            <div><p className="m-0 text-xs text-slate-500">Associated city</p><p className="m-0 font-bold" data-testid="ca-city">{d.brand.city || 'Not set'}</p></div>
          </div>
          {d.cityProblem && <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" data-testid="ca-city-problem">{d.cityProblem}</p>}

          {!a && mode !== 'create' && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center" data-testid="ca-none">
              <p className="m-0 text-lg font-bold text-slate-800">City Admin Not Configured</p>
              <p className="m-0 mt-1 text-sm text-slate-500">This brand has no administrator yet, so nobody can sign in to manage it.</p>
              <button type="button" data-testid="ca-create-btn" className={`${btnPrimary} mt-3`} disabled={Boolean(d.cityProblem)} onClick={() => open('create')}><UserPlus size={14} /> + Create City Admin</button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 p-4" data-testid="ca-create-form">
              <p className="m-0 text-base font-bold">Create City Admin for {d.brand.name}</p>
              <PersonFields f={form} set={(p) => setForm({ ...form, ...p })} />
              <div><label className={label}>Account status</label><select data-testid="ca-status" className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              <div><label className={label}>Assign permissions</label><Permissions value={form.permissions} onChange={(p) => setForm({ ...form, permissions: p })} /></div>
              <div className="flex gap-2"><button type="button" data-testid="ca-create-save" disabled={busy} className={btnPrimary} onClick={() => run(() => cityAdminService.create(brandId, body(form)), 'City Admin created.')}>Create City Admin</button><button type="button" className={btn} onClick={() => setMode('')}>Cancel</button></div>
            </div>
          )}

          {a && (
            <div className="space-y-4 rounded-2xl border border-slate-200 p-4" data-testid="ca-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="m-0 text-lg font-bold text-slate-900" data-testid="ca-admin-name">{a.name}</p><p className="m-0 text-sm text-slate-500" data-testid="ca-admin-email">{a.email}</p></div>
                <StatusChip s={d.adminStatus} />
              </div>
              <div className="grid gap-3 text-base sm:grid-cols-3">
                <div><p className="m-0 text-xs text-slate-500">Mobile number</p><p className="m-0 font-semibold">{a.mobile || '-'}</p></div>
                <div><p className="m-0 text-xs text-slate-500">Username</p><p className="m-0 font-semibold">{a.username || '-'}</p></div>
                <div><p className="m-0 text-xs text-slate-500">Last login</p><p className="m-0 font-semibold" data-testid="ca-lastlogin">{when(a.lastLoginAt)}</p></div>
                <div className="sm:col-span-3"><p className="m-0 text-xs text-slate-500">Assigned permissions</p>
                  <div className="mt-1 flex flex-wrap gap-1.5" data-testid="ca-perm-list">{a.permissions.length ? a.permissions.map((p) => <span key={p} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{PERMS.find((x) => x[0] === p)?.[1] || p}</span>) : <span className="text-sm text-slate-400">None</span>}</div></div>
                {a.mustChangePassword && <p className="m-0 text-sm font-semibold text-amber-700 sm:col-span-3">Waiting for the admin to replace a temporary password.</p>}
              </div>
              <div className="flex flex-wrap gap-2" data-testid="ca-actions">
                <button type="button" data-testid="ca-view" className={btn} onClick={() => setMode(mode === 'details' ? '' : 'details')}><ShieldCheck size={13} /> View admin details</button>
                <button type="button" data-testid="ca-edit" className={btn} onClick={() => open('edit')}><Pencil size={13} /> Edit admin details</button>
                <button type="button" data-testid="ca-reset" className={btn} onClick={() => open('reset')}><KeyRound size={13} /> Reset password</button>
                <button type="button" data-testid="ca-toggle" className={btn} disabled={busy} onClick={() => run(() => cityAdminService.setStatus(brandId, a.status === 'active' ? 'inactive' : 'active'))}><Power size={13} /> {a.status === 'active' ? 'Deactivate account' : 'Activate account'}</button>
                <button type="button" data-testid="ca-perms-btn" className={btn} onClick={() => open('perms')}><ShieldCheck size={13} /> Update permissions</button>
              </div>

              {mode === 'details' && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600" data-testid="ca-details">
                  <p className="m-0 font-bold text-slate-800">Account history</p>
                  <ul className="m-0 mt-1 list-none space-y-1 p-0">{a.history.length ? [...a.history].reverse().map((h, i) => <li key={i}>{h.action.toLowerCase().replace(/_/g, ' ')} · {h.by} · {when(h.at)}{h.note ? ` · ${h.note}` : ''}</li>) : <li>No history recorded.</li>}</ul>
                  <p className="m-0 mt-2">City: <b>{a.city}</b> · Brand: <b>{a.brandId}</b> · Created {when(a.createdAt)}{a.assignedBy ? ` by ${a.assignedBy}` : ''}</p>
                </div>
              )}
              {mode === 'edit' && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-3" data-testid="ca-edit-form">
                  <PersonFields f={form} set={(p) => setForm({ ...form, ...p })} withPassword={false} idPrefix="ce" />
                  <p className="m-0 text-sm text-slate-500">Changing the email signs the admin out.</p>
                  <div className="flex gap-2"><button type="button" data-testid="ce-save" disabled={busy} className={btnPrimary} onClick={() => run(() => cityAdminService.update(brandId, { name: form.name, email: form.email, mobile: form.mobile, username: form.username }))}>Save details</button><button type="button" className={btn} onClick={() => setMode('')}>Cancel</button></div>
                </div>
              )}
              {mode === 'reset' && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-3" data-testid="ca-reset-form">
                  <label className="flex items-center gap-2 text-base font-semibold text-slate-700 cursor-pointer"><input type="checkbox" data-testid="cr-generate" checked={reset.generatePassword} onChange={(e) => setReset({ ...reset, generatePassword: e.target.checked })} /> Generate a temporary password</label>
                  {!reset.generatePassword && <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>New password</label><input data-testid="cr-password" type="password" autoComplete="new-password" className={input} value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} /></div><div><label className={label}>Confirm</label><input data-testid="cr-confirm" type="password" autoComplete="new-password" className={input} value={reset.confirmPassword} onChange={(e) => setReset({ ...reset, confirmPassword: e.target.value })} /></div></div>}
                  <p className="m-0 text-sm text-slate-500">The admin is signed out everywhere and must choose a new password at the next login.</p>
                  <div className="flex gap-2"><button type="button" data-testid="cr-save" disabled={busy} className={btnPrimary} onClick={() => run(() => cityAdminService.resetPassword(brandId, reset))}>Reset password</button><button type="button" className={btn} onClick={() => setMode('')}>Cancel</button></div>
                </div>
              )}
              {mode === 'perms' && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-3" data-testid="ca-perms-form">
                  <Permissions value={perms} onChange={setPerms} />
                  <div className="flex gap-2"><button type="button" data-testid="cp-save" disabled={busy} className={btnPrimary} onClick={() => run(() => cityAdminService.setPermissions(brandId, perms))}>Save permissions</button><button type="button" className={btn} onClick={() => setMode('')}>Cancel</button></div>
                </div>
              )}
            </div>
          )}

          {d.previousAdmins.length > 0 && (
            <div data-testid="ca-previous"><p className="m-0 mb-1 text-sm font-bold text-slate-500">Previous admins</p>
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-slate-600">{d.previousAdmins.map((p) => <li key={p.id}>{p.name} ({p.email}) · {p.status}</li>)}</ul></div>
          )}
          <p className="m-0 text-xs text-slate-400 flex items-center gap-1"><X size={0} />City Admins sign in at <b>/city-admin/login</b>.</p>
        </>
      )}
    </div>
  );
};
