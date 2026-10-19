import React, { useState } from 'react';
import { Eye, Pencil, Upload } from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  Modal,
  ConfirmDialog,
  fieldClass,
  labelClass,
  btnPrimaryClass,
  btnSecondaryClass,
  btnGhostClass,
  btnGreenClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_POLICIES } from '../data/mockData';

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const TermsPolicies = () => {
  const ctx = useMyWillBookSuperAdmin();
  const policies = ctx?.policies ?? INITIAL_POLICIES;
  const updatePolicy = ctx?.updatePolicy;
  const publishPolicy = ctx?.publishPolicy;

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ body: '', version: '', status: 'Draft' });
  const [preview, setPreview] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const openEdit = (policy) => {
    setEditing(policy);
    setForm({
      body: policy.body || '',
      version: policy.version || '1.0',
      status: policy.status || 'Draft',
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updatePolicy?.(editing.id, {
      body: form.body,
      version: form.version,
      status: form.status,
    });
    setEditing(null);
    showToast('Policy saved (demo)');
  };

  const confirmPublish = () => {
    if (!publishTarget) return;
    publishPolicy?.(publishTarget.id);
    showToast(`Published “${publishTarget.name}” (demo)`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Terms & Policies"
        subtitle="Legal copy drafts for the demo platform"
        breadcrumbs={['MyWillBook', 'Platform', 'Policies']}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
        Demo-only disclaimer — these documents are illustrative and are not live legal terms.
      </div>

      {toast && (
        <div className="rounded-xl border border-[#31551C]/30 bg-[#31551C]/10 px-3 py-2 text-xs font-bold text-[#31551C]">
          {toast}
        </div>
      )}

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Policy</th>
              <th className={thClass}>Version</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Updated</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td className={tdClass}>
                  <span className="font-extrabold text-slate-900">{p.name}</span>
                </td>
                <td className={tdClass}>v{p.version}</td>
                <td className={tdClass}>
                  <StatusBadge status={p.status} />
                </td>
                <td className={tdClass}>{formatDate(p.updatedAt)}</td>
                <td className={tdClass}>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className={btnGhostClass} onClick={() => setPreview(p)}>
                      <Eye size={14} /> Preview
                    </button>
                    <button type="button" className={btnGhostClass} onClick={() => openEdit(p)}>
                      <Pencil size={14} /> Edit
                    </button>
                    {p.status !== 'Published' && (
                      <button
                        type="button"
                        className={btnGreenClass}
                        onClick={() => setPublishTarget(p)}
                      >
                        <Upload size={14} /> Publish
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit · ${editing.name}` : 'Edit policy'}
        wide
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={saveEdit} className={btnPrimaryClass}>
              Save draft
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Version</label>
                <input
                  className={fieldClass}
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={fieldClass}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Body</label>
              <textarea
                rows={10}
                className={fieldClass}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? preview.name : 'Preview'}
        wide
        footer={
          <button type="button" onClick={() => setPreview(null)} className={btnSecondaryClass}>
            Close
          </button>
        }
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={preview.status} />
              <span className="text-xs font-bold text-slate-500">v{preview.version}</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700">
                Demo document
              </span>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-700">
              {preview.body}
            </pre>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={confirmPublish}
        title="Publish policy?"
        message={`Mark “${publishTarget?.name || ''}” as Published in this demo. No live users are notified.`}
        confirmLabel="Publish"
      />
    </div>
  );
};

export default TermsPolicies;
