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
  formatINR,
  btnPrimaryClass,
  btnSecondaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_BRANDS, INITIAL_ADMINS } from '../data/mockData';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF9418]';
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400';

const emptyForm = {
  name: '',
  code: '',
  logo: '/LogoSavitri.png',
  description: '',
  city: '',
  contact: '',
  status: 'Active',
  assignedAdminId: '',
};

const BrandManagement = () => {
  const ctx = useMyWillBookSuperAdmin();
  const [localBrands, setLocalBrands] = useState(INITIAL_BRANDS);
  const admins = ctx?.admins ?? INITIAL_ADMINS;
  const brands = ctx?.brands ?? localBrands;

  const createBrand =
    ctx?.createBrand ||
    ((payload) => {
      const next = {
        id: `brand_${Date.now()}`,
        sellers: 0,
        captains: 0,
        orders: 0,
        sales: 0,
        commission: 0,
        pendingPayout: 0,
        contactEmail: '',
        ...payload,
        code: String(payload.code || '').trim().toUpperCase(),
        logo: payload.logo || '/LogoSavitri.png',
      };
      setLocalBrands((prev) => [next, ...prev]);
      return next;
    });

  const updateBrand =
    ctx?.updateBrand ||
    ((id, patch) => {
      setLocalBrands((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, ...patch, code: patch.code != null ? String(patch.code).trim().toUpperCase() : b.code }
            : b
        )
      );
    });

  const toggleBrandStatus =
    ctx?.toggleBrandStatus ||
    ((id) => {
      setLocalBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: b.status === 'Active' ? 'Inactive' : 'Active' } : b))
      );
    });

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [drawerBrand, setDrawerBrand] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const adminName = (id) => admins.find((a) => a.id === id)?.name || '—';

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = brands.filter((b) => {
      const matchesQ =
        !term ||
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        (b.city || '').toLowerCase().includes(term) ||
        (b.contact || '').includes(term);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesQ && matchesStatus;
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [brands, q, statusFilter, sortKey, sortDir]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (brand) => {
    setEditing(brand);
    setForm({
      name: brand.name || '',
      code: brand.code || '',
      logo: brand.logo || '/LogoSavitri.png',
      description: brand.description || '',
      city: brand.city || '',
      contact: brand.contact || '',
      status: brand.status || 'Active',
      assignedAdminId: brand.assignedAdminId || '',
    });
    setModalOpen(true);
  };

  const saveForm = () => {
    if (!form.name.trim() || !form.code.trim()) return;
    if (editing) updateBrand(editing.id, form);
    else createBrand(form);
    setModalOpen(false);
  };

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Brand Management"
        subtitle="Create and manage platform brands (local demo state)"
        breadcrumbs={['MyWillBook', 'Business', 'Brand Management']}
        actions={
          <button type="button" onClick={openAdd} className={btnPrimaryClass}>
            <Plus size={14} /> Add Brand
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
          placeholder="Search name, code, city, contact…"
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
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={fieldClass}>
          <option value="name">Sort: Name</option>
          <option value="code">Sort: Code</option>
          <option value="city">Sort: City</option>
          <option value="sales">Sort: Sales</option>
          <option value="orders">Sort: Orders</option>
        </select>
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState title="No brands match your filters." description="Demo empty state — try clearing search." />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                {[
                  ['name', 'Brand'],
                  ['code', 'Code'],
                  ['city', 'City'],
                  ['status', 'Status'],
                  ['orders', 'Orders'],
                  ['sales', 'Sales'],
                ].map(([key, label]) => (
                  <th key={key} className={thClass}>
                    <button
                      type="button"
                      onClick={() => onSort(key)}
                      className="cursor-pointer border-none bg-transparent p-0 font-black uppercase tracking-wide text-slate-400 hover:text-[#FF9418]"
                    >
                      {label}
                      {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
                <th className={thClass}>Admin</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => (
                <tr key={b.id}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2">
                      <img
                        src={b.logo}
                        alt=""
                        className="h-8 w-8 rounded-lg border border-slate-100 bg-slate-50 object-contain p-0.5"
                      />
                      <span className="font-extrabold text-slate-900">{b.name}</span>
                    </div>
                  </td>
                  <td className={tdClass}>{b.code}</td>
                  <td className={tdClass}>{b.city}</td>
                  <td className={tdClass}>
                    <StatusBadge status={b.status} />
                  </td>
                  <td className={tdClass}>{(b.orders || 0).toLocaleString('en-IN')}</td>
                  <td className={`${tdClass} font-extrabold text-[#31551C]`}>{formatINR(b.sales)}</td>
                  <td className={tdClass}>{adminName(b.assignedAdminId)}</td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => setDrawerBrand(b)} className={btnSecondaryClass}>
                        <Eye size={12} /> Details
                      </button>
                      <button type="button" onClick={() => openEdit(b)} className={btnSecondaryClass}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button type="button" onClick={() => setConfirmToggle(b)} className={btnSecondaryClass}>
                        <Power size={12} /> {b.status === 'Active' ? 'Deactivate' : 'Activate'}
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
        title={editing ? 'Edit Brand' : 'Add Brand'}
        wide
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={saveForm} className={btnPrimaryClass}>
              {editing ? 'Save changes' : 'Create brand'}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Brand name</label>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Brand code</label>
            <input
              className={fieldClass}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={fieldClass}
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Contact</label>
            <input
              className={fieldClass}
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            />
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
            <label className={labelClass}>Assigned admin</label>
            <select
              className={fieldClass}
              value={form.assignedAdminId}
              onChange={(e) => setForm((f) => ({ ...f, assignedAdminId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Logo URL / path</label>
            <input
              className={fieldClass}
              value={form.logo}
              onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
            />
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <img
                src={form.logo || '/LogoSavitri.png'}
                alt="Logo preview"
                className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
              />
              <p className="text-[11px] font-semibold text-slate-500">Logo preview (demo)</p>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              className={fieldClass}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer open={!!drawerBrand} onClose={() => setDrawerBrand(null)} title="Brand details">
        {drawerBrand && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={drawerBrand.logo}
                alt=""
                className="h-14 w-14 rounded-xl border border-slate-100 bg-slate-50 object-contain p-1"
              />
              <div>
                <h4 className="text-base font-black text-slate-900">{drawerBrand.name}</h4>
                <p className="text-xs font-semibold text-slate-500">
                  {drawerBrand.code} · {drawerBrand.city}
                </p>
                <div className="mt-1">
                  <StatusBadge status={drawerBrand.status} />
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600">{drawerBrand.description || 'No description (demo).'}</p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Contact</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerBrand.contact || '—'}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Admin</dt>
                <dd className="mt-1 font-bold text-slate-800">{adminName(drawerBrand.assignedAdminId)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Sellers</dt>
                <dd className="mt-1 font-black text-[#31551C]">{drawerBrand.sellers ?? 0}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Captains</dt>
                <dd className="mt-1 font-black text-[#31551C]">{drawerBrand.captains ?? 0}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Orders</dt>
                <dd className="mt-1 font-black">{(drawerBrand.orders || 0).toLocaleString('en-IN')}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Sales</dt>
                <dd className="mt-1 font-black text-[#FF9418]">{formatINR(drawerBrand.sales)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        title={confirmToggle?.status === 'Active' ? 'Deactivate brand?' : 'Activate brand?'}
        message={
          confirmToggle
            ? `Demo only: ${confirmToggle.status === 'Active' ? 'Deactivate' : 'Activate'} “${confirmToggle.name}”?`
            : ''
        }
        confirmLabel={confirmToggle?.status === 'Active' ? 'Deactivate' : 'Activate'}
        danger={confirmToggle?.status === 'Active'}
        onConfirm={() => {
          if (confirmToggle) toggleBrandStatus(confirmToggle.id);
        }}
      />
    </div>
  );
};

export default BrandManagement;
