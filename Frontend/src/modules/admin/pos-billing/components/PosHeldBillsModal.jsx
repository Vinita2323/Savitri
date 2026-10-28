import React from 'react';
import { usePos } from '../context/PosContext';
import { X, Play, Trash2, Clock, User, Store, ShoppingBag } from 'lucide-react';

export const PosHeldBillsModal = () => {
  const {
    isHeldBillsModalOpen,
    setIsHeldBillsModalOpen,
    heldBills,
    resumeHeldBill,
    deleteHeldBill,
  } = usePos();

  if (!isHeldBillsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Held Bills Queue</h3>
            <p className="text-xs text-gray-500">
              Temporarily suspended sales and drafts waiting for completion
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsHeldBillsModalOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {heldBills.length > 0 ? (
            heldBills.map((bill) => (
              <div
                key={bill._id || bill.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-amber-300 p-4 transition-all shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {bill.heldLabel || 'Held Bill'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {bill.saleType === 'DELIVERY_ORDER' ? 'Delivery Order' : 'Counter Sale'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {bill.customer?.name || 'Walk-in Customer'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-gray-400" />
                      {bill.store?.storeName || 'Indore Hub'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(bill.heldAt || bill.updatedAt || Date.now()).toLocaleTimeString(
                        'en-IN',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs pt-1">
                    <span className="text-gray-500">
                      Items: <strong className="text-gray-800">{bill.items?.length || 0}</strong>
                    </span>
                    <span className="text-emerald-700 font-extrabold text-sm">
                      ₹{Number(bill.grandTotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this held bill?')) {
                        deleteHeldBill(bill._id || bill.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Held Bill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resumeHeldBill(bill._id || bill.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume Bill</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-gray-800">No Held Bills</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                You can put active customer bills on hold anytime from the POS terminal to serve
                walk-in customers quickly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PosHeldBillsModal;
