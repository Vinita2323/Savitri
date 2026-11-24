import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Copy, ListPlus, Paperclip, Plus, Search, Trash2, Users, X } from 'lucide-react';
import employeeService from '../../../../services/employeeService';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const MAX_TASKS = 50;

const labelCls = 'block text-[13px] font-semibold text-slate-700 mb-1.5';
const inputCls =
  'w-full px-4 py-3 text-[15px] bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';
const linkBtn = 'inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline bg-transparent border-0 p-0 cursor-pointer';

const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the user's own time zone
const shortDate = (s) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');

// The people (and priority) used last time are remembered in this browser, so a second batch for the same person needs no re-selecting
const MEMORY_KEY = 'savitri_new_tasks_defaults';
const readMemory = () => { try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}') || {}; } catch { return {}; } };
const writeMemory = (v) => { try { localStorage.setItem(MEMORY_KEY, JSON.stringify(v)); } catch { /* private mode: just skip */ } };

let seq = 0;
const newRow = (title = '') => ({ key: ++seq, title, description: '', attachments: [], showMore: false, custom: null, error: '', uploading: false });

/** Searchable, multi-select list of people, grouped by department ("select all" per department). */
const PeoplePicker = ({ staff, value, onChange, invalid, testId }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selected = useMemo(() => new Set(value), [value]);
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const by = new Map();
    staff.forEach((e) => {
      if (needle && !`${e.fullName} ${e.designation || ''} ${e.department || ''}`.toLowerCase().includes(needle)) return;
      const d = e.department || 'Other';
      if (!by.has(d)) by.set(d, []);
      by.get(d).push(e);
    });
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [staff, q]);

  const toggle = (id) => onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  const toggleGroup = (list) => {
    const ids = list.map((e) => e._id);
    const all = ids.every((i) => selected.has(i));
    onChange(all ? value.filter((i) => !ids.includes(i)) : [...new Set([...value, ...ids])]);
  };

  const names = value.map((id) => staff.find((e) => e._id === id)?.fullName).filter(Boolean);
  const label = names.length === 0 ? 'Choose people' : names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        className={`${inputCls} flex items-center justify-between gap-3 text-left cursor-pointer ${invalid ? '!border-rose-400 !ring-2 !ring-rose-200' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`flex items-center gap-2 min-w-0 ${names.length ? 'text-slate-900' : 'text-slate-400'}`}><Users className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span></span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl">
          <div className="p-3 border-b border-slate-100 relative">
            <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
            <input data-testid="nt-picker-search" autoFocus className={`${inputCls} !py-2 pl-10`} placeholder="Search by name or department" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {groups.length === 0 && <p className="px-4 py-6 m-0 text-center text-[14px] text-slate-500">No one matches “{q}”.</p>}
            {groups.map(([dept, list]) => {
              const allOn = list.every((e) => selected.has(e._id));
              return (
                <div key={dept}>
                  <button type="button" data-testid={`nt-dept-all-${dept}`} onClick={() => toggleGroup(list)} className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[12px] font-extrabold uppercase tracking-wide text-slate-500 border-0 cursor-pointer">
                    <span>{dept}</span>
                    <span className={allOn ? 'text-emerald-700' : 'text-slate-400'}>{allOn ? 'Clear all' : `Select all ${list.length}`}</span>
                  </button>
                  {list.map((e) => {
                    const on = selected.has(e._id);
                    return (
                      <button type="button" key={e._id} role="option" aria-selected={on} data-testid={`nt-person-${e._id}`} onClick={() => toggle(e._id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-emerald-50 border-0 bg-white cursor-pointer">
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>{on && <Check className="w-3.5 h-3.5" />}</span>
                        <span className="min-w-0"><span className="block text-[15px] font-semibold text-slate-900 truncate">{e.fullName}</span><span className="block text-[13px] text-slate-500 truncate">{e.designation}</span></span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 text-[13px]">
            <span className="text-slate-500">{value.length} selected</span>
            <div className="flex gap-3">
              {value.length > 0 && <button type="button" onClick={() => onChange([])} className={linkBtn}>Clear</button>}
              <button type="button" data-testid="nt-picker-done" onClick={() => setOpen(false)} className="px-3 py-1.5 text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg border-0 cursor-pointer">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Who + when + how urgent: used for the "same for every task" panel and for a single task that needs its own. */
const WhoWhen = ({ staff, v, onChange, errors = {}, prefix }) => (
  <div className="grid sm:grid-cols-2 gap-4">
    <div className="sm:col-span-2">
      <label className={labelCls}>Give to *</label>
      <PeoplePicker staff={staff} value={v.employeeIds} onChange={(employeeIds) => onChange({ employeeIds })} invalid={errors.people} testId={`${prefix}-people`} />
    </div>
    <div>
      <label className={labelCls}>Task given on *</label>
      <input data-testid={`${prefix}-start`} type="date" className={`${inputCls} ${errors.dates ? '!border-rose-400' : ''}`} value={v.startDate} max={v.dueDate || undefined} onChange={(e) => onChange({ startDate: e.target.value })} />
    </div>
    <div>
      <label className={labelCls}>Complete by *</label>
      <input data-testid={`${prefix}-due`} type="date" className={`${inputCls} ${errors.dates ? '!border-rose-400' : ''}`} value={v.dueDate} min={v.startDate || undefined} onChange={(e) => onChange({ dueDate: e.target.value })} />
    </div>
    <div className="sm:col-span-2">
      <label className={labelCls}>How urgent?</label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Priority">
        {PRIORITIES.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={v.priority === p} data-testid={`${prefix}-priority-${p}`} onClick={() => onChange({ priority: p })} className={`px-4 py-2 text-[14px] font-semibold rounded-full border cursor-pointer ${v.priority === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>{p}</button>
        ))}
      </div>
    </div>
  </div>
);

