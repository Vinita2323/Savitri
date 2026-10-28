import React from 'react';
import { PosProvider, usePos } from '../context/PosContext';
import { PosHeader } from '../components/PosHeader';
import { PosProductGrid } from '../components/PosProductGrid';
import { PosCart } from '../components/PosCart';
import { PosCheckoutModal } from '../components/PosCheckoutModal';
import { PosReceiptModal } from '../components/PosReceiptModal';
import { PosHeldBillsModal } from '../components/PosHeldBillsModal';
import { PosCustomerModal } from '../components/PosCustomerModal';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const PosBillingContent = () => {
  const { alertMessage } = usePos();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden relative">
      {/* Toast Alert Notification */}
      {alertMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg border flex items-center gap-2 ${
              alertMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : alertMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : alertMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {alertMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            {alertMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
            {alertMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {alertMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
            <span>{alertMessage.text}</span>
          </div>
        </div>
      )}

      {/* POS Top Navigation Header */}
      <PosHeader />

      {/* Primary POS Split Layout: Products Grid (Left) + Cart & Bill (Right) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <PosProductGrid />
        <PosCart />
      </div>

      {/* Interactive Modals */}
      <PosCheckoutModal />
      <PosReceiptModal />
      <PosHeldBillsModal />
      <PosCustomerModal />
    </div>
  );
};

export const PosBillingPage = () => {
  return (
    <PosProvider>
      <PosBillingContent />
    </PosProvider>
  );
};

export default PosBillingPage;
