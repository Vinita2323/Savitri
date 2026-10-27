import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Truck, 
  Download, 
  Printer, 
  Eye, 
  Edit3, 
  XCircle, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Boxes
} from 'lucide-react';
import { useDeliveryChallan } from '../context/DeliveryChallanContext';
import ChallanStatusBadge from '../components/ChallanStatusBadge';
import DeliveryChallanPreviewModal from '../components/DeliveryChallanPreviewModal';
import { formatDate } from '../utils/deliveryChallanPdfGenerator';

export const DeliveryChallanList = ({ onNavigate }) => {
  const {
    challans,
    loading,
    error,
    pagination,
    stats,
    fetchChallans,
    downloadPdf,
    printPdf,
    cancelChallan,
  } = useDeliveryChallan();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Preview Modal
  const [previewChallan, setPreviewChallan] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Cancel Modal
  const [cancellingChallan, setCancellingChallan] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Download / Print action loading states per item
  const [actionLoading, setActionLoading] = useState({});

  const loadData = useCallback(() => {
    fetchChallans({
      page: currentPage,
      limit: 15,
      search: searchTerm,
      status: selectedStatus === 'all' ? '' : selectedStatus,
      startDate,
      endDate,
    }).catch(() => {});
  }, [fetchChallans, currentPage, searchTerm, selectedStatus, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleDownload = async (challan) => {
    const key = `dl_${challan._id}`;
    try {
      setActionLoading((prev) => ({ ...prev, [key]: true }));
      await downloadPdf(challan);
    } catch (err) {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handlePrint = async (challan) => {
    const key = `pr_${challan._id}`;
    try {
      setActionLoading((prev) => ({ ...prev, [key]: true }));
      await printPdf(challan);
    } catch (err) {
      alert('Failed to open print dialog. Please try again.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const openCancelModal = (challan) => {
    setCancellingChallan(challan);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancellingChallan) return;
    try {
      setIsSubmittingCancel(true);
      await cancelChallan(cancellingChallan._id, cancelReason || 'Cancelled by admin');
      setIsCancelModalOpen(false);
      setCancellingChallan(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel delivery challan');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const navigateTo = (tab, data = null) => {
    if (onNavigate) {
      onNavigate(tab, data);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1A2E0A] rounded-xl text-white shadow-xs">
              <Truck size={22} className="text-[#F7941D]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Delivery Challan Management</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Rule 55 CGST
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Generate official delivery challans, track order dispatches, and manage logistics compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => navigateTo('delivery_challans/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A2E0A] hover:bg-[#253f10] text-white text-sm font-semibold rounded-xl shadow-md transition cursor-pointer border-none"
          >
            <Plus size={18} className="text-[#F7941D]" />
            <span>+ Create Delivery Challan</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Challans */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Challans</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total || 0}</h3>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FileText size={20} />
          </div>
        </div>

        {/* Dispatched */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Dispatched</p>
            <h3 className="text-2xl font-black text-emerald-800 mt-1">{stats.dispatched || 0}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Truck size={20} />
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Delivered</p>
            <h3 className="text-2xl font-black text-teal-800 mt-1">{stats.delivered || 0}</h3>
          </div>
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <CheckCircle size={20} />
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Drafts Pending</p>
            <h3 className="text-2xl font-black text-amber-800 mt-1">{stats.draft || 0}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Challan #, Client Name, Phone, or Order #..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#F7941D] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none transition font-medium"
            />
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs text-slate-700 outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs text-slate-700 outline-none"
              />
            </div>

            {(startDate || endDate || searchTerm || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-2.5">
          <span className="text-slate-400 font-medium px-1 text-[11px] uppercase tracking-wider">Status:</span>
          {[
            { id: 'all', label: 'All Challans' },
            { id: 'Dispatched', label: 'Dispatched' },
            { id: 'Partially Delivered', label: 'Partially Delivered' },
            { id: 'Delivered', label: 'Delivered' },
            { id: 'Draft', label: 'Draft' },
            { id: 'Cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 border-none ${
                selectedStatus === tab.id
                  ? 'bg-[#1A2E0A] text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="text-xs font-bold text-rose-700 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Challan Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && challans.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw size={32} className="animate-spin text-[#1A2E0A]" />
            <p className="text-sm font-medium">Loading delivery challans...</p>
          </div>
        ) : challans.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-5 bg-emerald-50 text-[#1A2E0A] rounded-full">
              <Truck size={40} />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-900">No Delivery Challans Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm || selectedStatus !== 'all'
                  ? 'No records match your active search or filter criteria. Try adjusting your filters.'
                  : 'You have not issued any delivery challans yet. Create your first delivery challan for an eligible customer order.'}
              </p>
            </div>
            <button
              onClick={() => navigateTo('delivery_challans/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A2E0A] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#2A4515] transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Delivery Challan</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10.5px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Challan Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-3">Linked Order</th>
                  <th className="py-3 px-3 text-center">Products</th>
                  <th className="py-3 px-3 text-center">Dispatched Qty</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Created By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {challans.map((ch) => {
                  const client = ch.clientSnapshot || {};
                  const isDraft = ch.status === 'Draft';
                  const isCancelled = ch.status === 'Cancelled';
                  const isDelivered = ch.status === 'Delivered';
                  const dlLoading = actionLoading[`dl_${ch._id}`];
                  const prLoading = actionLoading[`pr_${ch._id}`];

                  return (
                    <tr
                      key={ch._id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigateTo('delivery_challans/details', ch)}
                    >
                      {/* Challan Number */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        <span className="text-[#1A2E0A] group-hover:text-[#F7941D] transition-colors">
                          {ch.challanNumber}
                        </span>
                        {ch.purpose && (
                          <span className="block text-[10px] font-normal text-slate-500 font-sans">
                            {ch.purpose}
                          </span>
                        )}
                      </td>

                      {/* Challan Date */}
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(ch.challanDate)}
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">
                          {client.companyName || client.name || 'Valued Customer'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {client.phone || client.email || '-'}
                        </p>
                      </td>

                      {/* Linked Order */}
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          #{ch.orderNumber || '-'}
                        </span>
                      </td>

                      {/* Products Count */}
                      <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                        {ch.items?.length || 0} items
                      </td>

                      {/* Total Dispatched Qty */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold font-mono">
                          {ch.totalDispatchedQuantity || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <ChallanStatusBadge status={ch.status} size="sm" />
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-3 text-slate-600 text-[11px]">
                        <p className="font-medium text-slate-800">{ch.createdBy?.name || 'Administrator'}</p>
                        <p className="text-slate-400">{formatDate(ch.createdAt)}</p>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => navigateTo('delivery_challans/details', ch)}
                            title="View Challan Details"
                            className="p-1.5 text-slate-500 hover:text-[#1A2E0A] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Quick Preview */}
                          <button
                            onClick={() => {
                              setPreviewChallan(ch);
                              setIsPreviewOpen(true);
                            }}
                            title="Preview Challan Document"
                            className="p-1.5 text-slate-500 hover:text-[#F7941D] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <FileText size={15} />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownload(ch)}
                            disabled={dlLoading}
                            title="Download Vector PDF"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer disabled:opacity-40"
                          >
                            <Download size={15} className={dlLoading ? 'animate-bounce' : ''} />
                          </button>

                          {/* Print */}
                          <button
                            onClick={() => handlePrint(ch)}
                            disabled={prLoading}
                            title="Print Challan"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-40"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Edit Draft */}
                          {isDraft && (
                            <button
                              onClick={() => navigateTo('delivery_challans/edit', ch)}
                              title="Edit Draft Challan"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {/* Cancel Challan */}
                          {!isCancelled && !isDelivered && (
                            <button
                              onClick={() => openCancelModal(ch)}
                              title="Cancel Challan"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Showing page <span className="font-bold text-slate-900">{pagination.page}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.totalPages}</span> ({pagination.totalItems} total challans)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <DeliveryChallanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewChallan(null);
        }}
        challan={previewChallan}
      />

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && cancellingChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Delivery Challan</h3>
                <p className="text-xs text-slate-500 font-mono">
                  #{cancellingChallan.challanNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Cancelling this delivery challan will reverse its dispatch count on linked Order #{cancellingChallan.orderNumber}.
              This action will be logged in the audit trail.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter specific reason for cancellation (e.g., incorrect transport, customer request, order modification)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
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

export default DeliveryChallanList;
