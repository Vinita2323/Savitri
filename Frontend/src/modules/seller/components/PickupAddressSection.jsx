import React, { useEffect, useState } from 'react';
import { Truck, Loader2, Save, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { shippingService } from '../../../services/authService';

const EMPTY = { contactPerson: '', phone: '', addressLine1: '', addressLine2: '', landmark: '', city: '', state: '', pincode: '', country: 'India', latitude: '', longitude: '' };

const STATUS_UI = {
  VERIFIED: { label: 'Verified', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700', Icon: XCircle },
  PENDING: { label: 'Pending verification', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
};

const field = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#F7941D]';

const PickupAddressSection = () => {
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState({ hasPickupAddress: false, status: 'PENDING', updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await shippingService.getMyPickupAddress();
        if (!alive) return;
        const a = res.pickupAddress;
        // Prefill from registered store details only as an unsaved suggestion
        const base = a || res.suggestion || {};
        setForm({ ...EMPTY, ...base, latitude: a?.latitude ?? '', longitude: a?.longitude ?? '' });
        setMeta({ hasPickupAddress: res.hasPickupAddress, status: res.pickupAddressStatus, updatedAt: res.pickupAddressUpdatedAt });
      } catch (e) {
        if (alive) setMsg({ type: 'error', text: e?.response?.data?.message || 'Could not load pickup address' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setMsg({ type: '', text: '' });
    setSaving(true);
    try {
      const res = await shippingService.saveMyPickupAddress(form);
      setMeta({ hasPickupAddress: res.hasPickupAddress, status: res.pickupAddressStatus, updatedAt: res.pickupAddressUpdatedAt });
      setMsg({ type: 'success', text: res.message || 'Pickup address saved' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.message || 'Could not save pickup address' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={22} /></div>;

  const ui = STATUS_UI[meta.status] || STATUS_UI.PENDING;
  const StatusIcon = ui.Icon;
  const input = (k, label, props = {}) => (
    <div className={props.wrap || ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input type="text" value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} className={field} {...props.input} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Truck size={18} className="text-[#F7941D]" /> Pickup / Dispatch Address</h3>
          <p className="text-xs text-slate-500 mt-1">Where couriers collect your standard-shipping orders. This is separate from your registered business address.</p>
        </div>
        {meta.hasPickupAddress ? (
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full w-fit ${ui.cls}`}><StatusIcon size={14} /> {ui.label}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full w-fit bg-slate-100 text-slate-600"><AlertCircle size={14} /> Not added yet</span>
        )}
      </div>

      {!meta.hasPickupAddress && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">Fields are pre-filled from your store details. Review them and press Save.</p>
      )}
      {meta.hasPickupAddress && meta.status !== 'VERIFIED' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Your address is saved and waiting for platform verification. Editing it later will require verification again.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {input('contactPerson', 'Contact person *')}
        {input('phone', 'Contact phone *', { input: { inputMode: 'numeric', maxLength: 10, placeholder: '10-digit mobile' } })}
        {input('addressLine1', 'Address line 1 *', { wrap: 'sm:col-span-2' })}
        {input('addressLine2', 'Address line 2', { wrap: 'sm:col-span-2' })}
        {input('landmark', 'Landmark')}
        {input('city', 'City *')}
        {input('state', 'State *')}
        {input('pincode', 'PIN code *', { input: { inputMode: 'numeric', maxLength: 6, placeholder: '6-digit PIN' } })}
        {input('country', 'Country', { input: { readOnly: true } })}
        {input('latitude', 'Latitude (optional)', { input: { inputMode: 'decimal' } })}
        {input('longitude', 'Longitude (optional)', { input: { inputMode: 'decimal' } })}
      </div>

      {msg.text && (
        <div role="alert" className={`text-sm rounded-lg p-3 border ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>{msg.text}</div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-[#F7941D] hover:bg-[#e0850f] text-white text-sm font-bold px-5 py-2.5 rounded-xl border-none cursor-pointer disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save pickup address
        </button>
      </div>
    </div>
  );
};

export default PickupAddressSection;
