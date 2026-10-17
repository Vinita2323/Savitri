import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';

const emptyForm = {
  name: '',
  code: '',
  logo: '/LogoSavitri.png',
  city: '',
  address: '',
  contact: '',
  gst: '',
  status: 'Active',
};

const BrandForm = () => {
  const { brandId } = useParams();
  const isEdit = Boolean(brandId);
  const navigate = useNavigate();
  const { brands, createBrand, updateBrand, isBrandCodeUnique } = useBrandSuperAdmin();

  const existing = useMemo(
    () => (isEdit ? brands.find((b) => b.id === brandId) : null),
    [brands, brandId, isEdit]
  );

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        code: existing.code,
        logo: existing.logo,
        city: existing.city,
        address: existing.address,
        contact: existing.contact,
        gst: existing.gst,
        status: existing.status,
      });
    } else if (!isEdit) {
      setForm(emptyForm);
    }
  }, [existing, isEdit]);

  if (isEdit && !existing) {
    return (
      <div className="p-6">
        <p className="text-sm font-bold text-slate-600">Brand not found in demo data.</p>
        <button type="button" className="mt-3 cursor-pointer text-[#79B433]" onClick={() => navigate('/brand-super-admin/brands')}>
          Back to brands
        </button>
      </div>
    );
  }

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField('logo', String(reader.result || '/LogoSavitri.png'));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Brand name is required';
    if (!form.code.trim()) next.code = 'Brand code is required';
    else if (!isBrandCodeUnique(form.code, existing?.id)) next.code = 'Brand code must be unique in demo list';
    if (!form.city.trim()) next.city = 'Operating city is required';
    if (!form.address.trim()) next.address = 'Business address is required';
    if (!form.contact.trim()) next.contact = 'Contact number is required';
    else if (!/^\d{10}$/.test(form.contact.replace(/\D/g, '').slice(-10))) next.contact = 'Enter a valid 10-digit number';
    if (!form.gst.trim()) next.gst = 'GST number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      city: form.city.trim(),
      address: form.address.trim(),
      contact: form.contact.replace(/\D/g, '').slice(-10),
      gst: form.gst.trim().toUpperCase(),
    };
    if (isEdit) {
      updateBrand(existing.id, payload);
      setSavedMsg('Brand updated in local demo state only — not saved to any database.');
    } else {
      const created = createBrand(payload);
      setSavedMsg('Brand created in local demo state only — not saved to any database.');
      setTimeout(() => navigate(`/brand-super-admin/brands/${created.id}`), 600);
      return;
    }
  };

  const fieldCls = (key) =>
    `w-full rounded-xl border ${errors[key] ? 'border-rose-400' : 'border-slate-200'} bg-white px-3 py-2.5 text-sm outline-none focus:border-[#79B433]`;

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title={isEdit ? 'Edit Brand' : 'Create New Brand'}
        subtitle="Frontend form only — updates mock state in this browser session"
        actions={
          <button
            type="button"
            onClick={() => navigate('/brand-super-admin/brands')}
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <img src={form.logo} alt="Logo preview" className="h-16 w-16 rounded-2xl border border-slate-200 object-contain bg-slate-50 p-1" />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              <Upload size={14} /> Upload logo preview
              <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Name *</label>
              <input className={fieldCls('name')} value={form.name} onChange={(e) => setField('name', e.target.value)} />
              {errors.name && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Code *</label>
              <input className={fieldCls('code')} value={form.code} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder="e.g. FG-IND" />
              {errors.code && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.code}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Operating City *</label>
              <input className={fieldCls('city')} value={form.city} onChange={(e) => setField('city', e.target.value)} />
              {errors.city && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.city}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Contact Number *</label>
              <input className={fieldCls('contact')} value={form.contact} onChange={(e) => setField('contact', e.target.value)} />
              {errors.contact && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.contact}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Business Address *</label>
              <textarea className={fieldCls('address')} rows={2} value={form.address} onChange={(e) => setField('address', e.target.value)} />
              {errors.address && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.address}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">GST Number *</label>
              <input className={fieldCls('gst')} value={form.gst} onChange={(e) => setField('gst', e.target.value.toUpperCase())} />
              {errors.gst && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.gst}</p>}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Brand Status</label>
              <select className={fieldCls('status')} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {savedMsg && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
              {savedMsg}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="cursor-pointer rounded-xl border-none bg-[#79B433] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#689A2B]">
              {isEdit ? 'Save changes (demo)' : 'Create brand (demo)'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/brand-super-admin/brands')}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandForm;
