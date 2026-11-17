import { useCallback, useEffect, useState } from 'react';
import { Package, Truck, Loader2, FileText, CalendarClock, FlaskConical, AlertCircle } from 'lucide-react';
import { courierService } from '../../../services/authService';

const READY = ['PACKED', 'READY_FOR_DISPATCH'];
const SHIPMENT_LABEL = {
  NOT_CREATED: 'No shipment yet', CREATING: 'Creating…', CREATED: 'Shipment created', PICKUP_SCHEDULED: 'Pickup scheduled', PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', FAILED_DELIVERY: 'Delivery attempt failed',
  RTO_INITIATED: 'Return to origin started', RTO_IN_TRANSIT: 'Returning to origin', RTO_DELIVERED: 'Returned to origin', CANCELLED: 'Cancelled',
};
// same transitions the server enforces (the server remains the authority)
const NEXT_STATUS = { CREATED: ['PICKUP_SCHEDULED', 'PICKED_UP'], PICKUP_SCHEDULED: ['PICKED_UP'], PICKED_UP: ['IN_TRANSIT'], IN_TRANSIT: ['OUT_FOR_DELIVERY', 'RTO_INITIATED'], OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'], FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RTO_INITIATED'], RTO_INITIATED: ['RTO_IN_TRANSIT'], RTO_IN_TRANSIT: ['RTO_DELIVERED'] };
const inr = (n) => (n == null ? '—' : `₹${Number(n).toFixed(2)}`);
const errText = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
const box = 'bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3';
const btn = 'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const SimulatedBadge = ({ text = 'MOCK / SIMULATED' }) => (
  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300"><FlaskConical size={11} />{text}</span>
);

/**
 * Courier details for one STANDARD fulfilment: serviceability, courier options + charges, package confirmation,
 * shipment, AWB, label placeholder, pickup and tracking history. Works for the seller and for admins (role).
 * Simulated (mock) data is always labelled, and tracking from a simulated shipment is hidden unless the server
 * itself reports the mock courier as active (it never is in production).
 */
