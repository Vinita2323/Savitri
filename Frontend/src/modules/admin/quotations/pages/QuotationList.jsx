import React, { useState, useMemo } from 'react';
import {
  FileText,
  PlusCircle,
  Eye,
  Edit,
  Copy,
  Send,
  Trash2,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import { formatINR } from '../utils/quotationCalculations';
import { QuotationStatusChip } from '../components/QuotationStatusChip';
import { QuotationFilters } from '../components/QuotationFilters';
import { QuotationPreviewModal } from '../components/QuotationPreviewModal';

const PAGE_SIZE = 8;

export const QuotationList = ({ onNavigate }) => {
  const {
    quotations,
    setSelectedQuotationId,
    setEditingQuotationId,
    duplicateQuotation,
    deleteQuotation,
    sendQuotation,
    acceptQuotation,
    rejectQuotation,
  } = useQuotations();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog & Modal states
  const [deleteDialogQuote, setDeleteDialogQuote] = useState(null);
  const [sendDialogQuote, setSendDialogQuote] = useState(null);
  const [previewModalQuote, setPreviewModalQuote] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setDateFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedType !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    dateFilter !== 'ALL';

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = q.quotationNumber?.toLowerCase().includes(query);
        const orgMatch = q.buyer?.organizationName?.toLowerCase().includes(query);
        const contactMatch = q.buyer?.contactPerson?.toLowerCase().includes(query);
        const refMatch = q.referenceNumber?.toLowerCase().includes(query);
        if (!numMatch && !orgMatch && !contactMatch && !refMatch) return false;
      }

      // Organization Type
      if (selectedType !== 'ALL' && q.quotationType !== selectedType) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && q.status !== selectedStatus) {
        return false;
      }

      // Date Filter
      if (dateFilter !== 'ALL') {
        const today = new Date();
        const quoteDate = new Date(q.quotationDate || q.createdAt);
        const diffDays = (today - quoteDate) / (1000 * 60 * 60 * 24);

        if (dateFilter === 'weekly' && diffDays > 7) return false;
        if (dateFilter === 'monthly' && diffDays > 30) return false;
        if (dateFilter === 'quarterly' && diffDays > 90) return false;
        if (dateFilter === 'valid_active') {
          const validDate = new Date(q.validUntil);
          if (validDate < today || q.status === 'Expired') return false;
        }
      }

      return true;
    });
  }, [quotations, searchQuery, selectedType, selectedStatus, dateFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedQuotations = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredQuotations.slice(start, start + PAGE_SIZE);
  }, [filteredQuotations, validPage]);

  // Actions
  const handleViewDetails = (q) => {
    setSelectedQuotationId(q.id);
    onNavigate('quotations/details');
  };

  const handleEditDraft = (q) => {
    setEditingQuotationId(q.id);
    onNavigate('quotations/create');
  };

  const handleOpenPreview = (q) => {
    setPreviewModalQuote(q);
  };

  const handleDuplicate = (id) => {
    const dup = duplicateQuotation(id);
    if (dup) {
      showToast(`Quotation duplicated as new Draft: ${dup.quotationNumber}`);
    }
  };

  const handleConfirmSend = () => {
    if (!sendDialogQuote) return;
    sendQuotation(sendDialogQuote.id);
    showToast(`Quotation ${sendDialogQuote.quotationNumber} dispatched to ${sendDialogQuote.buyer?.organizationName}`);
    setSendDialogQuote(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteDialogQuote) return;
    deleteQuotation(deleteDialogQuote.id);
    showToast(`Draft quotation ${deleteDialogQuote.quotationNumber} permanently deleted.`);
    setDeleteDialogQuote(null);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-bounce">
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
            <span className="p-2 rounded-xl bg-[#1A2E0A] text-[#F7941D]">
              <FileText size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                All Quotations
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Comprehensive repository of all institutional, corporate, and government price bids
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingQuotationId(null);
            onNavigate('quotations/create');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer shadow-xs border-none"
        >
          <PlusCircle size={15} className="text-[#F7941D]" />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <QuotationFilters
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        selectedType={selectedType}
        onTypeChange={(val) => {
          setSelectedType(val);
          setCurrentPage(1);
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(val) => {
          setSelectedStatus(val);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(val) => {
          setDateFilter(val);
          setCurrentPage(1);
        }}
        onReset={handleResetFilters}
        totalResults={filteredQuotations.length}
        isFiltered={isFiltered}
      />

      {/* Quotations Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-4 px-4">Quotation #</th>
                <th className="py-4 px-4 min-w-[200px]">Organization & Contact</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Quote Date</th>
                <th className="py-4 px-4">Valid Until</th>
                <th className="py-4 px-4 text-right">Total Amount</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Created By</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No quotations match your filters.</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-bold text-[#F7941D] hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedQuotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Quotation Number */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(quote)}
                        className="font-mono font-bold text-[#1A2E0A] hover:text-[#F7941D] hover:underline cursor-pointer bg-transparent border-none p-0 text-left block"
                      >
                        {quote.quotationNumber}
                      </button>
                      {quote.referenceNumber && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Ref: {quote.referenceNumber}
                        </span>
                      )}
                    </td>

                    {/* Organization Name & Contact */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[220px]">
                        {quote.buyer?.organizationName || 'N/A'}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                        Attn: {quote.buyer?.contactPerson || 'N/A'} ({quote.buyer?.designation || 'Buyer'})
                      </span>
                    </td>

                    {/* Organization Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {quote.quotationType}
                      </span>
                    </td>

                    {/* Quotation Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {quote.quotationDate}
                    </td>

                    {/* Valid Until */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-700">{quote.validUntil}</span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatINR(quote.summary?.grandTotal || 0)}
                    </td>

                    {/* Status Chip */}
                    <td className="py-3.5 px-4">
                      <QuotationStatusChip status={quote.status} size="sm" />
                    </td>

                    {/* Created By */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 truncate max-w-[140px]">
                      {quote.createdBy || 'System Admin'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Preview */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(quote)}
                          title="Preview Official Document"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Draft */}
                        {quote.status === 'Draft' && (
                          <button
                            type="button"
                            onClick={() => handleEditDraft(quote)}
                            title="Edit Draft"
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors border-none bg-transparent cursor-pointer"
                          >
                            <Edit size={15} />
                          </button>
                        )}

                        {/* Send Quotation */}
                        {quote.status === 'Draft' && (
                          <button
                            type="button"
                            onClick={() => setSendDialogQuote(quote)}
                            title="Send to Buyer"
                            className="p-1.5 rounded-lg text-[#F7941D] hover:text-[#e08316] hover:bg-amber-50 transition-colors border-none bg-transparent cursor-pointer"
                          >
                            <Send size={15} />
                          </button>
                        )}

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(quote.id)}
                          title="Duplicate Quotation"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                        >
                          <Copy size={15} />
                        </button>

                        {/* Delete Draft */}
                        {quote.status === 'Draft' && (
                          <button
                            type="button"
                            onClick={() => setDeleteDialogQuote(quote)}
                            title="Delete Draft"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border-none bg-transparent cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredQuotations.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500 gap-2">
            <span>
              Page <strong className="text-slate-800">{validPage}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong> ({filteredQuotations.length} total quotations)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog: Send Quotation */}
      {sendDialogQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Send size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold">Dispatch Quotation to Buyer?</h3>
                <p className="text-xs text-slate-500">
                  {sendDialogQuote.quotationNumber} • {sendDialogQuote.buyer?.organizationName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will update the quotation status to <strong>Sent</strong> and record the formal dispatch timestamp. A copy will be marked as ready for the client procurement desk.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSendDialogQuote(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold cursor-pointer border-none"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Draft */}
      {deleteDialogQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Draft Quotation?</h3>
                <p className="text-xs text-slate-500">{deleteDialogQuote.quotationNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this draft? This action will permanently remove the quotation from your working list.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialogQuote(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer border-none"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Document Preview Modal */}
      {previewModalQuote && (
        <QuotationPreviewModal
          quotation={previewModalQuote}
          isOpen={!!previewModalQuote}
          onClose={() => setPreviewModalQuote(null)}
          onSend={(id) => {
            sendQuotation(id);
            setPreviewModalQuote(null);
            showToast('Quotation dispatched to buyer successfully.');
          }}
          onAccept={(id) => {
            acceptQuotation(id);
            setPreviewModalQuote(null);
            showToast('Quotation marked as Accepted by buyer.');
          }}
          onReject={(id) => {
            rejectQuotation(id);
            setPreviewModalQuote(null);
            showToast('Quotation marked as Rejected.');
          }}
          onEdit={(id) => {
            setPreviewModalQuote(null);
            setEditingQuotationId(id);
            onNavigate('quotations/create');
          }}
        />
      )}
    </div>
  );
};
