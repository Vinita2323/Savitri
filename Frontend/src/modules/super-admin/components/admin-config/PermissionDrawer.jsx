import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const btnPrimary = 'cursor-pointer rounded-xl border-0 bg-[#79B433] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#689A2B]';
const btnGhost = 'cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50';
const ACTION_TITLES = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve', reject: 'Reject', export: 'Export', manage: 'Manage' };

export const moduleCount = (permissions) => Object.keys(permissions || {}).length;

/** "Select all" of one section: ticks every normal action of its modules. Sensitive actions are still ticked one by one. */
const GroupCheck = ({ group, modules, permissions, onChange }) => {
  const box = useRef(null);
  const wanted = modules.flatMap((m) => m.actions.filter((a) => !m.sensitive.includes(a)).map((a) => [m.key, a]));
  const ticked = wanted.filter(([k, a]) => permissions[k]?.includes(a)).length;
  const all = wanted.length > 0 && ticked === wanted.length;
  useEffect(() => { if (box.current) box.current.indeterminate = ticked > 0 && !all; }, [ticked, all]);
  return (
    <label className="ml-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold normal-case text-emerald-700">
      <input ref={box} type="checkbox" data-testid="ac-perm-group-all" data-group={group} aria-label={`Select all in ${group}`} className="h-4 w-4 cursor-pointer" checked={all} onChange={() => onChange(!all)} />
      Select all
    </label>
  );
};
const copy = (permissions) => Object.fromEntries(Object.entries(permissions || {}).map(([k, v]) => [k, [...v]]));
export const samePermissions = (a, b) => {
  const norm = (p) => JSON.stringify(Object.keys(p || {}).sort().map((k) => [k, [...p[k]].sort()]));
  return norm(a) === norm(b);
};

/**
 * Permissions of ONE admin in ONE brand. Choosing a role preset fills the matrix with a copy of it; every tick can then be
 * changed. Nothing is saved here: "Apply" hands the choice back to the admin form, which saves it with the brand assignment.
 */
