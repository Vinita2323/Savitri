import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Plus, Upload, X } from 'lucide-react';
import { useSuperAdmin } from '../context/SuperAdminContext';

const EMPTY_FORM = {
  name: '',
  code: '',
  shortName: '',
  category: 'Apparel & Fashion',
  city: '',
  state: 'Madhya Pradesh',
  address: '',
  contact: '',
  email: '',
  website: '',
  gst: '',
  pan: '',
  status: 'Active',
  description: '',
  logo: '/LogoSavitri.png',
};

const CATEGORIES = [
  'Apparel & Fashion',
  'Electronics',
  'Grocery & FMCG',
  'Beauty & Personal Care',
  'Home & Living',
  'Other',
];

const STATES = [
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Gujarat',
  'Uttar Pradesh',
  'Delhi',
  'Karnataka',
  'Other',
];

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
  const [form, setForm] = useState(EMPTY_FORM);
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

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreateModal = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setError('');
    setShowCreate(true);
  };

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField('logo', String(reader.result || '/LogoSavitri.png'));
    reader.readAsDataURL(file);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    const result = createBrand({
      ...form,
      shortName: form.shortName.trim() || form.name.trim(),
    });
    if (!result.ok) {
      setError(result.message || 'Could not create brand.');
      return;
    }
    setShowCreate(false);
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#79B433]';

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
                <img src={brand.logo || '/LogoSavitri.png'} alt="" className="h-full w-full object-contain" />
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
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4"
      onClick={() => setShowCreate(false)}
    >
      <form
        onSubmit={submitCreate}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Create New Brand</h3>
            <p className="mt-0.5 text-[11px] font-medium text-amber-700">
              Stays in Super Admin — demo list only (not saved to database).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="cursor-pointer rounded-lg border-none bg-transparent p-1 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {/* Logo */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <img
              src={form.logo}
              alt="Brand logo preview"
              className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50 object-contain p-1"
            />
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                <Upload size={14} /> Upload brand logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
              </label>
              <p className="mt-1 text-[10px] text-slate-400">PNG or JPG · preview only in this session</p>
            </div>
          </div>

          {/* Identity */}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand identity</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Name *</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Fashion Gallary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Display / Short Name</label>
                <input
                  className={inputCls}
                  value={form.shortName}
                  onChange={(e) => setField('shortName', e.target.value)}
                  placeholder="Shown in sidebar (optional)"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Code *</label>
                <input
                  className={inputCls}
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. FG-IND"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Business Category *</label>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Description</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Short note about this brand / store cluster"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Operating location</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">City *</label>
                <input
                  className={inputCls}
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  placeholder="e.g. Indore"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">State *</label>
                <select className={inputCls} value={form.state} onChange={(e) => setField('state', e.target.value)}>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Business Address *</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="Registered / warehouse address"
                />
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Contact Number *</label>
                <input
                  className={inputCls}
                  value={form.contact}
                  onChange={(e) => setField('contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Business Email *</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="ops@brand.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Website</label>
                <input
                  className={inputCls}
                  value={form.website}
                  onChange={(e) => setField('website', e.target.value)}
                  placeholder="https:// (optional)"
                />
              </div>
            </div>
          </section>

          {/* Compliance */}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax & compliance</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">GSTIN *</label>
                <input
                  className={inputCls}
                  value={form.gst}
                  onChange={(e) => setField('gst', e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="15-character GSTIN"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">PAN *</label>
                <input
                  className={inputCls}
                  value={form.pan}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="e.g. AABCF1234A"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="submit"
            className="cursor-pointer rounded-xl border-none bg-[#79B433] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#689A2B]"
          >
            Add Brand
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700"
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
            <img src={selectedBrand?.logo || '/LogoSavitri.png'} alt="" className="h-full w-full object-contain" />
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
