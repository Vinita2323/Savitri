import React, { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  Modal,
  formatINR,
  fieldClass,
  labelClass,
  btnPrimaryClass,
  btnSecondaryClass,
  btnGhostClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_MEMBERSHIP_PLANS, INITIAL_BRANDS } from '../data/mockData';

const emptyEdit = {
  price: 0,
  durationDays: 30,
  discountPercent: 0,
  maxListings: 0,
  status: 'Active',
};

const PlanCard = ({ plan, onEdit }) => (
  <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{plan.audience}</p>
        <h3 className="text-sm font-extrabold text-slate-900">{plan.name}</h3>
      </div>
      <StatusBadge status={plan.status} />
    </div>
    <p className="text-2xl font-extrabold text-[#31551C]">{formatINR(plan.price)}</p>
    <ul className="mt-3 space-y-1 text-xs font-medium text-slate-600">
      <li>Duration: {plan.durationDays} days</li>
      <li>Discount: {plan.discountPercent}%</li>
      {plan.audience === 'Seller' && <li>Max listings: {plan.maxListings}</li>}
    </ul>
    <button type="button" onClick={() => onEdit(plan)} className={`${btnGhostClass} mt-3 self-start`}>
      <Pencil size={14} /> Edit plan
    </button>
  </div>
);

const MembershipRules = () => {
  const ctx = useMyWillBookSuperAdmin();
  const plans = ctx?.membershipPlans ?? INITIAL_MEMBERSHIP_PLANS;
  const brands = ctx?.brands ?? INITIAL_BRANDS;
  const updateMembershipPlan = ctx?.updateMembershipPlan;

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEdit);
  const [toast, setToast] = useState(null);

  const sellerPlans = useMemo(() => plans.filter((p) => p.audience === 'Seller'), [plans]);
  const captainPlans = useMemo(() => plans.filter((p) => p.audience === 'Captain'), [plans]);
  const overrideBrands = useMemo(
    () => brands.filter((b) => b.config?.overrides?.membership),
    [brands]
  );

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      price: plan.price,
      durationDays: plan.durationDays,
      discountPercent: plan.discountPercent,
      maxListings: plan.maxListings,
      status: plan.status,
    });
  };

  const save = () => {
    if (!editing) return;
    updateMembershipPlan?.(editing.id, {
      price: Number(form.price),
      durationDays: Number(form.durationDays),
      discountPercent: Number(form.discountPercent),
      maxListings: Number(form.maxListings),
      status: form.status,
    });
    setEditing(null);
    setToast('Membership plan updated (demo)');
    window.setTimeout(() => setToast(null), 2800);
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Global Membership Rules"
        subtitle="Seller and captain membership plans with brand override indicators"
        breadcrumbs={['MyWillBook', 'Platform', 'Membership']}
      />

      {toast && (
        <div className="rounded-xl border border-[#31551C]/30 bg-[#31551C]/10 px-3 py-2 text-xs font-bold text-[#31551C]">
          {toast}
        </div>
      )}

      {overrideBrands.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#FF9418]">
            Brand membership overrides
          </p>
          <p className="mt-1 text-xs font-medium text-slate-700">
            These brands use local membership config instead of global plans:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {overrideBrands.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800"
              >
                {b.name}
                {b.config?.membershipEnabled === false ? (
                  <span className="text-rose-600">· off</span>
                ) : (
                  <span className="text-[#31551C]">
                    · {b.config?.membershipDiscountPercent ?? '—'}% off
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Seller plans</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sellerPlans.map((p) => (
            <PlanCard key={p.id} plan={p} onEdit={openEdit} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Captain plans</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {captainPlans.map((p) => (
            <PlanCard key={p.id} plan={p} onEdit={openEdit} />
          ))}
        </div>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit · ${editing.name}` : 'Edit plan'}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className={btnSecondaryClass}>
              Cancel
            </button>
            <button type="button" onClick={save} className={btnPrimaryClass}>
              Save plan
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              Audience: <strong>{editing.audience}</strong> · Preview price:{' '}
              <strong>{formatINR(form.price)}</strong>
            </div>
            <div>
              <label className={labelClass}>Price (₹)</label>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Duration (days)</label>
              <input
                type="number"
                min={1}
                className={fieldClass}
                value={form.durationDays}
                onChange={(e) => set('durationDays', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className={fieldClass}
                value={form.discountPercent}
                onChange={(e) => set('discountPercent', e.target.value)}
              />
            </div>
            {editing.audience === 'Seller' && (
              <div>
                <label className={labelClass}>Max listings</label>
                <input
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={form.maxListings}
                  onChange={(e) => set('maxListings', e.target.value)}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={fieldClass}
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MembershipRules;
