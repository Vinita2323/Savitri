import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Power } from 'lucide-react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';

const BrandManagement = () => {
  const navigate = useNavigate();
  const { brands, toggleBrandStatus, setSelectedBrandId } = useBrandSuperAdmin();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return brands.filter((b) => {
      const matchesQ =
        !term ||
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [brands, q, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title="Brand Management"
        subtitle="Create and manage multi-city brands (local demo state)"
        actions={
          <button
            type="button"
            onClick={() => navigate('/brand-super-admin/brands/new')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-[#79B433] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#689A2B]"
          >
            <Plus size={14} /> Create New Brand
          </button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search brand, code, city…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#79B433]"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
          >
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {pageRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-bold text-slate-600">No brands match your filters.</p>
            <p className="mt-1 text-xs text-slate-400">Demo empty state — try clearing search.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map((b) => (
              <article key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <img src={b.logo} alt="" className="h-12 w-12 rounded-xl border border-slate-100 object-contain bg-slate-50 p-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-slate-900">{b.name}</h3>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {b.code} · {b.city}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                          b.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-4 text-center">
                      <div>
                        <p className="text-sm font-black text-slate-900">{b.sellers}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Sellers</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{b.captains}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Captains</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrandId(b.id);
                      navigate(`/brand-super-admin/brands/${b.id}`);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/brand-super-admin/brands/${b.id}/edit`)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBrandStatus(b.id)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                  >
                    <Power size={12} /> {b.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing {pageRows.length} of {filtered.length} (demo)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1.5">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandManagement;
