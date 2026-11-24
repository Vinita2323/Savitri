import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Paperclip, Plus, Search, Send, X } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { NewTasksModal } from '../components/NewTasksModal';
import { FilePreview } from '../components/FilePreview';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

// Plain-language names for the stored task statuses
const STATUS_LABEL = {
  'To Do': 'Not started',
  Assigned: 'Not started',
  Pending: 'Not started',
  Reopened: 'Changes requested',
  'In Progress': 'In progress',
  Blocked: 'Blocked',
  'Submitted for Review': 'Waiting for your review',
  Completed: 'Completed',
  Rejected: 'Rejected',
};

const STATUS_TONE = {
  'Not started': 'bg-slate-100 text-slate-700',
  'Changes requested': 'bg-amber-100 text-amber-800',
  'In progress': 'bg-blue-100 text-blue-800',
  Blocked: 'bg-rose-100 text-rose-800',
  'Waiting for your review': 'bg-violet-100 text-violet-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-rose-100 text-rose-800',
  Overdue: 'bg-rose-100 text-rose-800',
};

const PRIORITY_TONE = {
  Urgent: 'bg-rose-100 text-rose-800',
  High: 'bg-amber-100 text-amber-800',
  Medium: 'bg-blue-100 text-blue-800',
  Low: 'bg-slate-100 text-slate-700',
};

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'PROGRESS', label: 'In progress', statuses: ['In Progress', 'Blocked'] },
  { id: 'DONE', label: 'Completed', statuses: ['Completed'] },
  { id: 'OVERDUE', label: 'Overdue' },
];

const isClosed = (t) => ['Completed', 'Rejected'].includes(t.status);
const isOverdue = (t) => !isClosed(t) && t.dueDate && new Date(t.dueDate) < new Date();
const statusOf = (t) => (isOverdue(t) ? 'Overdue' : STATUS_LABEL[t.status] || t.status);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// "on time" / "2 days late" for a finished task
const lateness = (t) => {
  if (!t.completedAt || !t.dueDate) return '';
  const diff = new Date(t.completedAt) - new Date(t.dueDate);
  if (diff <= 0) return 'on time';
  const days = Math.ceil(diff / 86400000);
  return `${days} day${days === 1 ? '' : 's'} late`;
};