export const PermissionDrawer = ({ adminName, brand, catalog, value, onApply, onClose }) => {
  const [roleProfile, setRoleProfile] = useState(value?.roleProfile || 'CUSTOM');
  const [permissions, setPermissions] = useState(() => copy(value?.permissions));
  const preset = catalog.presets.find((p) => p.key === roleProfile);
  const customised = roleProfile !== 'CUSTOM' && !samePermissions(permissions, preset?.permissions);

  // Escape closes this drawer only, not the admin form behind it
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);

  const groups = useMemo(() => catalog.modules.reduce((acc, m) => { (acc[m.group] = acc[m.group] || []).push(m); return acc; }, {}), [catalog]);

  const choosePreset = (key) => {
    setRoleProfile(key);
    const next = catalog.presets.find((p) => p.key === key);
    if (key !== 'CUSTOM') setPermissions(copy(next.permissions)); // "Custom role" keeps what is ticked now
  };
  const toggle = (mod, action) => setPermissions((current) => {
    const has = new Set(current[mod.key] || []);
    if (has.has(action)) {
      has.delete(action);
      if (action === 'view') has.clear(); // nothing works without View
    } else {
      has.add(action);
      has.add('view');
    }
    const next = { ...current };
    if (has.size) next[mod.key] = mod.actions.filter((a) => has.has(a)); else delete next[mod.key];
    return next;
  });
  // on: every normal action of the section (sensitive ones already ticked stay); off: the section's modules are cleared
  const toggleGroup = (modules, on) => setPermissions((current) => {
    const next = { ...current };
    for (const m of modules) {
      if (!on) { delete next[m.key]; continue; }
      const has = new Set([...(current[m.key] || []), ...m.actions.filter((a) => !m.sensitive.includes(a))]);
      next[m.key] = m.actions.filter((a) => has.has(a));
    }
    return next;
  });

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/50" role="dialog" aria-label={`Access of ${adminName} in ${brand.name}`} data-testid="ac-perm">
      <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="m-0 text-xs font-bold text-slate-500">Access configuration</p>
            <h2 className="m-0 text-base font-extrabold text-slate-900" data-testid="ac-perm-title">{adminName} · {brand.name}</h2>
            <p className="m-0 text-xs text-slate-500">{[brand.city, brand.state].filter(Boolean).join(', ')} · applies to this brand only</p>
          </div>
          <button type="button" aria-label="Close" data-testid="ac-perm-close" onClick={onClose} className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-3">
          <label className="text-xs font-bold text-slate-600">Role preset
            <select data-testid="ac-perm-preset" className="mt-1 block min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900" value={roleProfile} onChange={(e) => choosePreset(e.target.value)}>
              {catalog.presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <p className="m-0 min-w-[200px] flex-1 text-xs text-slate-500">{preset?.description} {customised && <b className="text-amber-700" data-testid="ac-perm-customised">Customised for this brand.</b>}</p>
          {roleProfile !== 'CUSTOM' && <button type="button" data-testid="ac-perm-reset" className={btnGhost} onClick={() => choosePreset(roleProfile)}>Reset to preset</button>}
          <button type="button" data-testid="ac-perm-clear" className={btnGhost} onClick={() => setPermissions({})}>Clear all</button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3">
          <table className="w-full min-w-[720px] border-collapse text-sm" data-testid="ac-perm-matrix">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-xs uppercase text-slate-500">
                <th className="py-2 pr-3 text-left">Module</th>
                {catalog.actions.map((a) => <th key={a} className="px-1 py-2 text-center">{ACTION_TITLES[a] || a}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([group, modules]) => (
                <React.Fragment key={group}>
                  <tr>
                    <td colSpan={catalog.actions.length + 1} className="pb-1 pt-4">
                      <span className="text-xs font-extrabold uppercase text-slate-700">{group}</span>
                      <GroupCheck group={group} modules={modules} permissions={permissions} onChange={(on) => toggleGroup(modules, on)} />
                      {modules[0].global && <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800"><AlertTriangle size={12} /> A change here affects every brand, not only this one.</span>}
                    </td>
                  </tr>
                  {modules.map((m) => (
                    <tr key={m.key} className="border-t border-slate-100" data-testid="ac-perm-row" data-module={m.key}>
                      <td className="py-1.5 pr-3 font-semibold text-slate-800">{m.label}</td>
                      {catalog.actions.map((a) => {
                        if (!m.actions.includes(a)) return <td key={a} className="text-center text-slate-300">·</td>;
                        const sensitive = m.sensitive.includes(a);
                        const label = m.labels?.[a];
                        return (
                          <td key={a} className={`px-1 py-1.5 text-center align-top ${sensitive ? 'bg-amber-50' : ''}`}>
                            <input type="checkbox" data-testid={`ac-perm-${m.key}-${a}`} aria-label={`${m.label}: ${label || ACTION_TITLES[a]}`} title={`${label || ACTION_TITLES[a]}${sensitive ? ' (sensitive)' : ''}`} className="h-4 w-4 cursor-pointer" checked={Boolean(permissions[m.key]?.includes(a))} onChange={() => toggle(m, a)} />
                            {label && <span className="mx-auto mt-0.5 block max-w-[90px] text-[10px] leading-tight text-slate-500">{label}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <p className="mb-0 mt-3 text-xs text-slate-500">Highlighted boxes are sensitive: they are never part of a preset or of "Select all", so tick them one by one. Brands, admin accounts, platform commission rates and payroll policy remain Super Admin only. Every admin can always open their own profile and documents.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <p className="m-0 text-sm font-bold text-slate-700" data-testid="ac-perm-count">{moduleCount(permissions)} module(s) enabled</p>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
            <button type="button" data-testid="ac-perm-apply" className={btnPrimary} onClick={() => onApply({ roleProfile, permissions })}>Apply to this brand</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionDrawer;
