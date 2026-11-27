import React, { useCallback, useEffect, useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import { FilePreview } from '../components/FilePreview';
import { employeeManagementService } from '../../../../services/employeeService';
import { Badge, Card, Empty, Notice, Spinner, btnDanger, btnGhost, btnPrimary, fmtDate, fmtDateTime, inputCls } from '../../../employee/components/ui';

const STATUSES = ['Pending', 'Approved', 'Rejected', 'ALL'];

const Detail = ({ label, value }) => (
  <div><p className="text-xs text-slate-500 font-semibold m-0 uppercase tracking-wide">{label}</p><p className="text-sm font-semibold text-slate-900 m-0 mt-1 break-words">{value || '—'}</p></div>
);

export const EmployeeRegistrationsPage = ({ onNavigate }) => {
  const { activeBrandId } = useEmployee();
  const [status, setStatus] = useState('Pending');
  const [preview, setPreview] = useState(null); // { files, index } : ID proof shown inside the page
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [view, setView] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(() => {
    setError('');
    return employeeManagementService.listRegistrations({ status, search: q || undefined, page, limit: 15 }).then(setData).catch((e) => setError(e.message));
  }, [status, q, page]);
  useEffect(() => { setData(null); load(); }, [load, activeBrandId]);

  const act = async (fn, ok) => {
    setBusy(true); setError(''); setMsg('');
    try { await fn(); setMsg(ok); setView(null); setReject(null); setReason(''); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <EmployeeHeader activeTabName="registrations" onNavigate={onNavigate} />
      <div className="px-6 pt-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => { setStatus(s); setPage(1); }} className={`px-4 py-2 rounded-full text-xs font-semibold border cursor-pointer ${status === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{s === 'ALL' ? 'All' : s}</button>
            ))}
          </div>
          <input className={`${inputCls} max-w-xs`} placeholder="Search name, email, mobile, ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {error && <Notice type="error">{error}</Notice>}
        {msg && <Notice type="success">{msg}</Notice>}
        {!data && !error && <Spinner />}
        {data && (
          <Card>
            {data.registrations.length === 0 ? <Empty>No {status === 'ALL' ? '' : status.toLowerCase()} registrations.</Empty> : (
              <div className="overflow-x-auto -mx-5 -my-5">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Applicant</th><th className="px-3 py-3 font-semibold">Brand</th><th className="px-3 py-3 font-semibold">Department</th>
                    <th className="px-3 py-3 font-semibold">Applied</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.registrations.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {r.avatar ? <img src={r.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">{r.fullName.charAt(0)}</span>}
                            <div><p className="m-0 font-semibold text-slate-900">{r.fullName}</p><p className="m-0 text-xs text-slate-500">{r.email} · {r.phone}</p></div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{r.brandName}</td>
                        <td className="px-3 py-3 text-slate-700">{r.department}<span className="block text-xs text-slate-400">{r.designation}</span></td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                        <td className="px-3 py-3"><Badge status={r.registrationStatus} /></td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button type="button" className={`${btnGhost} !px-3 !py-1.5 !text-xs`} onClick={() => setView(r)}><Eye className="w-3.5 h-3.5" /> View</button>
                            {r.registrationStatus === 'Pending' && (
                              <>
                                <button data-perm="employees.approve" type="button" className={`${btnPrimary} !px-3 !py-1.5 !text-xs`} disabled={busy} onClick={() => act(() => employeeManagementService.approveRegistration(r._id), `${r.fullName} approved.`)}><Check className="w-3.5 h-3.5" /> Approve</button>
                                <button data-perm="employees.reject" type="button" className={`${btnGhost} !px-3 !py-1.5 !text-xs !text-rose-600`} onClick={() => { setReject(r); setReason(''); }}><X className="w-3.5 h-3.5" /> Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="text-slate-500">Page {data.page} of {data.pages}</span>
            <button type="button" className={btnGhost} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {view && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setView(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                {view.avatar ? <img src={view.avatar} alt="" className="w-14 h-14 rounded-full object-cover" /> : <span className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold flex items-center justify-center">{view.fullName.charAt(0)}</span>}
                <div><h2 className="text-lg font-extrabold text-slate-900 m-0">{view.fullName}</h2><p className="text-xs text-slate-500 m-0">{view.employeeId}</p></div>
              </div>
              <button type="button" onClick={() => setView(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Detail label="Email" value={view.email} /><Detail label="Mobile" value={view.phone} /><Detail label="Gender" value={view.gender} />
              <Detail label="Date of birth" value={view.dateOfBirth && fmtDate(view.dateOfBirth)} /><Detail label="City" value={view.city} /><Detail label="Joining date" value={fmtDate(view.joiningDate)} />
              <Detail label="Brand" value={view.brandName} /><Detail label="Department" value={view.department} /><Detail label="Designation" value={view.designation} />
              <Detail label="Assigned admin" value={view.assignedAdmin?.name} /><Detail label="Applied on" value={fmtDateTime(view.createdAt)} /><Detail label="Status" value={view.registrationStatus} />
              <div className="sm:col-span-3"><Detail label="Address" value={view.address} /></div>
              <div className="sm:col-span-3">
                <p className="text-xs text-slate-500 font-semibold m-0 uppercase tracking-wide">ID proof</p>
                {view.idProof?.documentUrl ? (
                  <button type="button" data-testid="reg-idproof" onClick={() => setPreview({ files: [{ name: view.idProof.type || 'ID proof', url: view.idProof.documentUrl }], index: 0 })} className="text-sm font-bold text-emerald-700 underline mt-1 inline-block bg-transparent border-0 p-0 cursor-pointer">{view.idProof.type || 'ID proof'} — view document</button>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 m-0 mt-1">Not provided</p>
                )}
              </div>
              <div className="sm:col-span-3" data-testid="reg-view-extra">
                <p className="text-xs text-slate-500 font-semibold m-0 uppercase tracking-wide">Additional documents</p>
                {view.additionalDocuments?.length ? (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {view.additionalDocuments.map((d, i) => (
                      <button key={i} type="button" data-testid="reg-extra-doc" onClick={() => setPreview({ files: view.additionalDocuments.map((x) => ({ name: `${x.label || 'Document'} — ${x.name}`, url: x.url })), index: i })} className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-white border border-slate-200 hover:border-emerald-400 rounded-full px-3 py-1 cursor-pointer">
                        {d.label || 'Document'}<span className="font-normal text-slate-400 max-w-[160px] truncate">· {d.name}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm font-semibold text-slate-900 m-0 mt-1">None added</p>}
              </div>
              <div className="sm:col-span-3" data-testid="reg-view-emergency">
                <p className="text-xs text-slate-500 font-semibold m-0 uppercase tracking-wide">Emergency contact</p>
                {view.emergencyContact?.name ? (
                  <p className="text-sm font-semibold text-slate-900 m-0 mt-1 break-words">{view.emergencyContact.name}{view.emergencyContact.relationship ? ` (${view.emergencyContact.relationship})` : ''} · <span className="font-mono">{view.emergencyContact.phone}</span></p>
                ) : <p className="text-sm font-semibold text-slate-900 m-0 mt-1">Not provided</p>}
              </div>
              {view.rejectionReason && <div className="sm:col-span-3"><Detail label="Rejection reason" value={view.rejectionReason} /></div>}
              {view.reviewedBy?.name && <div className="sm:col-span-3"><Detail label="Reviewed by" value={`${view.reviewedBy.name} (${String(view.reviewedBy.role).replace('_', ' ')}) · ${fmtDateTime(view.reviewedBy.at)}`} /></div>}
            </div>
            {view.registrationStatus === 'Pending' && (
              <div className="flex justify-end gap-2 mt-6">
                <button data-perm="employees.reject" type="button" className={btnGhost} onClick={() => { setReject(view); setView(null); setReason(''); }}>Reject</button>
                <button data-perm="employees.approve" type="button" className={btnPrimary} disabled={busy} onClick={() => act(() => employeeManagementService.approveRegistration(view._id), `${view.fullName} approved.`)}>Approve</button>
              </div>
            )}
          </div>
        </div>
      )}

      {reject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setReject(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-slate-900 m-0">Reject {reject.fullName}?</h2>
            <p className="text-sm text-slate-500 mt-1.5 mb-4">The applicant will see this reason when they try to log in.</p>
            <textarea className={inputCls} rows={3} placeholder="Reason for rejection (required)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className={btnGhost} onClick={() => setReject(null)}>Cancel</button>
              <button data-perm="employees.reject" type="button" className={btnDanger} disabled={busy || !reason.trim()} onClick={() => act(() => employeeManagementService.rejectRegistration(reject._id, reason.trim()), `${reject.fullName} rejected.`)}>Reject registration</button>
            </div>
          </div>
        </div>
      )}

      {preview && <FilePreview files={preview.files} index={preview.index} onIndex={(i) => setPreview((q) => ({ ...q, index: i }))} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default EmployeeRegistrationsPage;
