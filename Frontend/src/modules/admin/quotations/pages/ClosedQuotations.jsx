import React, { useState, useMemo } from 'react';
import {
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  Copy,
  Building2,
  Calendar,
  RotateCcw,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import { formatINR } from '../utils/quotationCalculations';
import { QuotationStatusChip } from '../components/QuotationStatusChip';
import { QuotationPreviewModal } from '../components/QuotationPreviewModal';

export const ClosedQuotations = ({ onNavigate }) => {
  const { quotations, setSelectedQuotationId, duplicateQuotation } = useQuotations();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, Rejected, Expired
  const [previewQuote, setPreviewQuote] = useState(null);

  const closedQuotations = useMemo(() => {
    return quotations
      .filter((q) => q.status === 'Rejected' || q.status === 'Expired')
      .filter((q) => {
        if (filterType !== 'ALL' && q.status !== filterType) return false;
        if (!search.trim()) return true;
        const query = search.toLowerCase().trim();
        return (
          q.quotationNumber?.toLowerCase().includes(query) ||
          q.buyer?.organizationName?.toLowerCase().includes(query) ||
          q.rejectionReason?.toLowerCase().includes(query)
        );
      });
  }, [quotations, search, filterType]);

  const handleDuplicate = (id) => {
    const dup = duplicateQuotation(id);
    if (dup) {
      alert(`Created fresh new Draft from closed bid: ${dup.quotationNumber}`);
      onNavigate('quotations');
    }
  };

  const handleView = (q) => {
    setSelectedQuotationId(q.id);
    onNavigate('quotations/details');
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-600 text-white">
              <XCircle size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Closed & Expired Quotations
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Archival repository of rejected bids, expired validity terms, and unfulfilled inquiries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('quotations/create')}
            className="px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer border-none shadow-2xs"
          >
            Create New Quotation
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation number, buyer name, or rejection reason..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-[#F7941D]"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'Rejected', 'Expired'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterType === type
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {type === 'ALL' ? 'All Closed (Rejected & Expired)' : type}
            </button>
          ))}
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
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Closed Date / Expiry</th>
                <th className="py-4 px-4 min-w-[220px]">Closing Reason / Remarks</th>
                <th className="py-4 px-4 text-right">Amount</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {closedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No closed or expired quotations found.</p>
                  </td>
                </tr>
              ) : (
                closedQuotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Quotation Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
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
                        {quote.buyer?.contactPerson}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {quote.quotationType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <QuotationStatusChip status={quote.status} size="sm" />
                    </td>

                    {/* Closed Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {quote.validUntil}
                    </td>

                    {/* Remarks / Reason */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-600">
                      {quote.rejectionReason ? (
                        <span className="text-rose-700 font-medium">
                          {quote.rejectionReason}
                        </span>
                      ) : quote.status === 'Expired' ? (
                        <span className="text-orange-700 font-medium">
                          Validity term elapsed (30 days expired)
                        </span>
                      ) : (
                        quote.internalNotes || 'Closed'
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(quote.summary?.grandTotal || 0)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewQuote(quote)}
                          title="Preview Document"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border-none bg-transparent"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(quote.id)}
                          title="Re-open as Fresh Draft"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          <RefreshCw size={12} className="text-[#F7941D]" />
                          <span>Re-quote</span>
                        </button>
                      </div>
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
