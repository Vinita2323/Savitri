import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Plus, X } from 'lucide-react';
import { useSuperAdmin } from '../context/SuperAdminContext';

/**
 * My Bill Book–style “Switch Brand” dropdown for Super Admin sidebar.
 * Create New Brand opens an in-panel modal (stays on /super-admin — no module jump).
 */
export const SuperAdminBrandSwitcher = ({ collapsed = false }) => {
  const {
    brands,
    selectedBrand,
    selectedBrandId,
    setSelectedBrandId,
    sidebarOpen,
    createBrand,
  } = useSuperAdmin();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', city: '' });
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (collapsed || !sidebarOpen) setOpen(false);
  }, [collapsed, sidebarOpen]);

  const openCreateModal = () => {
    setOpen(false);
    setForm({ name: '', code: '', city: '' });
    setError('');
    setShowCreate(true);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    const result = createBrand(form);
    if (!result.ok) {
      setError(result.message || 'Could not create brand.');
      return;
    }
    setShowCreate(false);
  };

  const panel = open ? (
    <div
      className={`absolute z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
        sidebarOpen ? 'left-0 right-0 top-[calc(100%+6px)]' : 'left-12 top-0 w-64'
      }`}
    >
      <div className="border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-normal uppercase tracking-wide text-slate-400">Switch Brand</p>
      </div>

      <div className="max-h-56 overflow-y-auto py-1">
        {brands.map((brand) => {
          const active = brand.id === selectedBrandId;
          return (
            <button
              key={brand.id}
              type="button"
              onClick={() => {
                setSelectedBrandId(brand.id);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center gap-3 border-none px-3 py-2.5 text-left transition ${
                active ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 p-1">
                <img src="/LogoSavitri.png" alt="" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{brand.name}</p>
                <p className="truncate text-xs font-normal text-slate-500">
                  {brand.city} · {brand.code}
                </p>
              </div>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? 'border-[#79B433]' : 'border-slate-300'
                }`}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-[#79B433]" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openCreateModal}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-slate-100 border-none bg-white px-3 py-3 text-sm font-medium text-[#2563eb] hover:bg-slate-50"
      >
        <Plus size={14} /> Create New Brand
      </button>
    </div>
  ) : null;

  const createModal = showCreate ? (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <form
        onSubmit={submitCreate}
        className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Create New Brand</h3>
            <p className="text-[11px] font-medium text-amber-700">
              Stays in Super Admin — demo list only (not saved to database).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="cursor-pointer rounded-lg border-none bg-transparent p-1 text-slate-500 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#79B433]"
            placeholder="e.g. Fashion Gallary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Code *</label>
          <input
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#79B433]"
            placeholder="e.g. FG-IND"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-600">City *</label>
          <input
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#79B433]"
            placeholder="e.g. Indore"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="cursor-pointer rounded-xl border-none bg-[#79B433] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#689A2B]"
          >
            Add Brand
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  ) : null;

  if (!sidebarOpen || collapsed) {
    return (
      <>
        <div ref={rootRef} className="relative flex justify-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-[#79B433] text-white shadow-lg"
            title={selectedBrand?.name || 'Switch brand'}
          >
            <Building2 size={20} />
          </button>
          {panel}
        </div>
        {createModal}
      </>
    );
  }

  return (
    <>
      <div ref={rootRef} className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#355A1C] bg-[#0F1C06] px-2.5 py-2 text-left transition hover:border-[#79B433]/60"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
            <img src="/LogoSavitri.png" alt="" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-medium uppercase tracking-wide text-white">
                {selectedBrand?.shortName || selectedBrand?.name || 'Select Brand'}
              </span>
              <span className="shrink-0 rounded bg-[#79B433] px-1.5 py-0.5 text-[10px] font-normal text-white">
                TREASURY
              </span>
            </div>
            <p className="truncate text-xs font-normal text-teal-300/90">
              {selectedBrand?.city || 'Super Admin Financial'}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-teal-300/80 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {panel}
      </div>
      {createModal}
    </>
  );
};
