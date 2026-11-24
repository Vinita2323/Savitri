import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip, Play, Send, Upload } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Badge, Card, Field, Notice, Spinner, btnGhost, btnPrimary, fmtDate, fmtDateTime, inputCls, todayIST } from '../components/ui';

const apiBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
const fileHref = (url) => (url?.startsWith('/uploads/') ? `${apiBase() || `${window.location.protocol}//${window.location.hostname}:5000`}${url}` : url);

export default function PortalTaskDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [ext, setExt] = useState({ open: false, date: '', reason: '' });
  const fileRef = useRef(null);

  const load = useCallback(
    () =>
      employeePortalService.task(id).then((d) => {
        setData(d);
        setProgress(d.task.progressPercent || 0);
      }).catch((e) => setError(e.message)),
    [id]
  );
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await fn();
      if (ok) setMsg(ok);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const list = [...(e.target.files || [])];
    e.target.value = '';
    if (!list.length) return;
    setUploading(true);
    setError('');
    try {
      for (const f of list) {
        const r = await employeePortalService.uploadDocument(f);
        setFiles((cur) => [...cur, { name: r.name || f.name, url: r.url }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (error && !data) return <div className="space-y-4"><Link to="/employee/tasks" className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</Link><Notice type="error">{error}</Notice></div>;
  if (!data) return <Spinner />;

  const { task, submissions } = data;
  const canStart = ['To Do', 'Assigned', 'Pending', 'Reopened'].includes(task.status);
  const inProgress = task.status === 'In Progress';
  const closed = ['Completed', 'Rejected'].includes(task.status);
  const pendingExt = task.extensionRequests?.some((r) => r.status === 'Pending');

  return (
    <div className="space-y-5">
      <Link to="/employee/tasks" className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-1 no-underline"><ArrowLeft className="w-4 h-4" /> My tasks</Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 m-0">{task.taskId} · {task.category}</p>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1 mb-0 break-words">{task.title}</h1>
          </div>
          <div className="flex gap-2 flex-wrap"><Badge status={task.priority} /><Badge status={task.isOverdue ? 'Overdue' : task.status} /></div>
        </div>
        {task.description && <p className="text-sm text-slate-700 mt-4 mb-0 whitespace-pre-wrap break-words">{task.description}</p>}
        <div className="grid sm:grid-cols-3 gap-4 mt-5 text-sm">
          <div><p className="text-xs text-slate-500 font-semibold m-0">START</p><p className="m-0 mt-1 font-semibold text-slate-800">{fmtDate(task.startDate)}</p></div>
          <div><p className="text-xs text-slate-500 font-semibold m-0">DEADLINE</p><p className={`m-0 mt-1 font-semibold ${task.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>{fmtDate(task.dueDate)}</p></div>
          <div><p className="text-xs text-slate-500 font-semibold m-0">ASSIGNED BY</p><p className="m-0 mt-1 font-semibold text-slate-800">{task.createdBy?.name || 'Admin'}</p></div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${task.progressPercent || 0}%` }} /></div>
          <span className="text-sm font-bold text-slate-700">{task.progressPercent || 0}%</span>
        </div>
        {task.reviewNotes && ['Reopened', 'Rejected', 'Completed'].includes(task.status) && (
          <div className="mt-4"><Notice type={task.status === 'Completed' ? 'success' : 'warn'}><strong>Reviewer notes:</strong> {task.reviewNotes}</Notice></div>
        )}
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {msg && <Notice type="success">{msg}</Notice>}

      {!closed && (
        <Card title="Work on this task">
          <div className="space-y-5">
            {canStart && (
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => run(() => employeePortalService.startTask(id), 'Task started.')}>
                <Play className="w-4 h-4" /> {task.status === 'Reopened' ? 'Resume work' : 'Start task'}
              </button>
            )}
            {task.status === 'Submitted for Review' && <Notice type="info">Submitted for review. You will be notified when it is approved or if changes are requested.</Notice>}

            {inProgress && (
              <>
                <Field label={`Progress: ${progress}%`}>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="99" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 accent-emerald-600" />
                    <button type="button" className={btnGhost} disabled={busy || progress === task.progressPercent} onClick={() => run(() => employeePortalService.setProgress(id, progress), 'Progress saved.')}>Save</button>
                  </div>
                </Field>
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <p className="text-sm font-bold text-slate-800 m-0">Finished? Submit for review</p>
                  <textarea className={inputCls} rows={3} placeholder="Describe what you did (optional)" value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} />
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={onFile} />
                    <button type="button" className={btnGhost} disabled={uploading} onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Attach documents'}</button>
                    {files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 rounded-full px-3 py-1.5"><Paperclip className="w-3 h-3" />{f.name}<button type="button" className="text-slate-400 hover:text-rose-600 cursor-pointer bg-transparent border-0" onClick={() => setFiles((c) => c.filter((_, j) => j !== i))}>×</button></span>
                    ))}
                  </div>
                  <button type="button" className={btnPrimary} disabled={busy || uploading} onClick={() => run(async () => { await employeePortalService.submitTask(id, { notes: submitNotes, attachments: files }); setFiles([]); setSubmitNotes(''); }, 'Submitted for review.')}>
                    <Send className="w-4 h-4" /> Submit for review
                  </button>
                </div>
              </>
            )}

            {!pendingExt && (
              <div className="border-t border-slate-100 pt-5">
                {!ext.open ? (
                  <button type="button" className="text-sm font-semibold text-slate-600 underline cursor-pointer bg-transparent border-0 p-0" onClick={() => setExt({ open: true, date: '', reason: '' })}>Request a deadline extension</button>
                ) : (
                  <div className="space-y-3 max-w-md">
                    <Field label="New deadline"><input type="date" className={inputCls} min={todayIST()} value={ext.date} onChange={(e) => setExt((x) => ({ ...x, date: e.target.value }))} /></Field>
                    <Field label="Reason"><textarea className={inputCls} rows={2} value={ext.reason} onChange={(e) => setExt((x) => ({ ...x, reason: e.target.value }))} /></Field>
                    <div className="flex gap-2">
                      <button type="button" className={btnPrimary} disabled={busy || !ext.date || !ext.reason.trim()} onClick={() => run(async () => { await employeePortalService.requestExtension(id, { requestedDueDate: ext.date, reason: ext.reason }); setExt({ open: false, date: '', reason: '' }); }, 'Extension requested.')}>Send request</button>
                      <button type="button" className={btnGhost} onClick={() => setExt({ open: false, date: '', reason: '' })}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {task.extensionRequests?.length > 0 && (
        <Card title="Extension requests">
          <ul className="list-none p-0 m-0 divide-y divide-slate-100">
            {task.extensionRequests.map((r) => (
              <li key={r._id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-700">Until {fmtDate(r.requestedDueDate)} — {r.reason}</span><Badge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(task.attachments?.length > 0 || submissions.some((s) => s.attachments?.length)) && (
        <Card title="Documents">
          <ul className="list-none p-0 m-0 space-y-2 text-sm">
            {task.attachments?.map((a, i) => <li key={`t${i}`}><a className="text-emerald-700 font-semibold inline-flex items-center gap-1.5" href={fileHref(a.url)} target="_blank" rel="noreferrer"><Paperclip className="w-3.5 h-3.5" />{a.name}</a> <span className="text-slate-400">(from admin)</span></li>)}
            {submissions.flatMap((s) => s.attachments || []).map((a, i) => <li key={`s${i}`}><a className="text-emerald-700 font-semibold inline-flex items-center gap-1.5" href={fileHref(a.url)} target="_blank" rel="noreferrer"><Paperclip className="w-3.5 h-3.5" />{a.name}</a> <span className="text-slate-400">(yours)</span></li>)}
          </ul>
        </Card>
      )}

      {submissions.length > 0 && (
        <Card title="Submission history">
          <ul className="list-none p-0 m-0 divide-y divide-slate-100">
            {submissions.map((s) => (
              <li key={s._id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-slate-500">{fmtDateTime(s.submittedAt)}</span><Badge tone={s.status === 'Approved' ? 'green' : s.status === 'Pending' ? 'amber' : 'red'}>{s.status}</Badge></div>
                {s.notes && <p className="m-0 mt-1.5 text-slate-700 break-words">{s.notes}</p>}
                {s.reviewNotes && <p className="m-0 mt-1 text-slate-500 break-words"><em>Reviewer: {s.reviewNotes}</em></p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Comments">
        <div className="space-y-3">
          {task.comments?.length === 0 && <p className="text-sm text-slate-500 m-0">No comments yet.</p>}
          {task.comments?.map((c) => (
            <div key={c.id} className={`rounded-xl px-4 py-3 text-sm ${c.authorRole === 'employee' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <p className="m-0 text-xs font-semibold text-slate-500">{c.authorName} <span className="font-normal">· {fmtDateTime(c.createdAt)}</span></p>
              <p className="m-0 mt-1 text-slate-800 whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) run(async () => { await employeePortalService.comment(id, comment.trim()); setComment(''); }); }}>
            <input className={inputCls} placeholder="Write a comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
            <button type="submit" className={btnPrimary} disabled={busy || !comment.trim()}>Post</button>
          </form>
        </div>
      </Card>
    </div>
  );
}
