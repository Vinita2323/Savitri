import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { SALE_TYPES, PAYMENT_METHODS } from '../constants/posConstants';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Landmark,
  Truck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const PosCheckoutModal = () => {
  const {
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    saleType,
    billSummary,
    customer,
    selectedStore,
    completeCounterSale,
    createDeliveryOrder,
  } = usePos();

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState(billSummary.grandTotal);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Quick Commerce (15-25 mins)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isCheckoutModalOpen) {
      setAmountReceived(billSummary.grandTotal);
      setReferenceNumber('');
      setErrorMsg('');
      setIsSubmitting(false);
      if (saleType === SALE_TYPES.DELIVERY_ORDER && paymentMethod === 'CASH') {
        // Default to COD or UPI for delivery orders
        setPaymentMethod('COD');
      } else if (saleType === SALE_TYPES.COUNTER_SALE && paymentMethod === 'COD') {
        setPaymentMethod('CASH');
      }
    }
  }, [isCheckoutModalOpen, billSummary.grandTotal, saleType]);

  if (!isCheckoutModalOpen) return null;

  const total = billSummary.grandTotal;
  const receivedNum = Number(amountReceived) || 0;
  const changeToReturn = Math.max(0, receivedNum - total);
  const balanceDue = Math.max(0, total - receivedNum);

  const paymentStatus =
    paymentMethod === 'COD'
      ? 'PENDING'
      : receivedNum >= total
      ? 'PAID'
      : receivedNum > 0
      ? 'PARTIAL'
      : 'PENDING';

  const handleQuickCash = (amt) => {
    setAmountReceived(amt);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (saleType === SALE_TYPES.DELIVERY_ORDER && !customer.shippingAddress?.addressLine1) {
      setErrorMsg('Delivery address is required for Delivery Orders.');
      return;
    }

    if (paymentMethod === 'CASH' && receivedNum < total) {
      if (!window.confirm(`Amount received (₹${receivedNum}) is less than total bill (₹${total}). Record as Partial Payment with balance ₹${balanceDue}?`)) {
        return;
      }
    }

    setIsSubmitting(true);

    const paymentPayload = {
      method: paymentMethod,
      status: paymentStatus,
      amountReceived: paymentMethod === 'COD' ? 0 : receivedNum,
      balanceDue: paymentMethod === 'COD' ? total : balanceDue,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim(),
    };

    try {
      if (saleType === SALE_TYPES.COUNTER_SALE) {
        const res = await completeCounterSale(paymentPayload);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to complete counter sale.');
        }
      } else {
        const res = await createDeliveryOrder(paymentPayload, deliverySlot);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create delivery order.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {saleType === SALE_TYPES.COUNTER_SALE ? 'Complete Counter Sale' : 'Finalize Delivery Order'}
            </h3>
            <p className="text-xs text-gray-500">
              Store: <strong className="text-gray-700">{selectedStore?.storeName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCheckoutModalOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Bill Summary Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                Total Amount Payable
              </span>
              <span className="text-2xl font-extrabold text-emerald-900 tracking-tight">
                ₹{total.toFixed(2)}
              </span>
            </div>
            <div className="text-right text-xs text-emerald-700">
              <div>{billSummary.itemsCount} Items in Bill</div>
              <div className="text-[11px] opacity-80">Incl. GST & Discounts</div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Delivery Order Specific: Address & Slot */}
          {saleType === SALE_TYPES.DELIVERY_ORDER && (
            <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <div className="flex items-start gap-2 text-xs text-indigo-950">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold">
                    Deliver To: {customer.name} ({customer.phone})
                  </div>
                  <div className="text-[11px] text-indigo-800 truncate">
                    {customer.shippingAddress?.addressLine1 || 'Address not specified'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Delivery Speed / Slot
                </label>
                <select
                  value={deliverySlot}
                  onChange={(e) => setDeliverySlot(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Quick Commerce (15-25 mins)">Quick Commerce (15-25 mins)</option>
                  <option value="Standard Express (45 mins)">Standard Express (45 mins)</option>
                  <option value="Evening Slot (6:00 PM - 8:00 PM)">Evening Slot (6:00 PM - 8:00 PM)</option>
                  <option value="Next Morning (8:00 AM - 10:00 AM)">Next Morning (8:00 AM - 10:00 AM)</option>
                </select>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-2">Select Payment Mode</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm.id);
                      if (pm.id === 'COD') setAmountReceived(0);
                      else setAmountReceived(total);
                    }}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-2xs ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    {pm.id === 'CASH' && <Banknote className="w-4 h-4" />}
                    {pm.id === 'UPI' && <QrCode className="w-4 h-4" />}
                    {pm.id === 'CARD' && <CreditCard className="w-4 h-4" />}
                    {pm.id === 'NETBANKING' && <Landmark className="w-4 h-4" />}
                    {pm.id === 'COD' && <Truck className="w-4 h-4" />}
                    <span className="text-[11px] leading-tight">{pm.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Payment Mode Details */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-gray-800">Cash Received (₹)</label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(total)}
                    className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                  >
                    Exact (₹{total})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(500)}
                    className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                  >
                    ₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCash(1000)}
                    className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                  >
                    ₹1000
                  </button>
                </div>
              </div>

              <input
                type="number"
                step="any"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full text-base font-bold px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                autoFocus
              />

              {/* Change / Balance calculation */}
              <div className="flex items-center justify-between pt-1 text-xs">
                {receivedNum >= total ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Change to Return: ₹{changeToReturn.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Balance Due: ₹{balanceDue.toFixed(2)}
                  </span>
                )}
                <span className="text-[11px] font-medium text-gray-500">Status: {paymentStatus}</span>
              </div>
            </div>
          )}

          {paymentMethod === 'UPI' && (
            <div className="space-y-2 bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">Scan Store UPI QR Code</span>
                <span className="text-[11px] font-mono text-blue-700">shippnex@icici</span>
              </div>
              <div>
                <label className="text-gray-700 font-medium block mb-1">
                  UPI Transaction ID / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423984719283"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {(paymentMethod === 'CARD' || paymentMethod === 'NETBANKING') && (
            <div className="space-y-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 text-xs">
              <label className="font-bold text-indigo-900 block">
                Card Approval Code / Transaction Ref
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-894124"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none"
              />
            </div>
          )}

          {paymentMethod === 'COD' && (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
              <p className="font-semibold">Cash on Delivery (Pending Collection)</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The delivery captain will collect ₹{total.toFixed(2)} upon doorstep delivery.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCheckoutModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Back to POS
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>
                    {saleType === SALE_TYPES.COUNTER_SALE
                      ? 'Print Receipt & Complete'
                      : 'Confirm & Place Order'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PosCheckoutModal;
