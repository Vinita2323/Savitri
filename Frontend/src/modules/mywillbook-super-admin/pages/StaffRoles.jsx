import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import {
  PageHeader,
  Modal,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  btnPrimaryClass,
  btnSecondaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
  fieldClass,
  labelClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_ROLES, ALL_PERMISSIONS } from '../data/mockData';

const emptyForm = {
  name: '',
  permissions: [],
};

const StaffRoles = () => {
  const ctx = useMyWillBookSuperAdmin();
  const [localRoles, setLocalRoles] = useState(INITIAL_ROLES);

  const roles = ctx?.roles ?? localRoles;
  const allPermissions = ctx?.allPermissions ?? ALL_PERMISSIONS;

  const createRole =
    ctx?.createRole ||
    ((payload) => {
      const next = { id: `role_${Date.now()}`, permissions: [], isSystem: false, ...payload };
      setLocalRoles((prev) => [next, ...prev]);
      return next;
    });

  const updateRole =
    ctx?.updateRole ||
    ((id, patch) => {
      setLocalRoles((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (r.isSystem && patch.permissions) {
            return { ...r, ...patch, permissions: r.permissions };
          }
          return { ...r, ...patch };
        })
      );
    });

  const deleteRole =
    ctx?.deleteRole ||
    ((id) => {
      setLocalRoles((prev) => prev.filter((r) => r.id !== id || r.isSystem));
    });

  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return roles.filter(
      (r) =>
        !term ||
        r.name.toLowerCase().includes(term) ||
        (r.permissions || []).some((p) => p.toLowerCase().includes(term))
    );
  }, [roles, q]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setForm({
      name: role.name || '',
      permissions: [...(role.permissions || [])],
    });
    setModalOpen(true);
  };

  const togglePermission = (perm) => {
    if (editing?.isSystem) return;
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const toggleAll = (checked) => {
    if (editing?.isSystem) return;
    setForm((f) => ({ ...f, permissions: checked ? [...allPermissions] : [] }));
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    if (editing) {
      if (editing.isSystem) {
        updateRole(editing.id, { name: form.name.trim() });
      } else {
        updateRole(editing.id, {
          name: form.name.trim(),
          permissions: form.permissions,
        });
      }
    } else {
      createRole({
        name: form.name.trim(),
        permissions: form.permissions,
        isSystem: false,
      });
    }
    setModalOpen(false);
  };

  const cancelForm = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff Roles"
        subtitle="Define roles and permission matrices (demo — example roles included)"
        breadcrumbs={['MyWillBook', 'Access', 'Staff Roles']}
        actions={
          <button type="button" onClick={openAdd} className={btnPrimaryClass}>
            <Plus size={14} /> Add Role
          </button>
        }
      />

      <FilterBar>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roles or permissions…"
          className={`${fieldClass} sm:min-w-[240px] sm:flex-1`}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No roles found." description="Demo empty state — create a custom role." />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Role</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Permissions</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-[#31551C]" />
                      <span className="font-extrabold text-slate-900">{r.name}</span>
                    </div>
                  </td>
                  <td className={tdClass}>
                    {r.isSystem ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600">
                        System
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <span className="font-bold text-slate-800">
                      {(r.permissions || []).length} / {allPermissions.length}
                    </span>
                    <p className="mt-1 max-w-xs truncate text-[10px] font-medium text-slate-400">
                      {(r.permissions || []).join(', ') || 'None'}
                    </p>
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => openEdit(r)} className={btnSecondaryClass}>
                        <Pencil size={12} /> Edit
                      </button>
                      {!r.isSystem && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(r)}
                          className={btnSecondaryClass}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={cancelForm}
        title={editing ? 'Edit Role' : 'Create Role'}
        wide
        footer={
          <>
            <button type="button" onClick={cancelForm} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={saveForm} className={btnPrimaryClass}>
              {editing ? 'Save changes' : 'Create role'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Role name</label>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!!editing?.isSystem}
            />
            {editing?.isSystem ? (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                System role name &amp; permissions are locked in this demo.
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className={labelClass}>Permission matrix</label>
              {!editing?.isSystem && (
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <input
                    type="checkbox"
                    className="accent-[#FF9418]"
                    checked={form.permissions.length === allPermissions.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  Select all
                </label>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {allPermissions.map((perm) => {
                const checked = form.permissions.includes(perm);
                return (
                  <label
                    key={perm}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                      checked
                        ? 'border-[#FF9418]/40 bg-orange-50 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    } ${editing?.isSystem ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[#FF9418]"
                      checked={checked}
                      disabled={!!editing?.isSystem}
                      onChange={() => togglePermission(perm)}
                    />
                    <code className="font-mono text-[11px]">{perm}</code>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete role?"
        message={
          confirmDelete
            ? `Demo only: permanently remove custom role “${confirmDelete.name}”? System roles cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete && !confirmDelete.isSystem) deleteRole(confirmDelete.id);
        }}
      />
    </div>
  );
};

export default StaffRoles;
