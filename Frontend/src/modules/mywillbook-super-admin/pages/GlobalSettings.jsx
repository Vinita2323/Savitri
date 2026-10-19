import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import {
  PageHeader,
  ConfirmDialog,
  fieldClass,
  labelClass,
  btnPrimaryClass,
  btnSecondaryClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_GLOBAL_SETTINGS } from '../data/mockData';

const cloneSettings = (src) => ({ ...INITIAL_GLOBAL_SETTINGS, ...src });

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="mb-3 text-sm font-extrabold text-slate-900">{title}</h2>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </section>
);

const Field = ({ label, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
  </div>
);

const GlobalSettings = () => {
  const ctx = useMyWillBookSuperAdmin();
  const stored = ctx?.globalSettings ?? INITIAL_GLOBAL_SETTINGS;
  const updateGlobalSettings = ctx?.updateGlobalSettings;

  const [form, setForm] = useState(() => cloneSettings(stored));
  const [confirmSave, setConfirmSave] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setForm(cloneSettings(stored));
  }, [stored]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleSave = () => {
    if (updateGlobalSettings) {
      updateGlobalSettings(form);
    }
    showToast('Global settings saved (demo)');
  };

  const handleReset = () => {
    setForm(cloneSettings(INITIAL_GLOBAL_SETTINGS));
    if (updateGlobalSettings) {
      updateGlobalSettings({ ...INITIAL_GLOBAL_SETTINGS });
    }
    showToast('Reset to initial defaults (demo)');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Global Settings"
        subtitle="Platform defaults for branding, commerce, delivery, and membership"
        breadcrumbs={['MyWillBook', 'Platform', 'Global Settings']}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleReset} className={btnSecondaryClass}>
              <RotateCcw size={14} /> Reset defaults
            </button>
            <button type="button" onClick={() => setConfirmSave(true)} className={btnPrimaryClass}>
              <Save size={14} /> Save settings
            </button>
          </div>
        }
      />

      {toast && (
        <div className="rounded-xl border border-[#31551C]/30 bg-[#31551C]/10 px-3 py-2 text-xs font-bold text-[#31551C]">
          {toast}
        </div>
      )}

      <Section title="Platform name & branding">
        <Field label="Platform name">
          <input
            className={fieldClass}
            value={form.platformName}
            onChange={(e) => set('platformName', e.target.value)}
          />
        </Field>
        <Field label="Support email">
          <input
            type="email"
            className={fieldClass}
            value={form.supportEmail}
            onChange={(e) => set('supportEmail', e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Currency & timezone">
        <Field label="Default currency">
          <select
            className={fieldClass}
            value={form.defaultCurrency}
            onChange={(e) => set('defaultCurrency', e.target.value)}
          >
            <option value="INR">INR — Indian Rupee</option>
            <option value="USD">USD — US Dollar</option>
            <option value="AED">AED — UAE Dirham</option>
          </select>
        </Field>
        <Field label="Timezone">
          <select
            className={fieldClass}
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="UTC">UTC</option>
          </select>
        </Field>
      </Section>

      <Section title="Default commission">
        <Field label="Default commission rate (%)">
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            className={fieldClass}
            value={form.defaultCommissionRate}
            onChange={(e) => set('defaultCommissionRate', Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="Delivery defaults">
        <Field label="Delivery radius (km)">
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={form.deliveryRadiusKm}
            onChange={(e) => set('deliveryRadiusKm', Number(e.target.value))}
          />
        </Field>
        <Field label="Minimum order amount (₹)">
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={form.minOrderAmount}
            onChange={(e) => set('minOrderAmount', Number(e.target.value))}
          />
        </Field>
        <Field label="Delivery fee (₹)">
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={form.deliveryFee}
            onChange={(e) => set('deliveryFee', Number(e.target.value))}
          />
        </Field>
        <Field label="Free delivery above (₹)">
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={form.freeDeliveryAbove}
            onChange={(e) => set('freeDeliveryAbove', Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="Membership defaults">
        <Field label="Membership enabled">
          <label className="flex cursor-pointer items-center gap-2 py-2.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={!!form.membershipEnabled}
              onChange={(e) => set('membershipEnabled', e.target.checked)}
              className="h-4 w-4 accent-[#FF9418]"
            />
            Enable membership program
          </label>
        </Field>
        <Field label="Membership discount (%)">
          <input
            type="number"
            min={0}
            max={100}
            className={fieldClass}
            disabled={!form.membershipEnabled}
            value={form.membershipDiscountPercent}
            onChange={(e) => set('membershipDiscountPercent', Number(e.target.value))}
          />
        </Field>
      </Section>

      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleSave}
        title="Save global settings?"
        message="Apply these platform defaults across the demo. Brands with overrides keep their local values."
        confirmLabel="Save settings"
      />
    </div>
  );
};

export default GlobalSettings;
