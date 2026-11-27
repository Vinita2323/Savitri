import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Search, X } from 'lucide-react';
import adminConfigService from '../../../../services/adminConfigService';
import { PermissionDrawer, moduleCount } from './PermissionDrawer';

export const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#79B433]';
export const btnPrimary = 'cursor-pointer rounded-xl border-0 bg-[#79B433] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#689A2B] disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost = 'cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export const Note = ({ type = 'error', children, testId }) => (
  <div role={type === 'error' ? 'alert' : 'status'} data-testid={testId} className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold ${type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : type === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
    {type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
    <span>{children}</span>
  </div>
);

export const Spinner = () => <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div>;

export const StatusChip = ({ status }) => (
  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{status}</span>
);

export const Dialog = ({ title, subtitle, onClose, children, footer, notice, wide, testId }) => {
  useEffect(() => { const h = (e) => e.key === 'Escape' && !e.defaultPrevented && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-3" role="dialog" aria-label={title} data-testid={testId}>
      <div className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-lg'}`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div><h2 className="m-0 text-base font-extrabold text-slate-900">{title}</h2>{subtitle && <p className="m-0 text-xs text-slate-500">{subtitle}</p>}</div>
          <button type="button" aria-label="Close" data-testid="ac-close" onClick={onClose} className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {/* messages stay in view however far the form is scrolled */}
        {notice && <div className="border-t border-slate-100 px-5 py-3">{notice}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export const PasswordInput = ({ value, onChange, placeholder, testId }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input data-testid={testId} type={show ? 'text' : 'password'} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pr-11`} />
      <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-slate-400">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </div>
  );
};

/** Brings the field that needs attention into view and puts the cursor in it. */
const showField = (selector) => setTimeout(() => {
  const el = document.querySelector(selector);
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el?.focus({ preventScroll: true });
}, 0);
const field = (id) => `[data-testid="${id}"]`;
const decisionField = (brandId) => `[data-testid="ac-brand-row"][data-brand="${brandId}"] [data-testid="ac-brand-decision"]`;

/** A City Admin's brand cannot be moved, so "Move" is only mentioned when it is really offered. */
const decideMessage = (pending, adminId) => {
  const movable = pending.some((b) => !b.holders.some((h) => h.adminId !== adminId && h.type === 'CITY_ADMIN'));
  return `Choose ${movable ? '"Move" or "Share"' : '"Share"'} (in the Current admin column), or untick, for: ${pending.map((b) => b.name).join(', ')}`;
};

/**
 * Every brand from the database with a checkbox. A brand that another admin manages needs an explicit decision:
 * "Move to this admin" (the other loses it) or "Share" (both use it).
 */
export const BrandPicker = ({ brands, adminId = '', initial = [], selected, setSelected, decisions, setDecisions, access, onConfigure, fullAccess = false }) => {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState('all');
  const others = (b) => b.holders.filter((h) => h.adminId !== adminId);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return brands.filter((b) => (!s || [b.name, b.city, b.state, b.code].some((v) => String(v || '').toLowerCase().includes(s)))
      && (only === 'all' || (only === 'selected' && selected.includes(b.brandId)) || (only === 'free' && b.holders.length === 0)));
  }, [brands, q, only, selected]);
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const added = selected.filter((id) => !initial.includes(id));
  const removed = initial.filter((id) => !selected.includes(id));
  return (
    <div className="space-y-3" data-testid="ac-brand-picker">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input data-testid="ac-brand-search" className={`${inputCls} pl-9`} placeholder="Search brand, city or state" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select data-testid="ac-brand-filter" aria-label="Show brands" className={`${inputCls} !w-auto`} value={only} onChange={(e) => setOnly(e.target.value)}>
          <option value="all">All brands</option><option value="free">Unassigned only</option><option value="selected">Selected only</option>
        </select>
        <span className="text-sm font-bold text-slate-700" data-testid="ac-selected-count">{selected.length} selected</span>
      </div>
      {(added.length > 0 || removed.length > 0) && initial.length > 0 && <p className="m-0 text-xs font-semibold text-slate-500">{added.length} to add, {removed.length} to remove. Removing a brand only removes access: no records are deleted.</p>}
      <div className="max-h-[44vh] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50"><tr className="text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Select</th><th className="px-3 py-2">Brand</th><th className="px-3 py-2">City</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Brand status</th><th className="px-3 py-2">Current admin</th><th className="px-3 py-2">Access configuration</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((b) => {
              const checked = selected.includes(b.brandId);
              const held = others(b);
              const needsDecision = checked && !initial.includes(b.brandId) && held.length > 0;
              const cityHeld = held.some((h) => h.type === 'CITY_ADMIN');
              return (
                <tr key={b.brandId} data-testid="ac-brand-row" data-brand={b.brandId} className={checked ? 'bg-emerald-50/50' : ''}>
                  <td className="px-3 py-2.5"><input type="checkbox" data-testid="ac-brand-check" aria-label={`Assign ${b.name}`} className="h-4 w-4 cursor-pointer" checked={checked} onChange={() => toggle(b.brandId)} /></td>
                  <td className="px-3 py-2.5 font-bold text-slate-900">{b.name}</td>
                  <td className="px-3 py-2.5">{b.city}</td><td className="px-3 py-2.5">{b.state}</td>
                  <td className="px-3 py-2.5">{b.status}</td>
                  <td className="px-3 py-2.5">
                    {b.holders.length === 0 ? <span className="text-slate-400">Unassigned</span> : <span>{b.holders.map((h) => `${h.adminId === adminId ? 'This admin' : h.name}${h.type === 'CITY_ADMIN' ? ' (City Admin)' : ''}${h.status !== 'active' ? ' (inactive)' : ''}`).join(', ')}</span>}
                    {needsDecision && (
                      <select data-testid="ac-brand-decision" aria-label={`What to do with ${b.name}`} className="mt-1.5 block w-full min-w-[190px] rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-900" value={decisions[b.brandId] || ''} onChange={(e) => setDecisions({ ...decisions, [b.brandId]: e.target.value })}>
                        <option value="">Choose what to do…</option>
                        {!cityHeld && <option value="transfer">Move to this admin (remove from current)</option>}
                        <option value="share">Share (both can use it)</option>
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5" data-testid="ac-brand-access">
                    {!checked ? <span className="text-slate-300">-</span> : (
                      <div className="min-w-[150px] space-y-1">
                        {access[b.brandId]
                          ? <p className="m-0 text-xs font-bold text-emerald-700" data-testid="ac-brand-config">Configured · {moduleCount(access[b.brandId].permissions)} module(s)</p>
                          : fullAccess
                            ? <p className="m-0 text-xs font-bold text-emerald-700" data-testid="ac-brand-config">Full access</p>
                            : <p className="m-0 text-xs font-bold text-amber-700" data-testid="ac-brand-config">Not configured</p>}
                        <button type="button" data-testid="ac-brand-configure" className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => onConfigure(b)}>{access[b.brandId] ? 'Edit Access' : 'Configure Access'}</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="m-0 p-6 text-center text-sm text-slate-500">{brands.length === 0 ? 'No brands exist yet. Create a brand under Business Brands first.' : 'No brand matches.'}</p>}
      </div>
    </div>
  );
};

/** Which selected brands still need a Move / Share decision, and the lists to send to the server */
export const readDecisions = (brands, adminId, initial, selected, decisions) => {
  const pending = brands.filter((b) => selected.includes(b.brandId) && !initial.includes(b.brandId) && b.holders.some((h) => h.adminId !== adminId) && !decisions[b.brandId]);
  return {
    pending,
    transferBrandIds: selected.filter((id) => decisions[id] === 'transfer'),
    shareBrandIds: selected.filter((id) => decisions[id] === 'share'),
  };
};

const BLANK = { name: '', email: '', mobile: '', password: '', status: 'active' };
const passwordOk = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const PASSWORD_RULE = 'Password must be at least 8 characters and include a letter and a number.';

/** The permission choices to send: one entry for every selected brand that has been configured. */
const accessEntries = (selected, access) => selected.filter((id) => access[id]).map((id) => ({ brandId: id, ...access[id] }));
const namesOf = (brands, ids) => brands.filter((b) => ids.includes(b.brandId)).map((b) => b.name).join(', ');

export const CreateAdminDialog = ({ brands, catalog, onClose, onSaved }) => {
  const [f, setF] = useState(BLANK);
  const [access, setAccess] = useState({});
  const [configuring, setConfiguring] = useState(null);
  const [selected, setSelected] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (p) => setF((x) => ({ ...x, ...p }));

  const save = async () => {
    setError('');
    const problem = (message, selector) => { setError(message); showField(selector); };
    if (f.name.trim().length < 2) return problem('Enter the admin\'s name.', field('ac-name'));
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return problem('Enter a valid email address.', field('ac-email'));
    if (!/^(91)?\d{10}$/.test(f.mobile.replace(/\D/g, ''))) return problem('Enter a 10-digit mobile number.', field('ac-mobile'));
    if (!passwordOk(f.password)) return problem(PASSWORD_RULE, field('ac-password'));
    const d = readDecisions(brands, '', [], selected, decisions);
    if (d.pending.length) return problem(decideMessage(d.pending, ''), decisionField(d.pending[0].brandId));
    const empty = selected.filter((id) => !access[id]);
    if (empty.length && !window.confirm(`Access is not configured for: ${namesOf(brands, empty)}. The admin will see nothing in these brands until you configure it. Create anyway?`)) return undefined;
    setBusy(true);
    try {
      const res = await adminConfigService.create({ ...f, confirmPassword: f.password, brandIds: selected, transferBrandIds: d.transferBrandIds, shareBrandIds: d.shareBrandIds, access: accessEntries(selected, access) });
      onSaved(`${res.admin.name} was created with ${res.admin.brandCount} brand(s). They sign in at /admin/login with ${res.admin.email} and the password you set.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
    return undefined;
  };

  return (
    <Dialog wide title="Create Admin" subtitle="Uses the existing Admin login and Admin panel" onClose={onClose} testId="ac-create" notice={error ? <Note testId="ac-error">{error}</Note> : null} footer={<><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button type="button" data-testid="ac-create-save" className={btnPrimary} disabled={busy} onClick={save}>{busy ? 'Creating…' : 'Create Admin'}</button></>}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Admin name *<input data-testid="ac-name" className={`${inputCls} mt-1`} value={f.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></label>
          <label className="text-xs font-bold text-slate-600">Email *<input data-testid="ac-email" type="email" className={`${inputCls} mt-1`} value={f.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" /></label>
          <label className="text-xs font-bold text-slate-600">Mobile number *<input data-testid="ac-mobile" inputMode="numeric" className={`${inputCls} mt-1`} value={f.mobile} onChange={(e) => set({ mobile: e.target.value })} autoComplete="off" /></label>
          <div className="text-xs font-bold text-slate-600">Password *<div className="mt-1"><PasswordInput testId="ac-password" value={f.password} onChange={(v) => set({ password: v })} placeholder="8+ characters, with a letter and a number" /></div></div>
          <label className="text-xs font-bold text-slate-600">Account status<select data-testid="ac-status" className={`${inputCls} mt-1`} value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
        <div>
          <h3 className="mb-2 mt-0 text-sm font-extrabold text-slate-900">Assign brands</h3>
          <p className="mb-2 mt-0 text-xs text-slate-500">After selecting a brand, use "Configure Access" to choose what the admin may do in that brand. Each brand has its own settings.</p>
          <BrandPicker brands={brands} selected={selected} setSelected={setSelected} decisions={decisions} setDecisions={setDecisions} access={access} onConfigure={setConfiguring} />
        </div>
        {configuring && <PermissionDrawer adminName={f.name.trim() || 'New admin'} brand={configuring} catalog={catalog} value={access[configuring.brandId]} onClose={() => setConfiguring(null)} onApply={(v) => { setAccess((x) => ({ ...x, [configuring.brandId]: v })); setConfiguring(null); }} />}
        {selected.length === 0 && <Note type="warn">With no brand selected this admin can sign in but will not see any business data.</Note>}
      </div>
    </Dialog>
  );
};

/** What an older (full-access) admin can do in a brand today: everything. The drawer starts from this. */
const fullValue = (catalog) => ({ roleProfile: 'CUSTOM', permissions: Object.fromEntries(catalog.modules.map((m) => [m.key, [...m.actions]])) });

/** The saved permissions of an admin, as editable choices per brand. */
const savedAccess = (admin) => Object.fromEntries(admin.brands.filter((b) => b.permissions?.configured).map((b) => [b.brandId, { roleProfile: b.permissions.roleProfile, permissions: b.permissions.permissions }]));

export const EditAdminDialog = ({ admin: initialAdmin, brands, catalog, startTab = 'details', onClose, onChanged }) => {
  const [admin, setAdmin] = useState(initialAdmin);
  const [tab, setTab] = useState(startTab);
  const [f, setF] = useState({ name: initialAdmin.name, email: initialAdmin.email, mobile: initialAdmin.mobile });
  const current = useMemo(() => admin.brands.map((b) => b.brandId), [admin]);
  const [selected, setSelected] = useState(current);
  const [decisions, setDecisions] = useState({});
  const [access, setAccess] = useState(() => savedAccess(initialAdmin));
  const [configuring, setConfiguring] = useState(null);
  const fullAccess = admin.permissionMode !== 'PER_BRAND'; // an older account: everything is allowed inside its brands
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  const run = async (fn, success) => {
    setError(''); setMsg(''); setBusy(true);
    try { await fn(); setMsg(success); await onChanged(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const saveDetails = () => run(async () => { const r = await adminConfigService.update(admin.id, f); setAdmin(r.admin); }, 'Details saved.');
  const toggleStatus = () => {
    const next = admin.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !window.confirm(`Deactivate ${admin.name}? They are signed out at once and cannot log in.`)) return;
    run(async () => { const r = await adminConfigService.setStatus(admin.id, next); setAdmin(r.admin); }, next === 'active' ? 'Account activated.' : 'Account deactivated.');
  };
  const saveBrands = () => {
    const d = readDecisions(brands, admin.id, current, selected, decisions);
    if (d.pending.length) { setMsg(''); setError(decideMessage(d.pending, admin.id)); showField(decisionField(d.pending[0].brandId)); return; }
    const confirmRestrict = admin.access === 'ALL';
    if (confirmRestrict && !window.confirm(`${admin.name} can currently use EVERY brand. After saving they can use only the ${selected.length} selected brand(s). Continue?`)) return;
    const removed = current.filter((id) => !selected.includes(id));
    if (!confirmRestrict && removed.length && !window.confirm(`Remove access to ${removed.length} brand(s)? The admin loses access immediately. No records are deleted.`)) return;
    const entries = accessEntries(selected, access);
    const unset = selected.filter((id) => !access[id]);
    // an older account: brands not configured here simply keep full access (handled by the server)
    if (!fullAccess && unset.length && !window.confirm(`Access is not configured for: ${namesOf(brands, unset)}. The admin will see nothing in these brands. Save anyway?`)) return;
    run(async () => {
      const r = await adminConfigService.setBrands(admin.id, { brandIds: selected, transferBrandIds: d.transferBrandIds, shareBrandIds: d.shareBrandIds, confirmRestrict, access: entries });
      setAdmin(r.admin); setSelected(r.admin.brands.map((b) => b.brandId)); setDecisions({}); setAccess(savedAccess(r.admin));
    }, 'Brands and access saved. It applies to the very next request of every admin involved.');
  };
  const reset = () => {
    if (!passwordOk(pw)) { setMsg(''); setError(PASSWORD_RULE); showField(field('ac-reset-password')); return; }
    run(async () => { await adminConfigService.resetPassword(admin.id, { password: pw, confirmPassword: pw }); setPw(''); }, 'Password changed. Give the new password to the admin. They have been signed out everywhere.');
  };

  return (
    <Dialog wide title={`Edit ${admin.name}`} subtitle={`${admin.email} · ${admin.brandCount} brand(s)`} onClose={onClose} testId="ac-edit" notice={error ? <Note testId="ac-error">{error}</Note> : msg ? <Note type="success" testId="ac-msg">{msg}</Note> : null}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {[['details', 'Details'], ['brands', 'Brands & access'], ['access', 'Status & password']].map(([k, l]) => (
            <button key={k} type="button" data-testid={`ac-tab-${k}`} aria-pressed={tab === k} onClick={() => { setTab(k); setError(''); setMsg(''); }} className={`cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-bold ${tab === k ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{l}</button>
          ))}
        </div>
        {tab === 'details' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold text-slate-600">Admin name<input data-testid="ac-edit-name" className={`${inputCls} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="text-xs font-bold text-slate-600">Email<input data-testid="ac-edit-email" type="email" className={`${inputCls} mt-1`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              <label className="text-xs font-bold text-slate-600">Mobile number<input data-testid="ac-edit-mobile" className={`${inputCls} mt-1`} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></label>
            </div>
            <p className="m-0 text-xs text-slate-500">Changing the email signs the admin out.</p>
            <button type="button" data-testid="ac-save-details" className={btnPrimary} disabled={busy} onClick={saveDetails}>Save details</button>
          </div>
        )}
        {tab === 'brands' && (
          <div className="space-y-3">
            {admin.access === 'ALL' && <Note type="warn">This older account can use every brand. Saving a selection here limits it to those brands.</Note>}
            <BrandPicker brands={brands} adminId={admin.id} initial={current} selected={selected} setSelected={setSelected} decisions={decisions} setDecisions={setDecisions} access={access} onConfigure={setConfiguring} fullAccess={fullAccess} />
            <button type="button" data-testid="ac-save-brands" className={btnPrimary} disabled={busy} onClick={saveBrands}>Save brands and access</button>
            {configuring && <PermissionDrawer adminName={admin.name} brand={configuring} catalog={catalog} value={access[configuring.brandId] || (fullAccess ? fullValue(catalog) : undefined)} onClose={() => setConfiguring(null)} onApply={(v) => { setAccess((x) => ({ ...x, [configuring.brandId]: v })); setConfiguring(null); setError(''); setMsg(`Access for ${configuring.name} is ready. Press "Save brands and access" to apply it.`); }} />}
          </div>
        )}
        {tab === 'access' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-700">Account is <StatusChip status={admin.status} /></div>
              <button type="button" data-testid="ac-toggle-status" className={btnGhost} disabled={busy} onClick={toggleStatus}>{admin.status === 'active' ? 'Deactivate account' : 'Activate account'}</button>
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="m-0 text-sm font-extrabold text-slate-900">Change password</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[240px] flex-1"><PasswordInput testId="ac-reset-password" value={pw} onChange={setPw} placeholder="New password (8+ characters, letter and number)" /></div>
                <button type="button" data-testid="ac-reset-typed" className={btnGhost} disabled={busy || !pw} onClick={reset}>Set this password</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
