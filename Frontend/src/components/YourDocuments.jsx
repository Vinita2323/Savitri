import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Eye, FileText, Image as ImageIcon, Lock, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import adminDocumentService from '../services/adminDocumentService';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDate = (d) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** expiry badge: expired / within 30 days / fine */
const expiryInfo = (expiry, today) => {
  if (!expiry) return null;
  const days = Math.round((new Date(`${expiry}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
  if (days < 0) return { label: `Expired ${fmtDate(expiry)}`, cls: 'bg-rose-50 text-rose-700 border-rose-200', state: 'expired' };
  if (days <= 30) return { label: `Expires in ${days} day${days === 1 ? '' : 's'}`, cls: 'bg-amber-50 text-amber-800 border-amber-200', state: 'soon' };
  return { label: `Valid till ${fmtDate(expiry)}`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', state: 'ok' };
};

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

const Modal = ({ title, onClose, children, wide, testId }) => {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-slate-900/50" role="dialog" aria-label={title} data-testid={testId}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <p className="m-0 text-base font-bold text-slate-900">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" data-testid="yd-modal-close" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 border-0 bg-transparent cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

/** Add or edit one document. Editing can also replace the file. */
const DocForm = ({ meta, existing, onClose, onSaved }) => {
  const [f, setF] = useState({ title: existing?.title || '', category: existing?.category || meta.categories[0] || 'Identity proof', documentNumber: existing?.documentNumber || '', expiryDate: existing?.expiryDate || '', notes: existing?.notes || '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const input = useRef(null);

  const pick = (e) => {
    const x = e.target.files?.[0];
    if (!x) return;
    if (!ALLOWED.includes(x.type)) { setError('Only PDF, JPG, PNG or WEBP files are accepted.'); e.target.value = ''; setFile(null); return; }
    if (x.size > MAX) { setError('The file is larger than 5 MB.'); e.target.value = ''; setFile(null); return; }
    setError(''); setFile(x);
    if (!f.title) setF((p) => ({ ...p, title: x.name.replace(/\.[^.]+$/, '').slice(0, 120) }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.title.trim()) { setError('Give the document a title (for example "Passport").'); return; }
    if (!existing && !file) { setError('Choose a file to upload.'); return; }
    setBusy(true);
    try {
      if (existing) await adminDocumentService.update(existing.id, f, file, setPct);
      else await adminDocumentService.create(f, file, setPct);
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={existing ? 'Edit document' : 'Add a document'} onClose={onClose} testId="yd-form">
      <form onSubmit={save} className="space-y-3.5 text-sm">
        <label className="block text-xs font-semibold text-slate-600">Title *
          <input data-testid="yd-title" className={`${inputCls} mt-1`} value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Passport" />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600">Type
            <select data-testid="yd-category" className={`${inputCls} mt-1`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{meta.categories.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Document number (optional)
            <input data-testid="yd-number" className={`${inputCls} mt-1`} value={f.documentNumber} maxLength={60} onChange={(e) => setF({ ...f, documentNumber: e.target.value })} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Expiry date (optional)
            <input data-testid="yd-expiry" type="date" className={`${inputCls} mt-1`} value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} />
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Notes (optional)
          <textarea data-testid="yd-notes" rows={2} maxLength={500} className={`${inputCls} mt-1`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. Original is in the office locker" />
        </label>
        <div>
          <p className="m-0 text-xs font-semibold text-slate-600 mb-1">{existing ? 'Replace the file (optional)' : 'File *'}</p>
          <input ref={input} data-testid="yd-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={pick} className="text-xs" />
          <p className="m-0 mt-1 text-[11px] text-slate-400">PDF, JPG, PNG or WEBP, up to 5 MB.{existing && ` Current file: ${existing.fileName} (${fmtSize(existing.size)}).`}</p>
        </div>
        {error && <p role="alert" data-testid="yd-error" className="m-0 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</p>}
        {busy && <div className="h-1.5 bg-slate-100 rounded"><div className="h-1.5 bg-emerald-600 rounded" style={{ width: `${pct}%` }} /></div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 border-0 bg-transparent cursor-pointer">Cancel</button>
          <button type="submit" data-testid="yd-save" disabled={busy} className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer disabled:opacity-60">{busy ? 'Saving…' : existing ? 'Save changes' : 'Upload document'}</button>
        </div>
      </form>
    </Modal>
  );
};

/** Shows the file from a temporary in-memory URL. */
const Preview = ({ doc, onClose }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let made = '';
    adminDocumentService.blob(doc.id).then((b) => { made = URL.createObjectURL(b); setUrl(made); }).catch((e) => setError(e.message));
    return () => { if (made) URL.revokeObjectURL(made); };
  }, [doc.id]);
  return (
    <Modal title={doc.title} onClose={onClose} wide testId="yd-preview">
      {error && <p className="m-0 text-sm text-rose-700" data-testid="yd-preview-error">{error}</p>}
      {!url && !error && <p className="m-0 text-sm text-slate-500">Opening…</p>}
      {url && (doc.mime === 'application/pdf'
        ? <iframe title={doc.title} data-testid="yd-pdf" src={url} className="w-full h-[70vh] rounded-xl border border-slate-200" />
        : <img data-testid="yd-image" src={url} alt={doc.title} className="max-w-full max-h-[70vh] mx-auto rounded-xl" />)}
    </Modal>
  );
};

/**
 * `categories` limits the page to some document types (a sidebar page such as "Identity Documents"); without it every document is shown.
 * Each type page lists only its own documents and adds new ones in that type.
 */
export default function YourDocuments({ categories = null, title = 'Your Documents', subtitle = '' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // {existing?}
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => adminDocumentService.list().then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const download = async (doc) => {
    setError('');
    try {
      const b = await adminDocumentService.blob(doc.id, true);
      const url = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = url; a.download = doc.fileName || 'document'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { setError(e.message); }
  };
  const confirmDelete = async () => {
    try { await adminDocumentService.remove(del.id); setDel(null); setMsg('Document deleted.'); load(); } catch (e) { setError(e.message); setDel(null); }
  };
  const allDocs = data?.documents || [];
  const docs = categories ? allDocs.filter((d) => categories.includes(d.category)) : allDocs;
  const flagged = docs.filter((d) => ['expired', 'soon'].includes(expiryInfo(d.expiryDate, data.today)?.state));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" data-testid="your-documents">
      <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#243D12] flex items-center justify-center text-white"><FileText size={20} /></div>
          <div>
            <h3 className="text-base font-bold text-slate-800 m-0">{title}</h3>
            <p className="text-xs text-slate-500 m-0 flex items-center gap-1"><Lock size={11} /> {subtitle || 'Private: only you can see these. Keep your important papers here for emergencies.'}</p>
          </div>
        </div>
        <button type="button" data-testid="yd-add" onClick={() => { setMsg(''); setForm({}); }} disabled={data && allDocs.length >= data.max} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer disabled:opacity-50"><Plus size={16} /> Add document</button>
      </div>
      <div className="p-6 space-y-4">
        {error && <p role="alert" data-testid="yd-list-error" className="m-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</p>}
        {msg && <p className="m-0 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold" data-testid="yd-msg">{msg}</p>}
        {flagged.length > 0 && <p className="m-0 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2" data-testid="yd-expiry-warning"><AlertTriangle size={14} /> {flagged.length} document{flagged.length > 1 ? 's are' : ' is'} expired or expiring within 30 days.</p>}
        {!data && !error && <p className="m-0 text-sm text-slate-500">Loading…</p>}
        {data && docs.length === 0 && (
          <div className="text-center py-10" data-testid="yd-empty">
            <Upload className="w-8 h-8 mx-auto text-slate-300" />
            <p className="m-0 mt-2 text-sm font-semibold text-slate-700">No documents yet</p>
            <p className="m-0 text-xs text-slate-500">Add your ID proof, passport, insurance or any paper you may need in an emergency.</p>
          </div>
        )}
        {docs.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3" data-testid="yd-list">
            {docs.map((d) => {
              const ex = expiryInfo(d.expiryDate, data.today);
              return (
                <div key={d.id} data-testid="yd-item" data-title={d.title} className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">{d.mime === 'application/pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-bold text-slate-900 truncate" data-testid="yd-item-title">{d.title}</p>
                      <p className="m-0 text-xs text-slate-500">{d.category}{d.documentNumber ? ` · ${d.documentNumber}` : ''}</p>
                    </div>
                  </div>
                  {ex && <span data-testid="yd-expiry-badge" data-state={ex.state} className={`self-start px-2 py-0.5 rounded-full text-[11px] font-bold border ${ex.cls}`}>{ex.label}</span>}
                  {d.notes && <p className="m-0 text-xs text-slate-500">{d.notes}</p>}
                  <p className="m-0 text-[11px] text-slate-400">{d.fileName} · {fmtSize(d.size)} · added {fmtDate(d.uploadedAt)}</p>
                  <div className="flex gap-1.5 mt-1">
                    <button type="button" data-testid="yd-view" onClick={() => setView(d)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 cursor-pointer inline-flex items-center gap-1"><Eye size={13} /> View</button>
                    <button type="button" data-testid="yd-download" onClick={() => download(d)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 cursor-pointer inline-flex items-center gap-1"><Download size={13} /> Download</button>
                    <button type="button" data-testid="yd-edit" onClick={() => { setMsg(''); setForm({ existing: d }); }} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 cursor-pointer inline-flex items-center gap-1"><Pencil size={13} /> Edit</button>
                    <button type="button" data-testid="yd-delete" onClick={() => setDel(d)} className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-bold border border-rose-200 bg-white text-rose-700 cursor-pointer inline-flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {data && <p className="m-0 text-[11px] text-slate-400">{categories ? `${docs.length} here · ` : ''}{allDocs.length} of {data.max} documents used.</p>}
      </div>
      {form && data && <DocForm meta={categories ? { ...data, categories } : data} existing={form.existing} onClose={() => setForm(null)} onSaved={() => { setForm(null); setMsg(form.existing ? 'Document updated.' : 'Document saved.'); load(); }} />}
      {view && <Preview doc={view} onClose={() => setView(null)} />}
      {del && (
        <Modal title="Delete this document?" onClose={() => setDel(null)} testId="yd-confirm">
          <p className="m-0 text-sm text-slate-600">“{del.title}” and its file will be permanently deleted. This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setDel(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 border-0 bg-transparent cursor-pointer">Keep it</button>
            <button type="button" data-testid="yd-confirm-delete" onClick={confirmDelete} className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white border-0 cursor-pointer">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