const Pill = ({ label, tone }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap ${tone}`}>{label}</span>
);

const labelCls = 'block text-[13px] font-semibold text-slate-700 mb-1.5';
const inputCls =
  'w-full px-4 py-3 text-[15px] bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

const AVATAR_TONES = ['bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-violet-100 text-violet-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-cyan-100 text-cyan-800'];
const toneFor = (key) => AVATAR_TONES[[...String(key)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

/** Everything one person has been given, in a single card. Click it to open the list of their tasks. */
const PersonGroup = ({ g, open, onToggle, onOpenTask, onGiveAnother }) => {
  const st = g.stats;
  const chips = [
    st.overdue && { n: st.overdue, label: 'overdue', tone: 'bg-rose-100 text-rose-800' },
    st.review && { n: st.review, label: 'to review', tone: 'bg-violet-100 text-violet-800' },
    st.progress && { n: st.progress, label: 'in progress', tone: 'bg-blue-100 text-blue-800' },
    st.notStarted && { n: st.notStarted, label: 'not started', tone: 'bg-slate-100 text-slate-700' },
    st.done && { n: st.done, label: 'completed', tone: 'bg-emerald-100 text-emerald-800' },
    st.rejected && { n: st.rejected, label: 'rejected', tone: 'bg-slate-200 text-slate-700' },
  ].filter(Boolean);
  const pctDone = st.total ? Math.round((st.done / st.total) * 100) : 0;

  return (
    <div data-testid="tg-card" data-person={g.name} className={`bg-white border rounded-2xl overflow-hidden transition ${open ? 'border-emerald-400 shadow-sm' : 'border-slate-200 hover:border-emerald-300'}`}>
      <button type="button" data-testid="tg-toggle" aria-expanded={open} onClick={onToggle} className="w-full text-left p-5 flex items-center gap-4 bg-white hover:bg-slate-50/70 border-0 cursor-pointer">
        <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-[18px] font-extrabold ${toneFor(g.key)}`}>{(g.name || '?').trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-extrabold text-slate-900 m-0 truncate">{g.name}</p>
          <p className="text-[14px] text-slate-500 mt-0.5 mb-0 truncate">{[g.designation, `${st.total} task${st.total === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {chips.map((c) => <span key={c.label} className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12.5px] font-semibold ${c.tone}`}>{c.n} {c.label}</span>)}
          </div>
        </div>
        <div className="hidden sm:block w-44 shrink-0">
          <p className="text-[13px] font-semibold text-slate-600 m-0 mb-1.5 text-right">{st.done} of {st.total} done</p>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctDone}%` }} /></div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div data-testid="tg-tasks" className="border-t border-slate-100 bg-slate-50/50">
          <ul className="m-0 p-0 list-none divide-y divide-slate-100">
            {g.tasks.map((t) => {
              const label = statusOf(t);
              const others = (t.assignedEmployees || []).filter((a) => String(a.employee || a.name) !== g.key).map((a) => a.name);
              return (
                <li key={t._id}>
                  <button type="button" data-testid="tg-task" onClick={() => onOpenTask(t._id)} className="w-full text-left px-5 sm:px-7 py-4 bg-transparent hover:bg-white border-0 cursor-pointer">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[16px] font-bold text-slate-900 m-0 break-words">{t.title}</p>
                        <p className="text-[14px] text-slate-500 mt-1 mb-0">
                          Given <strong className="font-semibold text-slate-700">{fmtDate(t.startDate || t.createdAt)}</strong> · Due{' '}
                          <strong className={`font-semibold ${isOverdue(t) ? 'text-rose-600' : 'text-slate-700'}`}>{fmtDate(t.dueDate)}</strong>
                          {t.completedAt ? <> · Completed <strong className="font-semibold text-emerald-700">{fmtDate(t.completedAt)}</strong> <span className="text-slate-400">({lateness(t)})</span></> : null}
                          {others.length > 0 ? <> · <span className="text-slate-400">Shared with {others.join(', ')}</span></> : null}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill label={`${t.priority} priority`} tone={PRIORITY_TONE[t.priority] || PRIORITY_TONE.Medium} />
                        <Pill label={label} tone={STATUS_TONE[label] || STATUS_TONE['Not started']} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200/70 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.progressPercent || 0}%` }} /></div>
                      <span className="text-[14px] font-semibold text-slate-600 w-11 text-right">{t.progressPercent || 0}%</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {g.employeeId && (
            <div className="px-5 sm:px-7 py-3 border-t border-slate-100 bg-white">
              <button type="button" data-testid="tg-give" onClick={() => onGiveAnother(g.employeeId)} className="inline-flex items-center gap-2 text-[14px] font-bold text-emerald-700 hover:text-emerald-800 bg-transparent border-0 cursor-pointer p-0"><Plus className="w-4 h-4" /> Give {g.name} another task</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const EmployeeTasksPage = ({ onNavigate }) => {
  const { tasks, employees, allEmployees, activeBrandId, handleCreateTasksBulk, handleUpdateTaskStatus, handleAddComment } = useEmployee();

  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState([]); // people to pre-select when the form opens
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState('');
  const [openGroups, setOpenGroups] = useState({}); // person key -> open?
  const [preview, setPreview] = useState(null); // { files, index } : attachment shown inside the page

  // Only real employees from the database
  const staff = useMemo(() => {
    const seen = new Set();
    const list = [];
    [...(employees || []), ...(allEmployees || [])].forEach((e) => {
      if (e?._id && !seen.has(e._id) && ['Active', 'On Leave'].includes(e.employmentStatus)) {
        seen.add(e._id);
        list.push(e);
      }
    });
    return list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [employees, allEmployees]);
  const departments = useMemo(() => [...new Set(staff.map((e) => e.department).filter(Boolean))].sort(), [staff]);

  const inScope = useMemo(
    () => (tasks || []).filter((t) => !activeBrandId || activeBrandId === 'ALL' || t.brandId === activeBrandId),
    [tasks, activeBrandId]
  );

  const counts = useMemo(() => {
    const out = {};
    FILTERS.forEach((f) => {
      out[f.id] = f.id === 'ALL' ? inScope.length : f.id === 'OVERDUE' ? inScope.filter(isOverdue).length : inScope.filter((t) => f.statuses.includes(t.status)).length;
    });
    return out;
  }, [inScope]);

  const reviewCount = useMemo(() => inScope.filter((t) => t.status === 'Submitted for Review').length, [inScope]);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter);
    const q = search.trim().toLowerCase();
    return inScope
      .filter((t) => (filter === 'ALL' ? true : filter === 'OVERDUE' ? isOverdue(t) : f.statuses.includes(t.status)))
      .filter((t) => !q || t.title?.toLowerCase().includes(q) || t.taskId?.toLowerCase().includes(q) || t.assignedEmployees?.some((a) => a.name?.toLowerCase().includes(q)))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [inScope, filter, search]);

  // One entry per person; a task shared by several people appears under each of them
  const groups = useMemo(() => {
    const map = new Map();
    visible.forEach((t) => {
      const people = t.assignedEmployees?.length ? t.assignedEmployees : [{ employee: '', name: 'Not assigned yet' }];
      people.forEach((a) => {
        const key = String(a.employee || a.name || 'none');
        if (!map.has(key)) map.set(key, { key, name: a.name || 'Unknown', designation: a.designation || '', employeeId: a.employee ? String(a.employee) : '', tasks: [] });
        map.get(key).tasks.push(t);
      });
    });
    return [...map.values()]
      .map((g) => {
        // Every task is counted exactly once (an overdue task counts as overdue only), so the chips add up to the total
        const stats = { total: g.tasks.length, overdue: 0, review: 0, progress: 0, done: 0, notStarted: 0, rejected: 0 };
        g.tasks.forEach((t) => {
          if (t.status === 'Completed') stats.done += 1;
          else if (isClosed(t)) stats.rejected += 1;
          else if (isOverdue(t)) stats.overdue += 1;
          else if (t.status === 'Submitted for Review') stats.review += 1;
          else if (['In Progress', 'Blocked'].includes(t.status)) stats.progress += 1;
          else stats.notStarted += 1;
        });
        return { ...g, stats };
      })
      .sort((a, b) => b.stats.overdue - a.stats.overdue || a.name.localeCompare(b.name));
  }, [visible]);
  // A new filter or search starts from the default (a lone person opens by itself, otherwise cards are closed)
  useEffect(() => { setOpenGroups({}); }, [filter, search]);
  const isGroupOpen = (key) => (key in openGroups ? openGroups[key] : groups.length === 1 || Boolean(search.trim()));
  const setAllGroups = (value) => setOpenGroups(Object.fromEntries(groups.map((g) => [g.key, value])));

  const selected = (tasks || []).find((t) => t._id === selectedId) || null;

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !selected) return;
    await handleAddComment(selected._id, comment.trim());
    setComment('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <EmployeeHeader activeTabName="tasks" onNavigate={onNavigate} />

      <div className="px-6 pt-6 space-y-5 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 m-0">Tasks</h2>
            <p className="text-[15px] text-slate-500 mt-1 mb-0">Give work to your team and follow its progress.</p>
          </div>
          <button type="button" onClick={() => { setPrefill([]); setCreateOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer border-0">
            <Plus className="w-5 h-5" /> New tasks
          </button>
        </div>

        {reviewCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4">
            <p className="m-0 text-[15px] font-semibold text-violet-900">{reviewCount} task{reviewCount === 1 ? ' is' : 's are'} waiting for your review.</p>
            <button type="button" onClick={() => onNavigate?.('review')} className="text-[15px] font-bold text-violet-900 underline cursor-pointer bg-transparent border-0">Review now</button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2.5 rounded-full text-[15px] font-semibold border cursor-pointer ${filter === f.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                {f.label} <span className={filter === f.id ? 'text-emerald-100' : 'text-slate-400'}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-60 max-w-md ml-auto">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-12`} placeholder="Search by task or employee name" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
            <p className="text-[16px] font-semibold text-slate-700 m-0">{inScope.length === 0 ? 'No tasks yet' : 'No tasks match this filter'}</p>
            <p className="text-[15px] text-slate-500 mt-1.5 mb-0">{inScope.length === 0 ? 'Click “New task” to give work to an employee.' : 'Try another tab or clear the search.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p data-testid="tg-summary" className="m-0 text-[14px] font-semibold text-slate-500">{groups.length} {groups.length === 1 ? 'person' : 'people'} · {visible.length} task{visible.length === 1 ? '' : 's'}</p>
              {groups.length > 1 && (
                <div className="flex gap-4">
                  <button type="button" data-testid="tg-expand-all" onClick={() => setAllGroups(true)} className="text-[14px] font-semibold text-emerald-700 hover:underline bg-transparent border-0 cursor-pointer p-0">Open all</button>
                  <button type="button" data-testid="tg-collapse-all" onClick={() => setAllGroups(false)} className="text-[14px] font-semibold text-slate-500 hover:underline bg-transparent border-0 cursor-pointer p-0">Close all</button>
                </div>
              )}
            </div>
            {groups.map((g) => (
              <PersonGroup
                key={g.key}
                g={g}
                open={isGroupOpen(g.key)}
                onToggle={() => setOpenGroups((o) => ({ ...o, [g.key]: !isGroupOpen(g.key) }))}
                onOpenTask={setSelectedId}
                onGiveAnother={(id) => { setPrefill([id]); setCreateOpen(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {preview && <FilePreview files={preview.files} index={preview.index} onIndex={(i) => setPreview((p) => ({ ...p, index: i }))} onClose={() => setPreview(null)} />}

      {/* ── New tasks (one or many) ── */}
      {createOpen && (
        <NewTasksModal
          staff={staff}
          initialPeople={prefill}
          activeBrandId={activeBrandId}
          onCreate={handleCreateTasksBulk}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* ── Task details ── */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-7 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-400 m-0">{selected.taskId}</p>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1 mb-0 break-words">{selected.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0" aria-label="Close"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill label={statusOf(selected)} tone={STATUS_TONE[statusOf(selected)] || STATUS_TONE['Not started']} />
              <Pill label={`${selected.priority} priority`} tone={PRIORITY_TONE[selected.priority] || PRIORITY_TONE.Medium} />
            </div>

            {selected.description && <p className="text-[15px] text-slate-700 m-0 whitespace-pre-wrap break-words">{selected.description}</p>}

            <div data-testid="td-dates" className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-[15px]">
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">For</p><p className="font-semibold text-slate-900 mt-1 mb-0">{selected.assignedEmployees?.map((a) => a.name).join(', ') || 'Nobody yet'}</p></div>
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">Task given on</p><p className="font-semibold text-slate-900 mt-1 mb-0">{fmtDate(selected.startDate || selected.createdAt)}</p></div>
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">Complete by</p><p className={`font-semibold mt-1 mb-0 ${isOverdue(selected) ? 'text-rose-600' : 'text-slate-900'}`}>{fmtDate(selected.dueDate)}</p></div>
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">Progress</p><p className="font-semibold text-slate-900 mt-1 mb-0">{selected.progressPercent || 0}%</p></div>
            </div>
            {selected.completedAt && (
              <p data-testid="td-completed" className="m-0 text-[15px] font-semibold text-emerald-700">Completed on {fmtDate(selected.completedAt)} <span className={lateness(selected) === 'on time' ? 'text-emerald-600' : 'text-rose-600'}>({lateness(selected)})</span></p>
            )}

            {selected.status === 'Submitted for Review' && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-[15px] font-semibold text-violet-900">The employee finished this task and is waiting for you.</p>
                <button type="button" onClick={() => { setSelectedId(null); onNavigate?.('review'); }} className="px-4 py-2.5 text-[15px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl cursor-pointer border-0">Review it</button>
              </div>
            )}

            {selected.assignedEmployees?.length > 0 && (
              <div>
                <button
                  type="button"
                  data-testid="td-give-another"
                  onClick={() => { setPrefill(selected.assignedEmployees.map((a) => String(a.employee))); setSelectedId(null); setCreateOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Give {selected.assignedEmployees.length === 1 ? selected.assignedEmployees[0].name : 'these people'} another task
                </button>
              </div>
            )}

            {selected.attachments?.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-slate-500 m-0 mb-2">Files</p>
                <div className="flex flex-wrap gap-2">
                  {selected.attachments.map((a, i) => (
                    <button key={i} type="button" data-testid="td-file" onClick={() => setPreview({ files: selected.attachments, index: i })} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[15px] font-semibold text-emerald-700 border-0 cursor-pointer"><Paperclip className="w-4 h-4" />{a.name}</button>
                  ))}
                </div>
              </div>
            )}

            {!['Submitted for Review'].includes(selected.status) && (
              <div>
                <label className={labelCls}>Change status</label>
                <select className={inputCls} value={selected.status} onChange={(e) => handleUpdateTaskStatus(selected._id, e.target.value, e.target.value === 'Completed' ? 100 : undefined)}>
                  {['Assigned', 'In Progress', 'Blocked', 'Completed', 'Rejected'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  {!['Assigned', 'In Progress', 'Blocked', 'Completed', 'Rejected'].includes(selected.status) && <option value={selected.status}>{STATUS_LABEL[selected.status] || selected.status}</option>}
                </select>
              </div>
            )}

            <div>
              <p className="text-[16px] font-bold text-slate-900 m-0 mb-3">Comments</p>
              <div className="space-y-3">
                {(selected.comments || []).length === 0 && <p className="text-[15px] text-slate-500 m-0">No comments yet.</p>}
                {(selected.comments || []).map((c) => (
                  <div key={c.id} className={`rounded-xl px-4 py-3 ${c.authorRole === 'employee' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <p className="text-[13px] font-semibold text-slate-500 m-0">{c.authorName} · {new Date(c.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[15px] text-slate-800 mt-1 mb-0 whitespace-pre-wrap break-words">{c.text}</p>
                  </div>
                ))}
                <form onSubmit={postComment} className="flex gap-2">
                  <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" maxLength={2000} />
                  <button type="submit" disabled={!comment.trim()} className="inline-flex items-center gap-2 px-5 py-3 text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-60 cursor-pointer border-0"><Send className="w-4 h-4" /> Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasksPage;
