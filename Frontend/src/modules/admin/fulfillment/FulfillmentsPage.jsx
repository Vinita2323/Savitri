import { Fragment, useCallback, useEffect, useState } from 'react';
import { Truck, Zap } from 'lucide-react';
import { fulfillmentService } from '../../../services/authService';
import CourierPanel from '../../seller/components/CourierPanel';

const LABEL = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PROCESSING: 'Processing', PACKED: 'Packed', READY_FOR_DISPATCH: 'Ready for dispatch',
  IN_TRANSIT: 'In transit', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', FAILED: 'Failed',
  RETURN_REQUESTED: 'Return requested', RETURNED: 'Returned',
};
const addr = (a) => (a ? [a.addressLine1, a.addressLine2, a.landmark].filter(Boolean).join(', ') + `, ${a.city || ''} ${a.state || ''} ${a.pincode || ''}` : '—');

/** Admin / Super Admin: seller-level fulfilment records (scoped to the selected brand by the server). */
export default function FulfillmentsPage() {
  const [type, setType] = useState('');
  const [orderId, setOrderId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    setError('');
    return fulfillmentService.getAdminFulfillments({ type: type || undefined, orderId: q || undefined, page, limit: 25 })
      .then(setData).catch((e) => setError(e?.response?.data?.message || e.message || 'Could not load fulfilments'));
  }, [type, q, page]);
  useEffect(() => { load(); }, [load]);

  const pages = data ? Math.max(1, Math.ceil((data.total || 0) / 25)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-extrabold text-slate-900 m-0">Order Fulfilments</h1>
        <p className="text-[15px] text-slate-500 mt-1 mb-0">Each order is split per seller. Instant fulfilments are delivered by our captains; standard fulfilments are for courier dispatch.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="px-3.5 py-2.5 text-[15px] bg-white border border-slate-300 rounded-xl">
          <option value="">All methods</option><option value="INSTANT">Instant (local)</option><option value="STANDARD">Standard (courier)</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); setQ(orderId.trim()); setPage(1); }} className="flex gap-2">
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID (e.g. ORD-123456-7890)" className="px-3.5 py-2.5 text-[15px] bg-white border border-slate-300 rounded-xl w-64" />
          <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#F7941D] rounded-xl border-none cursor-pointer">Search</button>
        </form>
      </div>
      {error && <p className="text-sm text-rose-600 m-0">{error}</p>}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-semibold">Order</th><th className="px-3 py-3 font-semibold">Seller</th><th className="px-3 py-3 font-semibold">Method</th>
            <th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Delivery address</th><th className="px-3 py-3 font-semibold">Pickup address</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>}
            {data && data.fulfillments.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No fulfilments found.</td></tr>}
            {data?.fulfillments.map((f) => (
              <Fragment key={f._id}><tr className="align-top">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">{f.orderId}</td>
                <td className="px-3 py-3 text-slate-700">{f.sellerName}<span className="block text-xs text-slate-400">{(f.items || []).length} item(s)</span></td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${f.fulfillmentType === 'STANDARD' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-[#c2610c]'}`}>
                    {f.fulfillmentType === 'STANDARD' ? <Truck size={12} /> : <Zap size={12} />}{f.fulfillmentType === 'STANDARD' ? 'Standard · courier' : 'Instant · local'}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{LABEL[f.fulfillmentStatus] || f.fulfillmentStatus}{f.fulfillmentType === 'STANDARD' && <button type="button" onClick={() => setOpenId(openId === f._id ? null : f._id)} className="block mt-1 text-xs font-bold text-sky-700 bg-transparent border-none p-0 cursor-pointer underline">{openId === f._id ? 'Hide courier' : 'Courier details'}</button>}</td>
                <td className="px-3 py-3 text-xs text-slate-600 min-w-[200px]">{addr(f.deliveryAddressSnapshot)}</td>
                <td className="px-3 py-3 text-xs text-slate-600 min-w-[200px]">{f.fulfillmentType === 'STANDARD' ? <>{addr(f.pickupAddressSnapshot)}<span className="block text-slate-400">{f.pickupAddressStatus || 'PENDING'}</span></> : <span className="text-slate-400">Seller store (local captain pickup)</span>}</td>
              </tr>
              {openId === f._id && <tr><td colSpan={6} className="px-4 py-3 bg-slate-50/50"><CourierPanel fulfillmentId={f._id} role="admin" /></td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-[13px] font-semibold bg-white border border-slate-300 rounded-xl disabled:opacity-50">Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-[13px] font-semibold bg-white border border-slate-300 rounded-xl disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