export const NewTasksModal = ({ staff, activeBrandId, initialPeople = [], onCreate, onClose }) => {
  // People: the ones passed in (e.g. "Give Asha another task"), otherwise the ones used last time that still exist
  const remembered = useMemo(() => {
    const m = readMemory();
    const known = new Set(staff.map((e) => e._id));
    const ids = (Array.isArray(m.employeeIds) ? m.employeeIds : []).filter((id) => known.has(id));
    return { ids, priority: PRIORITIES.includes(m.priority) ? m.priority : 'Medium', mode: m.mode === 'shared' ? 'shared' : 'separate' };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const preset = initialPeople.filter((id) => staff.some((e) => e._id === id));
  const usedMemory = preset.length === 0 && remembered.ids.length > 0;

  const [shared, setShared] = useState({ employeeIds: preset.length ? preset : remembered.ids, startDate: todayStr(), dueDate: '', priority: remembered.priority });
  const [mode, setMode] = useState(remembered.mode); // with several people: one task each, or one shared task
  const [rows, setRows] = useState(() => [newRow()]);
  const [focusKey, setFocusKey] = useState(() => seq);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const staffById = useMemo(() => new Map(staff.map((e) => [e._id, e])), [staff]);
  const eff = (r) => r.custom || shared;
  const patchShared = (p) => { setShared((s) => ({ ...s, ...p })); setErrors((e) => ({ ...e, shared: '' })); setFormError(''); setNotice(''); };
  const patchRow = (key, p) => { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p, error: '' } : r))); setFormError(''); setNotice(''); };
  const patchCustom = (key, p) => { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, custom: { ...r.custom, ...p }, error: '' } : r))); setFormError(''); };

  const addRow = () => {
    if (rows.length >= MAX_TASKS) return setFormError(`You can add at most ${MAX_TASKS} tasks at a time.`);
    const r = newRow();
    setRows((rs) => [...rs, r]); setFocusKey(r.key); setFormError('');
  };
  const duplicateRow = (key) => {
    if (rows.length >= MAX_TASKS) return setFormError(`You can add at most ${MAX_TASKS} tasks at a time.`);
    const src = rows.find((r) => r.key === key); if (!src) return;
    const r = { ...newRow(src.title), description: src.description, custom: src.custom ? { ...src.custom } : null };
    setRows((rs) => { const i = rs.findIndex((x) => x.key === key); return [...rs.slice(0, i + 1), r, ...rs.slice(i + 1)]; });
    setFocusKey(r.key);
  };
  const removeRow = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newRow()]));
  const addFromList = () => {
    const names = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!names.length) return;
    const blankOnly = rows.every((r) => !r.title.trim() && !r.description && !r.custom);
    const room = MAX_TASKS - (blankOnly ? 0 : rows.length);
    if (names.length > room) setFormError(`Only ${room} more task${room === 1 ? '' : 's'} fit. The rest were left out.`);
    const added = names.slice(0, Math.max(0, room)).map((t) => newRow(t.slice(0, 200)));
    setRows((rs) => (blankOnly ? added : [...rs, ...added]));
    setPasteText(''); setShowPaste(false); setNotice('');
  };
  const onFile = async (key, e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    patchRow(key, { uploading: true });
    try {
      const up = await employeeService.uploadTaskFile(f);
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, uploading: false, attachments: [...r.attachments, up] } : r)));
    } catch (err) {
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, uploading: false, error: err.message } : r)));
    }
  };

  const brandOf = (id) => (activeBrandId && activeBrandId !== 'ALL' ? activeBrandId : staffById.get(id)?.brandId || '');
  const filled = rows.filter((r) => r.title.trim());

  // The exact tasks that will be created (also drives the summary line)
  const plan = useMemo(() => {
    const out = [];
    filled.forEach((r) => {
      const e = r.custom || shared;
      const ids = e.employeeIds;
      const base = { rowKey: r.key, title: r.title.trim(), description: r.description, priority: e.priority, startDate: e.startDate, dueDate: e.dueDate, attachments: r.attachments };
      if (!ids.length) return;
      if (ids.length > 1 && mode === 'separate') ids.forEach((id) => out.push({ ...base, ids: [id], brandId: brandOf(id) }));
      else {
        const byBrand = new Map();
        ids.forEach((id) => { const b = brandOf(id); if (!byBrand.has(b)) byBrand.set(b, []); byBrand.get(b).push(id); });
        byBrand.forEach((list, b) => out.push({ ...base, ids: list, brandId: b }));
      }
    });
    return out;
  }, [filled, shared, mode, activeBrandId, staffById]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = shared.employeeIds.length;
  const summary = (() => {
    if (!filled.length) return 'Add at least one task';
    const t = `${filled.length} task${filled.length === 1 ? '' : 's'}`;
    if (people > 1 && mode === 'separate' && !filled.some((r) => r.custom)) return `${t} × ${people} people = ${plan.length} tasks to create`;
    return `${plan.length} task${plan.length === 1 ? '' : 's'} to create`;
  })();

  const dateProblem = (e) => (!e.startDate ? 'Choose the date the task is given.' : !e.dueDate ? 'Choose the date it must be completed by.' : e.dueDate < e.startDate ? 'The completion date must be on or after the date it is given.' : '');

  const submit = async (ev, keepOpen = false) => {
    ev?.preventDefault?.();
    setFormError('');
    setNotice('');
    const next = {};
    if (!filled.length) return setFormError('Type at least one task name.');
    const usesShared = filled.some((r) => !r.custom);
    if (usesShared) {
      if (!shared.employeeIds.length) next.shared = 'Choose who these tasks are for.';
      else if (dateProblem(shared)) next.shared = dateProblem(shared);
    }
    const checked = rows.map((r) => {
      if (!r.title.trim()) return { ...r, error: '' };
      if (r.custom) {
        if (!r.custom.employeeIds.length) return { ...r, error: 'Choose who this task is for.' };
        const dp = dateProblem(r.custom);
        if (dp) return { ...r, error: dp };
      }
      return { ...r, error: '' };
    });
    setRows(checked);
    setErrors(next);
    if (next.shared || checked.some((r) => r.error)) return setFormError(next.shared || 'Please fix the tasks marked in red.');
    if (plan.some((t) => !t.brandId)) return setFormError('Could not work out the brand for a task. Choose the people again.');
    if (plan.length > MAX_TASKS) return setFormError(`That would create ${plan.length} tasks; the limit is ${MAX_TASKS} at a time. Remove a task or a person.`);

    setSaving(true);
    const res = await onCreate(plan.map((t) => ({
      title: t.title, description: t.description, brandId: t.brandId, priority: t.priority, startDate: t.startDate, dueDate: t.dueDate,
      assignedEmployeeIds: t.ids, attachments: t.attachments,
    })));
    setSaving(false);
    const results = res?.results || [];
    if (!results.length) return setFormError(res?.message || 'The tasks could not be created. Please try again.');

    // Rows whose tasks all went through are done; a row with a failure stays, limited to the people it still needs
    const failedByRow = new Map();
    plan.forEach((t, i) => {
      if (results[i]?.success) return;
      const cur = failedByRow.get(t.rowKey) || { ids: [], msg: results[i]?.message || 'Could not create this task.' };
      cur.ids.push(...t.ids);
      failedByRow.set(t.rowKey, cur);
    });
    if (res.created > 0) writeMemory({ employeeIds: shared.employeeIds, priority: shared.priority, mode });
    if (!failedByRow.size) {
      if (!keepOpen) { onClose(true); return; }
      // Same people, dates and priority stay; only the task list starts again
      const fresh = newRow();
      setRows([fresh]); setFocusKey(fresh.key); setShowPaste(false);
      const who = shared.employeeIds.map((id) => staffById.get(id)?.fullName).filter(Boolean);
      setNotice(`${res.created} task${res.created === 1 ? '' : 's'} created${who.length ? ' for ' + (who.length <= 2 ? who.join(' & ') : `${who[0]} and ${who.length - 1} others`) : ''}. Add the next ones below, or close when you are done.`);
      return;
    }
    setRows(rows
      .filter((r) => failedByRow.has(r.key))
      .map((r) => {
        const f = failedByRow.get(r.key);
        return { ...r, custom: { ...eff(r), employeeIds: [...new Set(f.ids)] }, error: f.msg };
      }));
    setFormError(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-4" onClick={() => !saving && onClose()}>
      <form data-testid="nt-form" noValidate onSubmit={(e) => submit(e, false)} className="bg-white rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 m-0">New tasks</h3>
            <p className="text-[15px] text-slate-500 mt-1 mb-0">Choose who and when once, then list the tasks. Each person is notified straight away.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0" aria-label="Close"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6">
          {/* STEP 1 */}
          <section className={`rounded-2xl border p-5 space-y-4 ${errors.shared ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-slate-50/60'}`}>
            <h4 className="m-0 flex items-center gap-2.5 text-[15px] font-extrabold text-slate-900"><span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[13px] flex items-center justify-center">1</span> Who is it for, and when?</h4>
            {usedMemory && people > 0 && (
              <p data-testid="nt-remembered" className="m-0 text-[13px] text-slate-500">Same people as last time. <button type="button" className={linkBtn} onClick={() => patchShared({ employeeIds: [] })}>Choose different people</button></p>
            )}
            <WhoWhen staff={staff} v={shared} onChange={patchShared} errors={{ people: errors.shared && !shared.employeeIds.length, dates: errors.shared && shared.employeeIds.length }} prefix="nt-shared" />
            {people > 1 && (
              <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2" role="radiogroup" aria-label="How to give the tasks to several people">
                <label className="flex items-start gap-3 cursor-pointer text-[14px]"><input type="radio" name="nt-mode" data-testid="nt-mode-separate" checked={mode === 'separate'} onChange={() => setMode('separate')} className="mt-1" /><span><strong className="text-slate-900">A separate task for each person</strong> <span className="text-slate-500">(recommended — each person finishes and reports their own)</span></span></label>
                <label className="flex items-start gap-3 cursor-pointer text-[14px]"><input type="radio" name="nt-mode" data-testid="nt-mode-shared" checked={mode === 'shared'} onChange={() => setMode('shared')} className="mt-1" /><span><strong className="text-slate-900">One shared task for everyone</strong> <span className="text-slate-500">(one task with {people} people on it)</span></span></label>
              </div>
            )}
            {errors.shared && <div data-testid="nt-shared-error" className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-[14px] font-semibold text-rose-800">{errors.shared}</div>}
          </section>

          {/* STEP 2 */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="m-0 flex items-center gap-2.5 text-[15px] font-extrabold text-slate-900"><span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[13px] flex items-center justify-center">2</span> What needs to be done?</h4>
              <button type="button" data-testid="nt-paste-toggle" onClick={() => setShowPaste((v) => !v)} className={linkBtn}><ListPlus className="w-4 h-4" /> Paste a list</button>
            </div>

            {notice && <div data-testid="nt-notice" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[14px] font-semibold text-emerald-800">{notice}</div>}

            {showPaste && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className={labelCls}>One task per line</label>
                <textarea data-testid="nt-paste" autoFocus className={inputCls} rows={5} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'Count the stock on shelf B\nClean the cold room\nUpdate the price tags'} />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowPaste(false)} className="px-4 py-2.5 text-[14px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl cursor-pointer">Cancel</button>
                  <button type="button" data-testid="nt-paste-add" onClick={addFromList} disabled={!pasteText.trim()} className="px-4 py-2.5 text-[14px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl cursor-pointer border-0">Add these tasks</button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {rows.map((r, i) => {
                const e = eff(r);
                return (
                  <div key={r.key} data-testid="nt-row" className={`rounded-xl border p-3 sm:p-4 ${r.error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-2 w-7 h-7 shrink-0 rounded-full bg-slate-100 text-slate-600 text-[13px] font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          data-testid="nt-title"
                          className={inputCls}
                          value={r.title}
                          maxLength={200}
                          autoFocus={r.key === focusKey}
                          placeholder={i === 0 ? 'e.g. Count the stock on shelf B' : 'Next task…  (press Enter to add another)'}
                          onChange={(ev) => patchRow(r.key, { title: ev.target.value })}
                          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (r.title.trim()) addRow(); } }}
                          aria-label={`Task ${i + 1} name`}
                        />
                        {r.custom && (
                          <p data-testid="nt-custom-chip" className="m-0 text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                            Different settings: {e.employeeIds.map((id) => staffById.get(id)?.fullName).filter(Boolean).join(', ') || 'no one chosen'} · {shortDate(e.startDate)} → {shortDate(e.dueDate)} · {e.priority}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                          <button type="button" data-testid="nt-more" onClick={() => patchRow(r.key, { showMore: !r.showMore })} className={linkBtn}><Paperclip className="w-3.5 h-3.5" /> {r.showMore ? 'Hide details' : r.description || r.attachments.length ? `Details & files (${r.attachments.length ? r.attachments.length + ' file' + (r.attachments.length === 1 ? '' : 's') : 'added'})` : 'Add details or a file'}</button>
                          {r.custom
                            ? <button type="button" data-testid="nt-custom-off" onClick={() => patchRow(r.key, { custom: null })} className={linkBtn}>Use the settings from step 1</button>
                            : <button type="button" data-testid="nt-custom-on" onClick={() => patchRow(r.key, { custom: { ...shared } })} className={linkBtn}><CalendarDays className="w-3.5 h-3.5" /> Different person or dates for this task</button>}
                        </div>

                        {r.custom && (
                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                            <WhoWhen staff={staff} v={r.custom} onChange={(p) => patchCustom(r.key, p)} errors={{}} prefix={`nt-c${i}`} />
                          </div>
                        )}

                        {r.showMore && (
                          <div className="space-y-3">
                            <textarea className={inputCls} rows={2} value={r.description} onChange={(ev) => patchRow(r.key, { description: ev.target.value })} placeholder="Instructions the employee should follow (optional)" />
                            <div>
                              <input type="file" accept="image/*,.pdf" disabled={r.uploading} onChange={(ev) => onFile(r.key, ev)} className="text-[14px]" />
                              {r.uploading && <span className="text-[13px] text-slate-500 ml-2">Uploading…</span>}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {r.attachments.map((a, k) => (
                                  <span key={k} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-[13px] font-semibold text-slate-700"><Paperclip className="w-4 h-4" />{a.name}
                                    <button type="button" className="text-slate-400 hover:text-rose-600 cursor-pointer bg-transparent border-0 text-[16px] leading-none" onClick={() => patchRow(r.key, { attachments: r.attachments.filter((_, j) => j !== k) })} aria-label="Remove file">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {r.error && <div data-testid="nt-row-error" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-[13px] font-semibold text-rose-800">{r.error}</div>}
                      </div>
                      <div className="flex items-center shrink-0">
                        <button type="button" data-testid="nt-dup" onClick={() => duplicateRow(r.key)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer bg-transparent border-0" title="Copy this task" aria-label={`Duplicate task ${i + 1}`}><Copy className="w-[18px] h-[18px]" /></button>
                        <button type="button" data-testid="nt-remove" onClick={() => removeRow(r.key)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer bg-transparent border-0" title="Remove this task" aria-label={`Remove task ${i + 1}`}><Trash2 className="w-[18px] h-[18px]" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" data-testid="nt-add" onClick={addRow} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-[15px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-xl cursor-pointer"><Plus className="w-4 h-4" /> Add another task</button>
          </section>
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-slate-100 space-y-3">
          {formError && <div data-testid="nt-error" className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-[15px] font-medium text-rose-800">{formError}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p data-testid="nt-summary" className="m-0 text-[15px] font-semibold text-slate-700">{summary}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onClose} disabled={saving} className="px-5 py-3 text-[15px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer">{notice ? 'Close' : 'Cancel'}</button>
              <button type="button" data-testid="nt-submit-more" onClick={() => submit(null, true)} disabled={saving || rows.some((r) => r.uploading) || !filled.length} title="Save these tasks and keep the same people and dates for the next ones" className="px-5 py-3 text-[15px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Create &amp; add more</button>
              <button type="submit" data-testid="nt-submit" disabled={saving || rows.some((r) => r.uploading) || !filled.length} className="px-6 py-3 text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0">{saving ? 'Saving…' : plan.length > 1 ? `Create ${plan.length} tasks` : 'Create task'}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewTasksModal;
