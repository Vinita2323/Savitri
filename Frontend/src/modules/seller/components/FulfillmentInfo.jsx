import { Truck, Zap, Warehouse } from 'lucide-react';
import CourierPanel from './CourierPanel';

const STATUS_LABEL = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PROCESSING: 'Processing', PACKED: 'Packed', READY_FOR_DISPATCH: 'Ready for dispatch',
  IN_TRANSIT: 'In transit', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', FAILED: 'Failed',
  RETURN_REQUESTED: 'Return requested', RETURNED: 'Returned',
};

/** Small method badge for the orders table. Orders created before fulfilments existed show nothing. */
export const FulfillmentBadge = ({ fulfillment }) => {
  if (!fulfillment) return null;
  const standard = fulfillment.fulfillmentType === 'STANDARD';
  return (
    <span className={`ml-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-sans ${standard ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-[#c2610c]'}`}>
      {standard ? <Truck size={10} /> : <Zap size={10} />}{standard ? 'Courier' : 'Instant'}
    </span>
  );
};

/** Fulfilment details for the order drawer: method, status, what happens next, and the pickup address for courier orders. */
export const FulfillmentPanel = ({ fulfillment, role = 'seller' }) => {
  if (!fulfillment) return null;
  const standard = fulfillment.fulfillmentType === 'STANDARD';
  const a = fulfillment.pickupAddressSnapshot;
  return (
    <>
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-2">
          {standard ? <Truck size={16} className="text-sky-600" /> : <Zap size={16} className="text-[#ff7526]" />}
          <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">Fulfilment</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600">{STATUS_LABEL[fulfillment.fulfillmentStatus] || fulfillment.fulfillmentStatus}</span>
      </div>
      <p className="m-0 text-xs font-semibold text-slate-900">{standard ? 'Standard delivery (courier)' : 'Instant delivery (local captain)'}</p>
      <p className="m-0 text-xs text-slate-500">
        {standard
          ? 'Accept and pack this order, then create the courier shipment below.'
          : 'A delivery captain will be assigned when you mark the order as packed.'}
      </p>
      {standard && (
        <div className="text-xs text-slate-700 pt-1">
          <p className="m-0 flex items-center gap-1.5 font-bold text-slate-700"><Warehouse size={13} /> Pickup address</p>
          {a ? (
            <>
              <p className="m-0">{a.contactPerson} · {a.phone}</p>
              <p className="m-0">{[a.addressLine1, a.addressLine2, a.landmark].filter(Boolean).join(', ')}</p>
              <p className="m-0">{a.city}, {a.state} {a.pincode}</p>
              {!fulfillment.dispatchReady && <p className="m-0 mt-1 text-amber-700">Pickup address is not verified yet ({fulfillment.pickupAddressStatus || 'PENDING'}).</p>}
            </>
          ) : <p className="m-0 text-rose-600">No pickup address recorded.</p>}
        </div>
      )}
    </div>
    {standard && fulfillment._id && fulfillment.fulfillmentStatus !== 'CANCELLED' && <div className="mt-3"><CourierPanel fulfillmentId={fulfillment._id} role={role} /></div>}
    </>
  );
};
