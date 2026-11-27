import React, { useCallback, useEffect, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { FilePreview } from '../components/FilePreview';
import employeeService, { employeeManagementService } from '../../../../services/employeeService';
import { Badge, Card, Empty, Notice, Spinner, btnDanger, btnGhost, btnPrimary, fmtDate, fmtDateTime, inputCls } from '../../../employee/components/ui';

const TABS = [
  { id: 'review', label: 'Awaiting review' },
  { id: 'extensions', label: 'Extension requests' },
  { id: 'overdue', label: 'Overdue' },
];

export const EmployeeTaskReviewPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const [tab, setTab] = useState('review');
  const [tasks, setTasks] = useState(null);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState(null); // { task, decision }
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null); // { files, index } : attachment shown inside the page

  const load = useCallback(async () => {
    setError('');
    try {
      if (tab === 'review') {
        const [t, s] = await Promise.all([employeeService.getTasks({ status: 'Submitted for Review', limit: 100 }), employeeManagementService.listSubmissions({ status: 'Pending' })]);
        setTasks(t.tasks); setSubs(s.submissions);
      } else if (tab === 'overdue') {
        const t = await employeeService.getTasks({ status: 'Overdue', limit: 100 });
        setTasks(t.tasks);
      } else {
        const t = await employeeService.getTasks({ limit: 200 });
        setTasks(t.tasks.filter((x) => x.extensionRequests?.some((r) => r.status === 'Pending')));
      }
    } catch (e) { setError(e.message); }
  }, [tab]);
  useEffect(() => { setTasks(null); load(); }, [load, activeBrandId]);

  const run = async (fn, ok) => {
    setBusy(true); setError(''); setMsg('');
    try { await fn(); setMsg(ok); setDlg(null); setNotes(''); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const subFor = (taskId) => subs.find((s) => String(s.task) === String(taskId));

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="review" onNavigate={onNavigate} />
      <div className="px-6 pt-6 space-y-5">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-full text-[14px] font-bold border cursor-pointer ${tab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t.label}</button>
          ))}
        </div>
        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        {!tasks && !error && <Spinner />}
        {tasks && (tasks.length === 0 ? <Card><Empty>Nothing here right now.</Empty></Card> : (
          <div className="grid gap-4">
            {tasks.map((t) => {
              const sub = subFor(t._id);
              return (
                <Card key={t._id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-400 m-0">{t.taskId} · {t.brandName}</p>
                      <h3 className="text-[17px] font-bold text-slate-900 mt-1 mb-0 break-words">{t.title}</h3>
                      <p className="text-[14px] text-slate-500 mt-1 mb-0">Assigned to {t.assignedEmployees.map((a) => a.name).join(', ') || '—'} · due {fmtDate(t.dueDate)}</p>
                    </div>
                    <div className="flex gap-2"><Badge status={t.priority} /><Badge status={t.isOverdue ? 'Overdue' : t.status} /></div>
                  </div>

                  {tab === 'review' && (
                    <div className="mt-4 bg-slate-50 rounded-xl p-4 text-[15px]">
                      <p className="m-0 text-[14px] font-bold text-slate-500">SUBMISSION {sub && `· ${fmtDateTime(sub.submittedAt)} · ${sub.employeeName}`}</p>
                      <p className="m-0 mt-1.5 text-slate-800 whitespace-pre-wrap break-words">{sub?.notes || t.completionNotes || 'No notes provided.'}</p>
                      {sub?.attachments?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{sub.attachments.map((a, i) => <button key={i} type="button" data-testid="rv-file" onClick={() => setPreview({ files: sub.attachments, index: i })} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-emerald-700 bg-white border border-slate-200 hover:border-emerald-400 rounded-full px-3 py-1 cursor-pointer"><Paperclip className="w-3 h-3" />{a.name}</button>)}</div>}
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button data-perm="tasks.approve" type="button" className={btnPrimary} onClick={() => { setDlg({ task: t, decision: 'approve' }); setNotes(''); }}>Approve</button>
                        <button type="button" className={btnGhost} onClick={() => { setDlg({ task: t, decision: 'changes' }); setNotes(''); }}>Request changes</button>
                        <button data-perm="tasks.approve" type="button" className={`${btnGhost} !text-rose-600`} onClick={() => { setDlg({ task: t, decision: 'reject' }); setNotes(''); }}>Reject</button>
                      </div>
                    </div>
                  )}

                  {tab === 'extensions' && t.extensionRequests.filter((r) => r.status === 'Pending').map((r) => (
                    <div key={r._id} className="mt-4 bg-slate-50 rounded-xl p-4 text-[15px]">
                      <p className="m-0 text-slate-800"><strong>{r.requestedByName}</strong> asks to extend the deadline to <strong>{fmtDate(r.requestedDueDate)}</strong></p>
                      <p className="m-0 mt-1 text-slate-600 break-words">"{r.reason}"</p>
                      <div className="flex gap-2 mt-3">
                        <button data-perm="tasks.approve" type="button" className={btnPrimary} disabled={busy} onClick={() => run(() => employeeManagementService.decideExtension(t._id, r._id, 'approve'), 'Extension approved.')}>Approve</button>
                        <button data-perm="tasks.approve" type="button" className={btnGhost} disabled={busy} onClick={() => run(() => employeeManagementService.decideExtension(t._id, r._id, 'reject'), 'Extension rejected.')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {preview && <FilePreview files={preview.files} index={preview.index} onIndex={(i) => setPreview((p) => ({ ...p, index: i }))} onClose={() => setPreview(null)} />}

      {dlg && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setDlg(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-slate-900 m-0">{dlg.decision === 'approve' ? 'Approve task' : dlg.decision === 'changes' ? 'Request changes' : 'Reject task'}</h2>
            <p className="text-[15px] text-slate-500 mt-1.5 mb-4 break-words">{dlg.task.title}</p>
            <textarea className={inputCls} rows={3} placeholder={dlg.decision === 'approve' ? 'Optional note for the employee' : 'Explain the decision (required)'} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className={btnGhost} onClick={() => setDlg(null)}>Cancel</button>
              <button data-perm="tasks.approve" type="button" className={dlg.decision === 'reject' ? btnDanger : btnPrimary} disabled={busy || (dlg.decision !== 'approve' && !notes.trim())} onClick={() => run(() => employeeManagementService.reviewTask(dlg.task._id, dlg.decision, notes.trim()), 'Review saved.')}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTaskReviewPage;
