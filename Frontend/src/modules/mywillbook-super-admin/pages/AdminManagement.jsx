import React, { useMemo, useState } from 'react';
import { Plus, Eye, Pencil, Power } from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  Modal,
  ConfirmDialog,
  Drawer,
  EmptyState,
  FilterBar,
  Pagination,
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
import { INITIAL_ADMINS, INITIAL_BRANDS, INITIAL_ROLES } from '../data/mockData';

const emptyForm = {
  name: '',
  email: '',
  contact: '',
  brands: [],
  role: 'Brand Admin',
  status: 'Active',
};

const AdminManagement = () => {
  const ctx = useMyWillBookSuperAdmin();
  const [localAdmins, setLocalAdmins] = useState(INITIAL_ADMINS);

  const admins = ctx?.admins ?? localAdmins;
  const brands = ctx?.brands ?? INITIAL_BRANDS;
  const roles = ctx?.roles ?? INITIAL_ROLES;

  const createAdmin =
    ctx?.createAdmin ||
    ((payload) => {
      const next = {
        id: `adm_${Date.now()}`,
        status: 'Active',
        lastLogin: null,
        brands: [],
        ...payload,
      };
      setLocalAdmins((prev) => [next, ...prev]);
      return next;
    });

  const updateAdmin =
    ctx?.updateAdmin ||
    ((id, patch) => {
      setLocalAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    });

  const toggleAdminStatus =
    ctx?.toggleAdminStatus ||
    ((id) => {
      setLocalAdmins((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a
        )
      );
    });

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [drawerAdmin, setDrawerAdmin] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const brandName = (id) => brands.find((b) => b.id === id)?.name || id;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return admins.filter((a) => {
      const matchesQ =
        !term ||
        a.name.toLowerCase().includes(term) ||
        (a.email || '').toLowerCase().includes(term) ||
        (a.contact || '').includes(term) ||
        (a.role || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchesRole = roleFilter === 'all' || a.role === roleFilter;
      return matchesQ && matchesStatus && matchesRole;
    });
  }, [admins, q, statusFilter, roleFilter]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      role: roles.find((r) => !r.isSystem)?.name || emptyForm.role,
    });
    setModalOpen(true);
  };

  const openEdit = (admin) => {
    setEditing(admin);
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      contact: admin.contact || '',
      brands: [...(admin.brands || [])],
      role: admin.role || 'Brand Admin',
      status: admin.status || 'Active',
    });
    setModalOpen(true);
  };

  const toggleBrand = (brandId) => {
    setForm((f) => ({
      ...f,
      brands: f.brands.includes(brandId)
        ? f.brands.filter((id) => id !== brandId)
        : [...f.brands, brandId],
    }));
  };

  const saveForm = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      contact: form.contact.trim(),
      brands: form.brands,
      role: form.role,
      status: form.status,
    };
    if (editing) updateAdmin(editing.id, payload);
    else createAdmin(payload);
    setModalOpen(false);
  };

  const formatLogin = (iso) => {
    if (!iso) return 'Never (demo)';
    try {
      return new Date(iso).toLocaleString('en-IN');
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Management"
        subtitle="Create and manage brand / regional admins (demo state only)"
        breadcrumbs={['MyWillBook', 'Access', 'Admin Management']}
        actions={
          <button type="button" onClick={openAdd} className={btnPrimaryClass}>
            <Plus size={14} /> Add Admin
          </button>
        }
      />

      <FilterBar>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email, contact, role…"
          className={`${fieldClass} sm:min-w-[240px] sm:flex-1`}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState
          title="No admins match your filters."
          description="Demo empty state — try clearing search or filters."
        />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Brands</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Last login</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td className={tdClass}>
                    <span className="font-extrabold text-slate-900">{a.name}</span>
                    {a.contact ? (
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{a.contact}</p>
                    ) : null}
                  </td>
                  <td className={tdClass}>{a.email}</td>
                  <td className={tdClass}>{a.role}</td>
                  <td className={tdClass}>
                    {(a.brands || []).length
                      ? (a.brands || []).map(brandName).join(', ')
                      : '—'}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className={tdClass}>{formatLogin(a.lastLogin)}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDrawerAdmin(a)}
                        className={btnSecondaryClass}
                      >
                        <Eye size={12} /> Details
                      </button>
                      <button type="button" onClick={() => openEdit(a)} className={btnSecondaryClass}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmToggle(a)}
                        className={btnSecondaryClass}
                      >
                        <Power size={12} /> {a.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Admin' : 'Add Admin'}
        wide
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={saveForm} className={btnPrimaryClass}>
              {editing ? 'Save changes' : 'Create admin'}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={fieldClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Contact</label>
            <input
              className={fieldClass}
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              placeholder="Phone (demo)"
            />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select
              className={fieldClass}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={fieldClass}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Brands (multi-select)</label>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {brands.map((b) => {
                const checked = form.brands.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                      checked
                        ? 'border-[#FF9418] bg-orange-50 text-[#e8840f]'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[#FF9418]"
                      checked={checked}
                      onChange={() => toggleBrand(b.id)}
                    />
                    {b.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      <Drawer open={!!drawerAdmin} onClose={() => setDrawerAdmin(null)} title="Admin details">
        {drawerAdmin && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-black text-slate-900">{drawerAdmin.name}</h4>
              <p className="text-xs font-semibold text-slate-500">{drawerAdmin.email}</p>
              <div className="mt-2">
                <StatusBadge status={drawerAdmin.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Role</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerAdmin.role}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Contact</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerAdmin.contact || '—'}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Assigned brands</dt>
                <dd className="mt-1 font-bold text-slate-800">
                  {(drawerAdmin.brands || []).length
                    ? (drawerAdmin.brands || []).map(brandName).join(', ')
                    : 'None'}
                </dd>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Last login</dt>
                <dd className="mt-1 font-bold text-slate-800">{formatLogin(drawerAdmin.lastLogin)}</dd>
              </div>
            </dl>
            <p className="text-[11px] font-semibold text-amber-700">Demo record — not a live account.</p>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        title={confirmToggle?.status === 'Active' ? 'Deactivate admin?' : 'Activate admin?'}
        message={
          confirmToggle
            ? `Demo only: ${confirmToggle.status === 'Active' ? 'Deactivate' : 'Activate'} “${confirmToggle.name}”?`
            : ''
        }
        confirmLabel={confirmToggle?.status === 'Active' ? 'Deactivate' : 'Activate'}
        danger={confirmToggle?.status === 'Active'}
        onConfirm={() => {
          if (confirmToggle) toggleAdminStatus(confirmToggle.id);
        }}
      />
    </div>
  );
};

export default AdminManagement;
