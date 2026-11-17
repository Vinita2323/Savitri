import { useEffect, useState } from 'react';
import { Truck, Zap, AlertCircle } from 'lucide-react';
import { fulfillmentService } from '../../../services/authService';

/**
 * Shows how each seller's items will be delivered (instant captain delivery or standard courier).
 * Only appears when a cart has courier-delivered items or items that cannot be delivered; a normal all-instant cart
 * keeps the existing checkout unchanged. The server re-validates everything on placeOrder.
 */
const DeliveryMethodsCard = ({ lat, lng, cartKey, onChange }) => {
  const [data, setData] = useState(null);
  const [choice, setChoice] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fulfillmentService.getOptions({ lat, lng });
        if (!alive || !res?.success) return;
        setData(res);
        setChoice({});
        onChange?.({}, res);
      } catch (e) { if (alive) setData(null); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, cartKey]);

  if (!data || !Array.isArray(data.sellers)) return null;
  const relevant = data.sellers.some((s) => s.standardEligible || !s.deliverable);
  if (!relevant) return null;

  const pick = (sellerKey, method) => {
    const next = { ...choice, [sellerKey]: method };
    setChoice(next);
    onChange?.(next, data);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <h3 className="text-sm font-black text-slate-900 m-0 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2"><Truck size={16} className="text-[#F7941D]" /> Delivery Method</h3>
      <div className="space-y-3">
        {data.sellers.map((s) => {
          const current = choice[s.sellerKey] || s.selectedMethod;
          return (
            <div key={s.sellerKey} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-bold text-slate-700 m-0 mb-1.5">{s.sellerName}</p>
              {!s.deliverable ? (
                <p className="text-xs text-rose-600 m-0 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-0.5" />{s.rejectionReasons?.[0]?.message || 'These items cannot be delivered to your location.'}</p>
              ) : s.eligibleMethods.length > 1 ? (
                <div className="space-y-1.5">
                  {s.eligibleMethods.map((m) => (
                    <label key={m} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input type="radio" name={`dm-${s.sellerKey}`} checked={current === m} onChange={() => pick(s.sellerKey, m)} className="mt-0.5 accent-[#F7941D]" />
                      <span><span className="font-semibold">{m === 'INSTANT' ? 'Instant delivery' : 'Standard delivery (courier)'}</span></span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-700 m-0 flex items-center gap-1.5">
                  {current === 'INSTANT' ? <Zap size={14} className="text-[#F7941D]" /> : <Truck size={14} className="text-slate-500" />}
                  <span className="font-semibold">{current === 'INSTANT' ? 'Instant delivery' : 'Standard delivery (courier)'}</span>
                </p>
              )}
              {s.deliverable && current === 'STANDARD' && (
                <p className="text-[11px] text-slate-500 m-0 mt-1.5">Courier availability for your PIN code is confirmed after the order is placed. Delivery time depends on the courier.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveryMethodsCard;
