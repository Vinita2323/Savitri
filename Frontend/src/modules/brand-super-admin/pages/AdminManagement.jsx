import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Power, X } from 'lucide-react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';

const emptyAdmin = { name: '', email: '', role: 'Brand Admin', brands: [], status: 'Active' };

const AdminManagement = () => {
  const { admins, brands, createAdmin, updateAdmin, toggleAdminStatus } = useBrandSuperAdmin();
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', id? }
  const [form, setForm] = useState(emptyAdmin);
  const [errors, setErrors] = useState({});
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return admins;
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        a.role.toLowerCase().includes(term)
    );
  }, [admins, q]);

  const brandName = (id) => brands.find((b) => b.id === id)?.name || id;

  const openCreate = () => {
    setForm(emptyAdmin);
    setErrors({});
    setModal({ mode: 'create' });
  };

  const openEdit = (admin) => {
    setForm({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      brands: [...admin.brands],
      status: admin.status,
    });
    setErrors({});
    setModal({ mode: 'edit', id: admin.id });
  };

  const toggleBrandAssign = (brandId) => {
    setForm((prev) => ({
      ...prev,
      brands: prev.brands.includes(brandId)
        ? prev.brands.filter((id) => id !== brandId)
        : [...prev.brands, brandId],
    }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.brands.length) next.brands = 'Assign at least one brand';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      brands: form.brands,
      status: form.status,
    };
    if (modal.mode === 'create') createAdmin(payload);
    else updateAdmin(modal.id, payload);
    setModal(null);
  };

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title="Admin Management"
        subtitle="Demo admins only — no real accounts or credentials are created"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-[#79B433] px-4 py-2.5 text-xs font-bold text-white"
          >
            <Plus size={14} /> Create Admin
          </button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search admins…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#79B433] sm:max-w-sm"
        />

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Assigned brands</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.brands.map(brandName).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold">{a.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        a.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(a)} className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                        <Pencil size={12} />
                      </button>
                      <button type="button" onClick={() => toggleAdminStatus(a.id)} className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                        <Power size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No demo admins match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                {modal.mode === 'create' ? 'Create Admin (demo)' : 'Edit Admin (demo)'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="cursor-pointer border-none bg-transparent p-1">
                <X size={16} />
              </button>
            </div>
            <p className="text-[10px] font-semibold text-amber-700">
              Local React state only — does not create real login credentials.
            </p>
            <div>
              <label className="mb-1 block text-[11px] font-bold">Name *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#79B433]"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              {errors.name && <p className="text-[10px] font-semibold text-rose-600">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold">Email *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#79B433]"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
              {errors.email && <p className="text-[10px] font-semibold text-rose-600">{errors.email}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold">Role</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option>Brand Admin</option>
                <option>Regional Admin</option>
                <option>Read-only Viewer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold">Assigned brands *</label>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBrandAssign(b.id)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold ${
                      form.brands.includes(b.id)
                        ? 'border-[#79B433] bg-[#79B433]/10 text-[#689A2B]'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
              {errors.brands && <p className="text-[10px] font-semibold text-rose-600">{errors.brands}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold">Status</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="cursor-pointer rounded-xl border-none bg-[#79B433] px-4 py-2.5 text-xs font-bold text-white">
                Save (demo)
              </button>
              <button type="button" onClick={() => setModal(null)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
