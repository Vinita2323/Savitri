import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader, btnPrimaryClass, btnSecondaryClass } from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_BRANDS, INITIAL_GLOBAL_SETTINGS, GLOBAL_DEFAULTS } from '../data/mockData';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF9418] disabled:bg-slate-50 disabled:text-slate-400';
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400';

const OverrideLabel = ({ isOverride }) => (
  <span
    className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
      isOverride ? 'bg-orange-50 text-[#FF9418]' : 'bg-emerald-50 text-[#31551C]'
    }`}
  >
    {isOverride ? 'Brand override' : 'Global default'}
  </span>
);

const defaultsFromGlobal = (globalSettings) => ({
  deliveryRadiusKm: globalSettings?.deliveryRadiusKm ?? GLOBAL_DEFAULTS.deliveryRadiusKm,
  minOrderAmount: globalSettings?.minOrderAmount ?? GLOBAL_DEFAULTS.minOrderAmount,
  deliveryFee: globalSettings?.deliveryFee ?? GLOBAL_DEFAULTS.deliveryFee,
  freeDeliveryAbove: globalSettings?.freeDeliveryAbove ?? GLOBAL_DEFAULTS.freeDeliveryAbove,
  commissionPercent: globalSettings?.defaultCommissionRate ?? GLOBAL_DEFAULTS.commissionPercent,
  membershipEnabled: globalSettings?.membershipEnabled ?? GLOBAL_DEFAULTS.membershipEnabled,
  membershipDiscountPercent:
    globalSettings?.membershipDiscountPercent ?? GLOBAL_DEFAULTS.membershipDiscountPercent,
});

const configFromBrand = (brand, globalSettings) => {
  const g = defaultsFromGlobal(globalSettings);
  const c = brand?.config || {};
  return {
    useIdentityOverride: !!c.useIdentityOverride,
    displayName: c.displayName || brand?.name || '',
    supportPhone: c.supportPhone || brand?.contact || '',
    supportEmail: c.supportEmail || brand?.contactEmail || '',
    deliveryRadiusKm: c.deliveryRadiusKm ?? g.deliveryRadiusKm,
    minOrderAmount: c.minOrderAmount ?? g.minOrderAmount,
    deliveryFee: c.deliveryFee ?? g.deliveryFee,
    freeDeliveryAbove: c.freeDeliveryAbove ?? g.freeDeliveryAbove,
    commissionPercent: c.commissionPercent ?? c.commissionRate ?? g.commissionPercent,
    membershipEnabled: c.membershipEnabled ?? g.membershipEnabled,
    membershipDiscountPercent: c.membershipDiscountPercent ?? g.membershipDiscountPercent,
    status: brand?.status || 'Active',
    cashOnDelivery: c.cashOnDelivery ?? true,
    autoApproveSellers: c.autoApproveSellers ?? false,
    maxActiveCaptains: c.maxActiveCaptains ?? 10,
    overrides: {
      delivery: !!c.overrides?.delivery,
      commission: !!c.overrides?.commission,
      membership: !!c.overrides?.membership,
    },
  };
};

const BrandConfiguration = () => {
  const ctx = useMyWillBookSuperAdmin();
  const brands = ctx?.brands ?? INITIAL_BRANDS;
  const globalSettings = ctx?.globalSettings ?? INITIAL_GLOBAL_SETTINGS;
  const g = defaultsFromGlobal(globalSettings);

  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [form, setForm] = useState(() => configFromBrand(brands[0], globalSettings));
  const [toast, setToast] = useState(null);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === brandId) || brands[0] || null,
    [brands, brandId]
  );

  useEffect(() => {
    if (!selectedBrand) return;
    setForm(configFromBrand(selectedBrand, globalSettings));
  }, [selectedBrand?.id, globalSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const save = () => {
    if (!selectedBrand) return;
    const configPatch = {
      useIdentityOverride: form.useIdentityOverride,
      displayName: form.displayName,
      supportPhone: form.supportPhone,
      supportEmail: form.supportEmail,
      deliveryRadiusKm: form.deliveryRadiusKm,
      minOrderAmount: form.minOrderAmount,
      deliveryFee: form.deliveryFee,
      freeDeliveryAbove: form.freeDeliveryAbove,
      commissionPercent: form.commissionPercent,
      membershipEnabled: form.membershipEnabled,
      membershipDiscountPercent: form.membershipDiscountPercent,
      cashOnDelivery: form.cashOnDelivery,
      autoApproveSellers: form.autoApproveSellers,
      maxActiveCaptains: form.maxActiveCaptains,
      overrides: form.overrides,
    };
    if (ctx?.updateBrandConfig) {
      ctx.updateBrandConfig(selectedBrand.id, configPatch);
      if (form.status !== selectedBrand.status) {
        ctx.updateBrand?.(selectedBrand.id, { status: form.status });
      }
    } else if (ctx?.updateBrand) {
      ctx.updateBrand(selectedBrand.id, { status: form.status, config: configPatch });
    }
    showToast('Brand configuration saved (demo)');
  };

  const setOverride = (key, value) => {
    setForm((f) => ({ ...f, overrides: { ...f.overrides, [key]: value } }));
  };

  const Section = ({ title, overrideKey, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-slate-900">
          {title}
          {overrideKey != null && <OverrideLabel isOverride={!!form.overrides?.[overrideKey]} />}
        </h2>
        {overrideKey != null && (
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-600">
            <input
              type="checkbox"
              checked={!!form.overrides?.[overrideKey]}
              onChange={(e) => setOverride(overrideKey, e.target.checked)}
              className="h-3.5 w-3.5 accent-[#FF9418]"
            />
            Use brand override
          </label>
        )}
      </div>
      {children}
    </section>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Brand Configuration"
        subtitle="Per-brand overrides for identity, delivery, commission, and membership"
        breadcrumbs={['MyWillBook', 'Business', 'Brand Configuration']}
        actions={
          <button type="button" onClick={save} className={btnPrimaryClass}>
            <Save size={14} /> Save configuration
          </button>
        }
      />

      {toast && (
        <div className="rounded-xl border border-[#31551C]/30 bg-[#31551C]/10 px-3 py-2 text-xs font-bold text-[#31551C]">
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className={labelClass}>Select brand</label>
        <select
          className={fieldClass}
          value={selectedBrand?.id || ''}
          onChange={(e) => setBrandId(e.target.value)}
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
        <p className="mt-2 text-[10px] font-semibold text-amber-600">
          Global defaults: commission {g.commissionPercent}%, delivery fee ₹{g.deliveryFee}, radius{' '}
          {g.deliveryRadiusKm} km
        </p>
      </div>

      {!selectedBrand ? (
        <p className="text-sm font-semibold text-slate-500">No brands available (demo).</p>
      ) : (
        <div className="space-y-4">
          <Section title="Identity">
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-600">
              <input
                type="checkbox"
                checked={!!form.useIdentityOverride}
                onChange={(e) => setForm((f) => ({ ...f, useIdentityOverride: e.target.checked }))}
                className="h-3.5 w-3.5 accent-[#FF9418]"
              />
              Override display identity
              <OverrideLabel isOverride={!!form.useIdentityOverride} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Display name</label>
                <input
                  className={fieldClass}
                  disabled={!form.useIdentityOverride}
                  value={form.useIdentityOverride ? form.displayName : selectedBrand.name}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Brand code (read-only)</label>
                <input className={fieldClass} value={selectedBrand.code} disabled />
              </div>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Support phone</label>
                <input
                  className={fieldClass}
                  value={form.supportPhone}
                  onChange={(e) => setForm((f) => ({ ...f, supportPhone: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Support email</label>
                <input
                  className={fieldClass}
                  value={form.supportEmail}
                  onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
                />
              </div>
            </div>
          </Section>

          <Section title="Delivery settings" overrideKey="delivery">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['deliveryRadiusKm', 'Delivery radius (km)', g.deliveryRadiusKm],
                ['minOrderAmount', 'Min order amount', g.minOrderAmount],
                ['deliveryFee', 'Delivery fee', g.deliveryFee],
                ['freeDeliveryAbove', 'Free delivery above', g.freeDeliveryAbove],
              ].map(([key, label, globalVal]) => (
                <div key={key}>
                  <label className={labelClass}>
                    {label}
                    <span className="ml-1 font-semibold normal-case text-slate-400">(global: {globalVal})</span>
                  </label>
                  <input
                    type="number"
                    className={fieldClass}
                    disabled={!form.overrides?.delivery}
                    value={form.overrides?.delivery ? form[key] : globalVal}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Commission override" overrideKey="commission">
            <div>
              <label className={labelClass}>
                Commission %
                <span className="ml-1 font-semibold normal-case text-slate-400">
                  (global: {g.commissionPercent}%)
                </span>
              </label>
              <input
                type="number"
                step="0.1"
                className={fieldClass}
                disabled={!form.overrides?.commission}
                value={form.overrides?.commission ? form.commissionPercent : g.commissionPercent}
                onChange={(e) => setForm((f) => ({ ...f, commissionPercent: Number(e.target.value) }))}
              />
            </div>
          </Section>

          <Section title="Membership override" overrideKey="membership">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">
                <span>Membership enabled</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#FF9418]"
                  disabled={!form.overrides?.membership}
                  checked={
                    form.overrides?.membership ? !!form.membershipEnabled : !!g.membershipEnabled
                  }
                  onChange={(e) => setForm((f) => ({ ...f, membershipEnabled: e.target.checked }))}
                />
              </label>
              <div>
                <label className={labelClass}>
                  Member discount %
                  <span className="ml-1 font-semibold normal-case text-slate-400">
                    (global: {g.membershipDiscountPercent}%)
                  </span>
                </label>
                <input
                  type="number"
                  className={fieldClass}
                  disabled={!form.overrides?.membership}
                  value={
                    form.overrides?.membership
                      ? form.membershipDiscountPercent
                      : g.membershipDiscountPercent
                  }
                  onChange={(e) =>
                    setForm((f) => ({ ...f, membershipDiscountPercent: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </Section>

          <Section title="Status">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className={`${fieldClass} max-w-xs`}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button type="button" onClick={save} className={btnSecondaryClass}>
                <Save size={14} /> Save (demo)
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
};

export default BrandConfiguration;
