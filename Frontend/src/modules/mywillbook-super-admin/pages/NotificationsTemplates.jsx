import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  Modal,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  fieldClass,
  labelClass,
  btnPrimaryClass,
  btnSecondaryClass,
  btnGhostClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_TEMPLATES } from '../data/mockData';

const emptyForm = {
  name: '',
  category: 'Orders',
  channel: 'SMS',
  subject: '',
  body: '',
  status: 'Draft',
};

const CATEGORIES = ['Orders', 'Finance', 'Delivery', 'Marketing', 'System'];
const CHANNELS = ['SMS', 'Email', 'In-App'];

const NotificationsTemplates = () => {
  const ctx = useMyWillBookSuperAdmin();
  const templates = ctx?.templates ?? INITIAL_TEMPLATES;
  const createTemplate = ctx?.createTemplate;
  const updateTemplate = ctx?.updateTemplate;
  const deleteTemplate = ctx?.deleteTemplate;

  const [category, setCategory] = useState('all');
  const [channel, setChannel] = useState('all');
  const [q, setQ] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesQ =
        !term ||
        t.name.toLowerCase().includes(term) ||
        (t.body || '').toLowerCase().includes(term) ||
        (t.subject || '').toLowerCase().includes(term);
      const matchesCat = category === 'all' || t.category === category;
      const matchesCh = channel === 'all' || t.channel === channel;
      return matchesQ && matchesCat && matchesCh;
    });
  }, [templates, q, category, channel]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({
      name: tpl.name || '',
      category: tpl.category || 'Orders',
      channel: tpl.channel || 'SMS',
      subject: tpl.subject || '',
      body: tpl.body || '',
      status: tpl.status || 'Draft',
    });
    setEditOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.body.trim()) return;
    if (editing) {
      updateTemplate?.(editing.id, form);
      showToast('Template updated (demo)');
    } else {
      createTemplate?.(form);
      showToast('Template created (demo)');
    }
    setEditOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTemplate?.(deleteTarget.id);
    showToast('Template deleted (demo)');
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications & Templates"
        subtitle="Demo templates only — messages are never sent"
        breadcrumbs={['MyWillBook', 'Platform', 'Notifications']}
        actions={
          <button type="button" onClick={openCreate} className={btnPrimaryClass}>
            <Plus size={14} /> New template
          </button>
        }
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
        Demonstration only — editing templates does not send SMS, email, or in-app messages.
      </div>

      {toast && (
        <div className="rounded-xl border border-[#31551C]/30 bg-[#31551C]/10 px-3 py-2 text-xs font-bold text-[#31551C]">
          {toast}
        </div>
      )}

      <FilterBar>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, subject, body…"
          className={`${fieldClass} sm:min-w-[220px] sm:flex-1`}
        />
        <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="all">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No templates match" description="Try another category or channel filter." />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Channel</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className={tdClass}>
                    <span className="font-extrabold text-slate-900">{t.name}</span>
                    {t.subject ? (
                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t.subject}</p>
                    ) : null}
                  </td>
                  <td className={tdClass}>{t.category}</td>
                  <td className={tdClass}>{t.channel}</td>
                  <td className={tdClass}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className={btnGhostClass} onClick={() => setPreview(t)}>
                        <Eye size={14} /> Preview
                      </button>
                      <button type="button" className={btnGhostClass} onClick={() => openEdit(t)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        className={`${btnGhostClass} text-rose-600`}
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? 'Edit template' : 'Create template'}
        wide
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={save} className={btnPrimaryClass}>
              {editing ? 'Save changes' : 'Create template'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
            Demo label — content is stored locally only.
          </p>
          <div>
            <label className={labelClass}>Name</label>
            <input className={fieldClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Category</label>
              <select className={fieldClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Channel</label>
              <select className={fieldClass} value={form.channel} onChange={(e) => set('channel', e.target.value)}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={fieldClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </div>
          </div>
          {(form.channel === 'Email' || form.channel === 'In-App') && (
            <div>
              <label className={labelClass}>Subject</label>
              <input
                className={fieldClass}
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              rows={5}
              className={fieldClass}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Use {{id}}, {{amount}}, {{name}} placeholders…"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `Preview · ${preview.name}` : 'Preview'}
        footer={
          <button type="button" onClick={() => setPreview(null)} className={btnSecondaryClass}>
            Close
          </button>
        }
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={preview.status} />
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600">
                {preview.channel}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700">
                Demo — not sent
              </span>
            </div>
            {preview.subject ? (
              <div>
                <p className={labelClass}>Subject</p>
                <p className="text-sm font-bold text-slate-800">{preview.subject}</p>
              </div>
            ) : null}
            <div>
              <p className={labelClass}>Body</p>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-medium text-slate-700">
                {preview.body}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete template?"
        message={`Remove “${deleteTarget?.name || ''}” from the demo list? This cannot be undone in this session.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
};

export default NotificationsTemplates;