export default function CourierPanel({ fulfillmentId, role = 'seller' }) {
  const [f, setF] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [options, setOptions] = useState(null);
  const [courierId, setCourierId] = useState('');
  const [pkg, setPkg] = useState({ weightKg: '', length: '', breadth: '', height: '' });
  const [editPkg, setEditPkg] = useState(false);

  const apply = useCallback((res) => {
    if (res?.fulfillment) setF(res.fulfillment);
    if (res?.courier) setCfg(res.courier);
  }, []);

  const load = useCallback(async () => {
    try { apply(await courierService.get(fulfillmentId)); } catch (e) { setError(errText(e)); }
  }, [fulfillmentId, apply]);
  useEffect(() => { setF(null); setOptions(null); setError(''); load(); }, [load]);

  useEffect(() => {
    if (!f) return;
    const p = f.parcel?.weightKg ? f.parcel : null;
    if (p) setPkg({ weightKg: p.weightKg, length: p.length, breadth: p.breadth, height: p.height });
  }, [f?.parcel?.weightKg, f?.parcel?.length, f?.parcel?.breadth, f?.parcel?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (name, fn) => {
    setBusy(name); setError('');
    try { return await fn(); } catch (e) { setError(errText(e)); return null; } finally { setBusy(''); }
  };

  if (!f && !error) return <div className={box}><Loader2 size={16} className="animate-spin text-slate-400" /></div>;
  if (!f) return <div className={box}><p className="m-0 text-xs text-rose-600">{error}</p></div>;

  const simulated = Boolean(f.shipmentReference?.simulated || cfg?.simulated);
  const shipStatus = f.shipment?.status || 'NOT_CREATED';
  const hasShipment = !!f.shipmentReference?.awb;
  const available = cfg?.available !== false;
  const showTracking = !f.shipmentReference?.simulated || cfg?.simulated === true;
  const events = showTracking ? (f.shipment?.events || []) : [];
  const ready = READY.includes(f.fulfillmentStatus);
  const itemsPkg = (() => {
    const it = f.items || [];
    if (!it.length || it.some((i) => !(i.weightKg > 0 && i.length > 0 && i.breadth > 0 && i.height > 0))) return null;
    return { weightKg: it.reduce((s, i) => s + i.weightKg * i.quantity, 0), length: Math.max(...it.map((i) => i.length)), breadth: Math.max(...it.map((i) => i.breadth)), height: it.reduce((s, i) => s + i.height * i.quantity, 0) };
  })();
  const shownPkg = f.parcel?.weightKg ? f.parcel : itemsPkg;

  const savePkg = () => run('pkg', async () => { const res = await courierService.confirmPackage(f._id, pkg); apply(res); setEditPkg(false); setOptions(null); });
  const quote = () => run('quote', async () => { const res = await courierService.quote(f._id); apply(res); setOptions(res); setCourierId(res.cheapest?.courierId || ''); });
  const create = () => run('ship', async () => { apply(await courierService.createShipment(f._id, courierId || undefined)); setOptions(null); });
  const pickup = () => run('pickup', async () => apply(await courierService.schedulePickup(f._id)));
  const label = () => run('label', async () => {
    const res = await courierService.label(f._id);
    if (res.labelUrl) { window.open(res.labelUrl, '_blank', 'noopener'); return; }
    const url = URL.createObjectURL(new Blob([res.labelText || ''], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `label-${f.shipmentReference.awb}.txt`; a.click(); URL.revokeObjectURL(url);
  });
  const simulate = (status) => run(`sim-${status}`, async () => apply(await courierService.simulate(f._id, status)));
  const field = (k, label) => (
    <label className="text-[11px] font-semibold text-slate-600">{label}
      <input inputMode="decimal" value={pkg[k]} onChange={(e) => setPkg({ ...pkg, [k]: e.target.value })} className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
    </label>
  );

  return (
    <div className={box} data-testid="courier-panel">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-2"><Truck size={16} className="text-sky-600" /><span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">Courier shipment</span></div>
        <div className="flex items-center gap-1.5">{simulated && <SimulatedBadge />}<span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600">{SHIPMENT_LABEL[shipStatus] || shipStatus}</span></div>
      </div>

      {!available && (
        <p className="m-0 text-xs text-slate-600 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-0.5 text-slate-400" />Courier shipping is not available right now{cfg?.reason ? `: ${cfg.reason}` : '.'} Your order stays ready for dispatch.</p>
      )}
      {error && <p role="alert" className="m-0 text-xs text-rose-600 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-0.5" />{error}</p>}

      {available && !hasShipment && (
        <>
          <div className="space-y-1.5">
            <p className="m-0 text-xs font-bold text-slate-700 flex items-center gap-1.5"><Package size={13} /> Package</p>
            {!editPkg ? (
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-xs text-slate-600">{shownPkg ? `${shownPkg.weightKg} kg · ${shownPkg.length}×${shownPkg.breadth}×${shownPkg.height} cm${f.parcel?.source ? ` (confirmed by ${f.parcel.source.toLowerCase()})` : ' (from product details)'}` : 'Weight and size are missing — enter them to continue.'}</p>
                <button type="button" onClick={() => setEditPkg(true)} className={`${btn} bg-white text-slate-700 border border-slate-200`}>{shownPkg ? 'Edit' : 'Enter'}</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{field('weightKg', 'Weight (kg)')}{field('length', 'Length (cm)')}{field('breadth', 'Breadth (cm)')}{field('height', 'Height (cm)')}</div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === 'pkg'} onClick={savePkg} className={`${btn} bg-[#F7941D] text-white`}>{busy === 'pkg' && <Loader2 size={12} className="animate-spin" />}Confirm package</button>
                  <button type="button" onClick={() => setEditPkg(false)} className={`${btn} bg-white text-slate-600 border border-slate-200`}>Cancel</button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <button type="button" disabled={!!busy || !shownPkg} onClick={quote} className={`${btn} bg-white text-sky-700 border border-sky-200`}>{busy === 'quote' && <Loader2 size={12} className="animate-spin" />}Check courier options</button>
            {options && (options.serviceable ? (
              <div className="space-y-1.5">
                <p className="m-0 text-[11px] text-slate-500">Chargeable weight {options.chargeableWeightKg} kg{options.simulated ? ' · test rates, not real prices' : ''}</p>
                {options.couriers.map((c) => (
                  <label key={c.courierId} className="flex items-center justify-between gap-2 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2"><input type="radio" name="courier" checked={courierId === c.courierId} onChange={() => setCourierId(c.courierId)} className="accent-[#F7941D]" /><span className="font-semibold text-slate-800">{c.courierName}</span></span>
                    <span className="text-slate-600">{inr(c.estimatedCharge)} · {c.etaDaysMin}–{c.etaDaysMax} days</span>
                  </label>
                ))}
              </div>
            ) : <p className="m-0 text-xs text-rose-600 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-0.5" />Not serviceable: {options.rejectionReason}</p>)}
            <button type="button" disabled={!!busy || !ready || !shownPkg} onClick={create} className={`${btn} bg-[#F7941D] text-white`} title={ready ? '' : 'Mark the order as packed first'}>{busy === 'ship' && <Loader2 size={12} className="animate-spin" />}Create shipment</button>
            {!ready && <p className="m-0 text-[11px] text-slate-500">Mark the order as packed to create the shipment.</p>}
          </div>
        </>
      )}

      {hasShipment && (
        <div className="space-y-2">
          <div className="text-xs text-slate-700 space-y-0.5">
            <p className="m-0"><span className="text-slate-500">Courier:</span> <span className="font-semibold">{f.shipmentReference.courierName || '—'}</span></p>
            <p className="m-0"><span className="text-slate-500">AWB:</span> <span className="font-mono font-semibold">{f.shipmentReference.awb}</span>{simulated && ' (simulated)'}</p>
            {f.shipment?.quote?.charge != null && <p className="m-0"><span className="text-slate-500">Shipping charge:</span> {inr(f.shipment.quote.charge)}{f.shipment.quote.simulated ? ' (test rate)' : ''}</p>}
            {f.shipment?.pickup?.scheduledAt && <p className="m-0"><span className="text-slate-500">Pickup:</span> {new Date(f.shipment.pickup.scheduledAt).toLocaleString()}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {available && <button type="button" disabled={!!busy} onClick={label} className={`${btn} bg-white text-slate-700 border border-slate-200`}>{busy === 'label' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}Download label{simulated ? ' (test)' : ''}</button>}
            {available && shipStatus === 'CREATED' && <button type="button" disabled={!!busy} onClick={pickup} className={`${btn} bg-white text-sky-700 border border-sky-200`}>{busy === 'pickup' ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />}Schedule pickup</button>}
          </div>
          {f.shipment?.rto?.status && (
            <p className="m-0 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">Return to origin: {f.shipment.rto.status.toLowerCase().replace('_', ' ')}{f.shipment.rto.reason ? ` — ${f.shipment.rto.reason}` : ''}{f.shipment.rto.returnShipmentRef ? ` (ref ${f.shipment.rto.returnShipmentRef})` : ''}</p>
          )}
        </div>
      )}

      {events.length > 0 && (
        <div>
          <p className="m-0 mb-1 text-xs font-bold text-slate-700 flex items-center gap-2">Tracking history {f.shipmentReference?.simulated && <SimulatedBadge text="SIMULATED TRACKING" />}</p>
          <ol className="m-0 p-0 list-none space-y-1">
            {[...events].reverse().map((e, i) => (
              <li key={`${e.status}-${i}`} className="text-[11px] text-slate-600 flex gap-2"><span className="text-slate-400 shrink-0">{new Date(e.at).toLocaleString()}</span><span>{e.description || e.status}</span></li>
            ))}
          </ol>
        </div>
      )}

      {role === 'admin' && cfg?.simulated && cfg?.available && f.shipmentReference?.simulated && NEXT_STATUS[shipStatus] &&  (
        <div className="pt-2 border-t border-dashed border-amber-300 space-y-1.5">
          <p className="m-0 text-[11px] font-bold text-amber-800">Development only: simulate courier event</p>
          <div className="flex flex-wrap gap-1.5">
            {NEXT_STATUS[shipStatus].map((s) => <button key={s} type="button" disabled={!!busy} onClick={() => simulate(s)} className={`${btn} bg-amber-50 text-amber-900 border border-amber-300`}>{busy === `sim-${s}` && <Loader2 size={12} className="animate-spin" />}{SHIPMENT_LABEL[s] || s}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}
