import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Printer,
  Eye,
  Edit3,
  XCircle,
  RefreshCw,
  Send,
  Copy,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Ban,
  Receipt,
  MoreVertical,
} from 'lucide-react';
import { useProformaInvoice } from '../context/ProformaInvoiceContext';
import ProformaStatusBadge from '../components/ProformaStatusBadge';
import ProformaPdfPreviewModal from '../components/ProformaPdfPreviewModal';
import SendEmailModal from '../components/SendEmailModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import RecordConfirmationModal from '../components/RecordConfirmationModal';
import { formatINR, formatDate } from '../utils/proformaCalculations';

export const ProformaInvoiceList = ({ onNavigate }) => {
  const {
    invoices,
    loading,
    error,
    pagination,
    stats,
    fetchInvoices,
    downloadPdf,
    printPdf,
    cancelInvoice,
    duplicateInvoice,
    sendEmail,
    recordPayment,
    recordConfirmation,
  } = useProformaInvoice();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [emailModalInvoice, setEmailModalInvoice] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [confirmationModalInvoice, setConfirmationModalInvoice] = useState(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const [cancellingInvoice, setCancellingInvoice] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Download / Action loading indicators
  const [actionLoading, setActionLoading] = useState({});
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const loadData = useCallback(() => {
    fetchInvoices({
      page: currentPage,
      limit: 15,
      search: searchTerm,
      status: selectedStatus === 'all' ? '' : selectedStatus,
      paymentStatus: selectedPaymentStatus === 'all' ? '' : selectedPaymentStatus,
      startDate,
      endDate,
    }).catch(() => {});
  }, [fetchInvoices, currentPage, searchTerm, selectedStatus, selectedPaymentStatus, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handlePaymentStatusFilter = (pStatus) => {
    setSelectedPaymentStatus(pStatus);
    setCurrentPage(1);
  };

  const handleDownload = async (inv) => {
    const key = `dl_${inv._id}`;
    try {
      setActionLoading((prev) => ({ ...prev, [key]: true }));
      await downloadPdf(inv);
      setActionSuccess(`Downloaded Proforma Invoice #${inv.proformaNumber}.pdf`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      setActionError('Failed to download PDF. Please try again.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handlePrint = async (inv) => {
    const key = `print_${inv._id}`;
    try {
      setActionLoading((prev) => ({ ...prev, [key]: true }));
      await printPdf(inv);
    } catch (err) {
      setActionError('Print failed. Please verify printer connectivity.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDuplicate = async (inv) => {
    if (!window.confirm(`Duplicate Proforma Invoice #${inv.proformaNumber} as a new Draft?`)) {
      return;
    }
    const key = `dup_${inv._id}`;
    try {
      setActionLoading((prev) => ({ ...prev, [key]: true }));
      const res = await duplicateInvoice(inv._id);
      if (res && res.invoice) {
        setActionSuccess(`Duplicated as new Draft #${res.invoice.proformaNumber}`);
        setTimeout(() => setActionSuccess(''), 4000);
        loadData();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to duplicate invoice.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenCancelModal = (inv) => {
    setCancellingInvoice(inv);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingInvoice) return;
    try {
      setIsSubmittingCancel(true);
      await cancelInvoice(cancellingInvoice._id, cancelReason);
      setActionSuccess(`Proforma Invoice #${cancellingInvoice.proformaNumber} cancelled.`);
      setTimeout(() => setActionSuccess(''), 4000);
      setIsCancelModalOpen(false);
      setCancellingInvoice(null);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to cancel invoice.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Page Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-semibold text-slate-800 leading-tight">
                Proforma Invoices
              </h1>
              <p className="text-sm font-normal text-slate-500 mt-0.5">
                Preliminary commercial demand notes, advance payment tracking &amp; client confirmations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => loadData()}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F7941D]' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('proforma-invoices/create')}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer border border-[#1A2E0A]"
          >
            <Plus className="w-4 h-4 text-[#F7941D]" />
            <span>Create Proforma Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs sm:text-sm font-medium">
            <span>Total Issued</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-semibold text-slate-900">{stats.total || 0}</span>
            <span className="text-xs font-normal text-slate-500">{formatINR(stats.totalValue || 0)}</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs sm:text-sm font-medium">
            <span>Drafts</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-semibold text-slate-700">{stats.draft || 0}</span>
            <span className="text-xs font-normal text-slate-400">In Preparation</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-purple-700 text-xs sm:text-sm font-medium">
            <span>Sent to Clients</span>
            <Send className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-semibold text-purple-800">{stats.sent || 0}</span>
            <span className="text-xs font-normal text-purple-600">Awaiting Conf.</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs sm:text-sm font-medium">
            <span>Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-semibold text-emerald-800">{stats.confirmed || 0}</span>
            <span className="text-xs font-normal text-emerald-600">PO Received</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-rose-600 text-xs sm:text-sm font-medium">
            <span>Unpaid Balance</span>
            <CreditCard className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-semibold text-rose-700">{formatINR(stats.totalBalanceDue || 0)}</span>
            <span className="text-xs font-normal text-rose-500">{stats.unpaidCount || 0} docs</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs sm:text-sm font-medium">
            <span>Expired / Cancelled</span>
            <Ban className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-semibold text-slate-600">{(stats.expired || 0) + (stats.cancelled || 0)}</span>
            <span className="text-xs font-normal text-slate-400">Past Validity</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by Proforma # (PI-2026-...), company name, contact person, or email..."
              className="w-full pl-9 pr-4 py-2 text-sm font-normal border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A] outline-none placeholder:text-sm placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 self-start lg:self-auto text-sm">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs sm:text-sm font-normal outline-none text-slate-700 p-0"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs sm:text-sm font-normal outline-none text-slate-700 p-0"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            <span className="text-slate-500 font-medium mr-1">Status:</span>
            {['all', 'Draft', 'Issued', 'Sent', 'Confirmed', 'Expired', 'Cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer capitalize ${
                  selectedStatus === st
                    ? 'bg-[#1A2E0A] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs sm:text-sm ml-auto">
            <span className="text-slate-500 font-medium mr-1">Payment:</span>
            {['all', 'Unpaid', 'Partially Paid', 'Paid'].map((pst) => (
              <button
                key={pst}
                onClick={() => handlePaymentStatusFilter(pst)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer capitalize ${
                  selectedPaymentStatus === pst
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pst}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold">
              <tr>
                <th className="py-3 px-4">Proforma #</th>
                <th className="py-3 px-4">Client / Company</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Document Status</th>
                <th className="py-3 px-4 text-center">Reference</th>
                <th className="py-3 px-4 text-center">Created By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F7941D]" />
                    <p className="font-medium text-sm">Loading Proforma Invoices...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-14 text-center">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-base text-slate-700">No Proforma Invoices Found</p>
                    <p className="text-sm font-normal text-slate-500 max-w-sm mx-auto mt-1">
                      {searchTerm || selectedStatus !== 'all' || selectedPaymentStatus !== 'all'
                        ? 'Try clearing search filters or adjusting your date range.'
                        : 'Generate commercial proforma invoices from existing quotations or create one manually.'}
                    </p>
                    <button
                      onClick={() => onNavigate('proforma-invoices/create')}
                      className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#F7941D]" />
                      <span>Create Proforma Invoice</span>
                    </button>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const client = inv.clientSnapshot || {};
                  const isDraft = inv.status === 'Draft';
                  const isCancelled = inv.status === 'Cancelled';
                  const grandTotal = inv.summary?.grandTotal || 0;
                  const balanceDue = inv.summary?.balanceDue ?? grandTotal;

                  return (
                    <tr
                      key={inv._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Document # */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onNavigate('proforma-invoices/details', inv)}
                          className="font-mono text-sm font-semibold text-slate-900 hover:text-[#F7941D] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {inv.proformaNumber}
                        </button>
                        <div className="text-xs font-normal text-slate-500 mt-0.5">
                          Advance: {formatINR(inv.summary?.advanceAmount)}
                        </div>
                      </td>

                      {/* Client / Company */}
                      <td className="py-3.5 px-4">
                        <div className="text-sm font-medium text-slate-800 line-clamp-1 max-w-[200px]">
                          {client.companyName || 'Corporate Client'}
                        </div>
                        <div className="text-xs font-normal text-slate-500 line-clamp-1">
                          {client.contactPerson ? `${client.contactPerson} &bull; ` : ''}
                          {client.phone}
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-sm font-normal">
                        {formatDate(inv.issueDate)}
                      </td>

                      {/* Valid Until */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-sm font-normal">
                        <span
                          className={`font-normal ${
                            new Date(inv.validUntil) < new Date() && inv.status !== 'Converted to Invoice'
                              ? 'text-rose-600 font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatDate(inv.validUntil)}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900 font-mono">
                          {formatINR(grandTotal)}
                        </div>
                        {balanceDue > 0 ? (
                          <div className="text-xs text-rose-600 font-medium font-mono">
                            Due: {formatINR(balanceDue)}
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-600 font-medium">
                            Fully Settled
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <ProformaStatusBadge status={inv.paymentStatus} type="payment" size="sm" />
                      </td>

                      {/* Document Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <ProformaStatusBadge status={inv.status} type="document" size="sm" />
                      </td>

                      {/* Linked Quotation / Order */}
                      <td className="py-3.5 px-4 text-center text-slate-600 text-xs whitespace-nowrap font-mono">
                        {inv.referenceQuotation?.quotationNumber ? (
                          <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium border border-teal-200">
                            {inv.referenceQuotation.quotationNumber}
                          </span>
                        ) : inv.referenceOrder?.orderNumber ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-200">
                            {inv.referenceOrder.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans">-</span>
                        )}
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-4 text-center text-slate-500 text-xs font-normal whitespace-nowrap">
                        {inv.createdBy?.name || 'Super Admin'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => onNavigate('proforma-invoices/details', inv)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Proforma Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Draft (only enabled in Draft status) */}
                          {isDraft && (
                            <button
                              onClick={() => onNavigate('proforma-invoices/edit', inv)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Draft Proforma Invoice"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Preview PDF */}
                          <button
                            onClick={() => {
                              setPreviewInvoice(inv);
                              setIsPreviewOpen(true);
                            }}
                            className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Preview PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownload(inv)}
                            disabled={actionLoading[`dl_${inv._id}`]}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 text-[#F7941D]" />
                          </button>

                          {/* Send / Resend Email */}
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setEmailModalInvoice(inv);
                                setIsEmailModalOpen(true);
                              }}
                              className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title={inv.emailStatus === 'Sent' ? 'Resend Email' : 'Send via Email'}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Record Payment */}
                          {!isCancelled && inv.paymentStatus !== 'Paid' && (
                            <button
                              onClick={() => {
                                setPaymentModalInvoice(inv);
                                setIsPaymentModalOpen(true);
                              }}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(inv)}
                            disabled={actionLoading[`dup_${inv._id}`]}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Duplicate as new Draft"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Cancel (if not already cancelled) */}
                          {!isCancelled && inv.status !== 'Converted to Invoice' && (
                            <button
                              onClick={() => handleOpenCancelModal(inv)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Proforma Invoice"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalItems} records)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. PDF Preview Modal */}
      <ProformaPdfPreviewModal
        invoice={previewInvoice}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewInvoice(null);
        }}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onOpenSendEmail={(inv) => {
          setEmailModalInvoice(inv);
          setIsEmailModalOpen(true);
        }}
      />

      {/* 2. Send Email Modal */}
      <SendEmailModal
        invoice={emailModalInvoice}
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setEmailModalInvoice(null);
          loadData();
        }}
        onSendEmail={sendEmail}
      />

      {/* 3. Record Payment Modal */}
      <RecordPaymentModal
        invoice={paymentModalInvoice}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentModalInvoice(null);
          loadData();
        }}
        onRecordPayment={recordPayment}
      />

      {/* 4. Record Confirmation Modal */}
      <RecordConfirmationModal
        invoice={confirmationModalInvoice}
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          setConfirmationModalInvoice(null);
          loadData();
        }}
        onRecordConfirmation={recordConfirmation}
      />

      {/* 5. Cancel Confirmation Modal */}
      {isCancelModalOpen && cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Cancel Proforma Invoice?
                </h3>
                <p className="text-xs text-slate-500">
                  #{cancellingInvoice.proformaNumber} &bull; {cancellingInvoice.clientSnapshot?.companyName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling will permanently mark this commercial Proforma Invoice as Cancelled and lock it from further payments or emails. This action is audited.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="2"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Client requested revised specification or procurement cancelled..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancellingInvoice(null);
                }}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel || !cancelReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProformaInvoiceList;
