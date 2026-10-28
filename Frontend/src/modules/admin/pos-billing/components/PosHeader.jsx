import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePos } from '../context/PosContext';
import { SALE_TYPES } from '../constants/posConstants';
import {
  Store,
  PauseCircle,
  History,
  ScanBarcode,
  ShoppingBag,
  Truck,
  User,
  ChevronDown,
} from 'lucide-react';

export const PosHeader = () => {
  const navigate = useNavigate();
  const {
    stores,
    selectedStore,
    setSelectedStore,
    saleType,
    setSaleType,
    heldBills,
    setIsHeldBillsModalOpen,
    setIsCustomerModalOpen,
    customer,
  } = usePos();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Left: Brand / Title & Store Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none flex items-center gap-2">
              POS Billing
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Terminal
              </span>
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Quick Commerce & Walk-in Sales</p>
          </div>
        </div>

        {/* Store Location Selector */}
        <div className="relative ml-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors">
            <Store className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <select
              value={selectedStore?.id || ''}
              onChange={(e) => {
                const found = stores.find((s) => s.id === e.target.value);
                if (found) setSelectedStore(found);
              }}
              className="bg-transparent border-none text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer pr-4"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.storeName} ({s.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Center: Sale Type Segmented Switcher */}
      <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
        <button
          type="button"
          onClick={() => setSaleType(SALE_TYPES.COUNTER_SALE)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            saleType === SALE_TYPES.COUNTER_SALE
              ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Counter Sale (Walk-in)</span>
        </button>

        <button
          type="button"
          onClick={() => setSaleType(SALE_TYPES.DELIVERY_ORDER)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            saleType === SALE_TYPES.DELIVERY_ORDER
              ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Delivery Order (Fulfillment)</span>
        </button>
      </div>

      {/* Right: Customer Info, Held Bills, History */}
      <div className="flex items-center gap-2">
        {/* Customer Badge */}
        <button
          type="button"
          onClick={() => setIsCustomerModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          title="Change Customer Details"
        >
          <User className="w-3.5 h-3.5 text-gray-500" />
          <span className="max-w-[120px] truncate font-semibold">
            {customer.name || 'Walk-in Customer'}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {/* Held Bills Counter */}
        <button
          type="button"
          onClick={() => setIsHeldBillsModalOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-semibold">Held Bills</span>
          {heldBills.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-bold">
              {heldBills.length}
            </span>
          )}
        </button>

        {/* History Button */}
        <button
          type="button"
          onClick={() => navigate('/super-admin/pos-billing/history')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <History className="w-3.5 h-3.5 text-gray-500" />
          <span>Sales History</span>
        </button>
      </div>
    </header>
  );
};

export default PosHeader;
