import React, { useMemo, useState } from 'react';
import { Paperclip, Plus, Search, Send, X } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import employeeService from '../../../../services/employeeService';
import { EmployeeHeader } from '../components/EmployeeHeader';

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

const Pill = ({ label, tone }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap ${tone}`}>{label}</span>
);

const labelCls = 'block text-[13px] font-semibold text-slate-700 mb-1.5';
const inputCls =
  'w-full px-4 py-3 text-[15px] bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';

export const EmployeeTasksPage = ({ onNavigate }) => {
  const { tasks, employees, allEmployees, activeBrandId, handleCreateTask, handleUpdateTaskStatus, handleAddComment } = useEmployee();

  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState('');

  // New task form
  const blank = { title: '', description: '', employeeId: '', department: '', priority: 'Medium', dueDate: '', attachments: [] };
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const selected = (tasks || []).find((t) => t._id === selectedId) || null;

  const submitTask = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) return setFormError('Please enter a task name.');
    if (!form.dueDate) return setFormError('Please choose a due date.');
    if (!form.employeeId && !form.department) return setFormError('Choose who this task is for: one employee or a whole department.');

    const person = staff.find((s) => s._id === form.employeeId);
    const brandId =
      activeBrandId && activeBrandId !== 'ALL' ? activeBrandId : person?.brandId || staff.find((s) => s.department === form.department)?.brandId || '';
    if (!brandId) return setFormError('Could not work out the brand for this task. Pick an employee.');

    setSaving(true);
    const res = await handleCreateTask({
      title: form.title.trim(),
      description: form.description,
      brandId,
      priority: form.priority,
      dueDate: form.dueDate,
      assignedEmployeeIds: form.employeeId ? [form.employeeId] : [],
      assignedDepartment: form.department || undefined,
      attachments: form.attachments,
    });
    setSaving(false);
    if (res?.success) {
      setCreateOpen(false);
      setForm(blank);
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setFormError('');
    try {
      const up = await employeeService.uploadTaskFile(f);
      setForm((cur) => ({ ...cur, attachments: [...cur.attachments, up] }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploading(false);
    }
  };

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
          <button type="button" onClick={() => { setForm(blank); setFormError(''); setCreateOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer border-0">
            <Plus className="w-5 h-5" /> New task
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
            {visible.map((t) => {
              const label = statusOf(t);
              return (
                <button key={t._id} type="button" onClick={() => setSelectedId(t._id)} className="w-full text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-400 hover:shadow-sm transition cursor-pointer">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold text-slate-900 m-0 break-words">{t.title}</p>
                      <p className="text-[15px] text-slate-500 mt-1 mb-0">
                        For <strong className="text-slate-700 font-semibold">{t.assignedEmployees?.map((a) => a.name).join(', ') || 'nobody yet'}</strong> · Due{' '}
                        <strong className={`font-semibold ${isOverdue(t) ? 'text-rose-600' : 'text-slate-700'}`}>{fmtDate(t.dueDate)}</strong>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Pill label={`${t.priority} priority`} tone={PRIORITY_TONE[t.priority] || PRIORITY_TONE.Medium} />
                      <Pill label={label} tone={STATUS_TONE[label] || STATUS_TONE['Not started']} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.progressPercent || 0}%` }} /></div>
                    <span className="text-[15px] font-semibold text-slate-600 w-12 text-right">{t.progressPercent || 0}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── New task ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <form onSubmit={submitTask} className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-7 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 m-0">New task</h3>
                <p className="text-[15px] text-slate-500 mt-1 mb-0">The employee is notified straight away.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0" aria-label="Close"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div>
              <label className={labelCls}>What needs to be done? *</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Count the stock on shelf B" autoFocus />
            </div>
            <div>
              <label className={labelCls}>More details</label>
              <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Instructions the employee should follow (optional)" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Give it to *</label>
                <select className={inputCls} value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value, department: e.target.value ? '' : f.department }))}>
                  <option value="">Choose an employee</option>
                  {staff.map((s) => <option key={s._id} value={s._id}>{s.fullName} — {s.designation}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>…or a whole department</label>
                <select className={inputCls} value={form.department} disabled={Boolean(form.employeeId)} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Due date *</label>
                <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>How urgent?</label>
                <select className={inputCls} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Attach a file (optional)</label>
              <input type="file" accept="image/*,.pdf" disabled={uploading} onChange={onFile} className="text-[15px]" />
              {uploading && <span className="text-[13px] text-slate-500 ml-2">Uploading…</span>}
              <div className="flex flex-wrap gap-2 mt-2">
                {form.attachments.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-[13px] font-semibold text-slate-700">
                    <Paperclip className="w-4 h-4" />{a.name}
                    <button type="button" className="text-slate-400 hover:text-rose-600 cursor-pointer bg-transparent border-0 text-[16px] leading-none" onClick={() => setForm((f) => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {formError && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-[15px] font-medium text-rose-800">{formError}</div>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-5 py-3 text-[15px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={saving || uploading} className="px-6 py-3 text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-60 cursor-pointer border-0">{saving ? 'Saving…' : 'Create task'}</button>
            </div>
          </form>
        </div>
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

            <div className="grid sm:grid-cols-3 gap-5 text-[15px]">
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">For</p><p className="font-semibold text-slate-900 mt-1 mb-0">{selected.assignedEmployees?.map((a) => a.name).join(', ') || 'Nobody yet'}</p></div>
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">Due date</p><p className={`font-semibold mt-1 mb-0 ${isOverdue(selected) ? 'text-rose-600' : 'text-slate-900'}`}>{fmtDate(selected.dueDate)}</p></div>
              <div><p className="text-[13px] font-semibold text-slate-500 m-0">Progress</p><p className="font-semibold text-slate-900 mt-1 mb-0">{selected.progressPercent || 0}%</p></div>
            </div>

            {selected.status === 'Submitted for Review' && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-[15px] font-semibold text-violet-900">The employee finished this task and is waiting for you.</p>
                <button type="button" onClick={() => { setSelectedId(null); onNavigate?.('review'); }} className="px-4 py-2.5 text-[15px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl cursor-pointer border-0">Review it</button>
              </div>
            )}

            {selected.attachments?.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-slate-500 m-0 mb-2">Files</p>
                <div className="flex flex-wrap gap-2">
                  {selected.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-[15px] font-semibold text-emerald-700"><Paperclip className="w-4 h-4" />{a.name}</a>
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
