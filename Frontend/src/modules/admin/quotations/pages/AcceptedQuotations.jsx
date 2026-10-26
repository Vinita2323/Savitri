import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  FileCheck2,
  Search,
  Eye,
  Printer,
  ShoppingBag,
  Building2,
  Calendar,
  AlertCircle,
  X,
  CheckCircle,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import { formatINR } from '../utils/quotationCalculations';
import { QuotationStatusChip } from '../components/QuotationStatusChip';
import { QuotationPreviewModal } from '../components/QuotationPreviewModal';

export const AcceptedQuotations = ({ onNavigate }) => {
  const { quotations, setSelectedQuotationId, convertToOrder } = useQuotations();

  const [search, setSearch] = useState('');
  const [previewQuote, setPreviewQuote] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const acceptedQuotations = useMemo(() => {
    return quotations
      .filter((q) => q.status === 'Accepted' || q.status === 'Converted to Order')
      .filter((q) => {
        if (!search.trim()) return true;
        const query = search.toLowerCase().trim();
        return (
          q.quotationNumber?.toLowerCase().includes(query) ||
          q.buyer?.organizationName?.toLowerCase().includes(query) ||
          q.buyer?.contactPerson?.toLowerCase().includes(query) ||
          q.convertedOrderId?.toLowerCase().includes(query)
        );
      });
  }, [quotations, search]);

  const totalValue = acceptedQuotations.reduce(
    (acc, q) => acc + (q.summary?.grandTotal || 0),
    0
  );

  const handleConvertToOrder = (q) => {
    if (q.convertedOrderId) {
      showToast(`Quotation already converted to Order ${q.convertedOrderId}.`);
      return;
    }
    const orderId = convertToOrder(q.id);
    showToast(`Success! Quotation ${q.quotationNumber} converted to Purchase Order: ${orderId}`);
  };

  const handleView = (q) => {
    setSelectedQuotationId(q.id);
    onNavigate('quotations/details');
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage('')}
            className="text-slate-400 hover:text-white border-none bg-transparent cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Accepted Quotations & Order Conversion
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Client-approved bids ready for warehouse fulfillment and formal purchase order generation
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Total Accepted Value
          </span>
          <span className="text-lg font-black font-mono text-emerald-950">
            {formatINR(totalValue)}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation number, buyer organization, or generated order ID..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-[#F7941D]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-4 px-4">Quotation #</th>
                <th className="py-4 px-4 min-w-[200px]">Buyer Organization</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Acceptance Date</th>
                <th className="py-4 px-4 text-right">Total Amount</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Purchase Order #</th>
                <th className="py-4 px-4 text-right">Order Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {acceptedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No accepted quotations found.</p>
                  </td>
                </tr>
              ) : (
                acceptedQuotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Quotation Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1A2E0A]">
                      <button
                        type="button"
                        onClick={() => handleView(quote)}
                        className="hover:text-[#F7941D] hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        {quote.quotationNumber}
                      </button>
                    </td>

                    {/* Buyer Organization */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[220px]">
                        {quote.buyer?.organizationName}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                        {quote.buyer?.contactPerson} ({quote.buyer?.email})
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {quote.quotationType}
                      </span>
                    </td>

                    {/* Acceptance Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {quote.acceptedAt
                        ? new Date(quote.acceptedAt).toLocaleDateString('en-IN')
                        : quote.quotationDate}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(quote.summary?.grandTotal || 0)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <QuotationStatusChip status={quote.status} size="sm" />
                    </td>

                    {/* Order ID */}
                    <td className="py-3.5 px-4">
                      {quote.convertedOrderId ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                          <ShoppingBag size={12} />
                          <span>{quote.convertedOrderId}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pending Conversion</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {quote.convertedOrderId ? (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed border border-slate-200"
                        >
                          Order Converted
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConvertToOrder(quote)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer border-none shadow-2xs"
                        >
                          <FileCheck2 size={13} className="text-[#F7941D]" />
                          <span>Convert to Order</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewQuote && (
        <QuotationPreviewModal
          quotation={previewQuote}
          isOpen={!!previewQuote}
          onClose={() => setPreviewQuote(null)}
        />
      )}
    </div>
  );
};
