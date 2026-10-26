import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Search,
  PlusCircle,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Calendar,
  MapPin,
  Package,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import { ORGANIZATION_TYPES } from '../data/mockQuotations';

export const QuotationRequests = ({ onNavigate }) => {
  const {
    quotationRequests,
    startQuotationFromRequest,
    updateRequestStatus,
    rejectQuotationRequest,
  } = useQuotations();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeRequestDetails, setActiveRequestDetails] = useState(null);
  const [rejectDialogRequest, setRejectDialogRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredRequests = useMemo(() => {
    return quotationRequests.filter((req) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const idMatch = req.id?.toLowerCase().includes(q) || req.requestNumber?.toLowerCase().includes(q);
        const orgMatch = req.organizationName?.toLowerCase().includes(q);
        const contactMatch = req.contactPerson?.toLowerCase().includes(q);
        if (!idMatch && !orgMatch && !contactMatch) return false;
      }
      if (selectedType !== 'ALL' && req.organizationType !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'ALL' && req.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [quotationRequests, search, selectedType, selectedStatus]);

  const handleCreateQuotation = (req) => {
    startQuotationFromRequest(req);
    onNavigate('quotations/create');
  };

  const handleConfirmReject = () => {
    if (!rejectDialogRequest) return;
    rejectQuotationRequest(rejectDialogRequest.id, rejectReason || 'Inquiry outside supply scope');
    setRejectDialogRequest(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#1A2E0A] text-[#F7941D]">
              <Inbox size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Buyer Quotation Requests (RFQs)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Incoming purchase requests and tender inquiries from Government departments, schools, and hospitals
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('quotations/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer shadow-xs border-none"
        >
          <PlusCircle size={15} className="text-[#F7941D]" />
          <span>Create Blank Quote</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQ ID, organization, contact..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-[#F7941D]"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-[#F7941D] cursor-pointer"
        >
          <option value="ALL">All Organization Types</option>
          {ORGANIZATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-[#F7941D] cursor-pointer"
        >
          <option value="ALL">All Request Statuses</option>
          <option value="Pending">Pending Review</option>
          <option value="Under Review">Under Review</option>
          <option value="Quotation Created">Quotation Created</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-4 px-4">Request ID</th>
                <th className="py-4 px-4 min-w-[200px]">Organization & Buyer</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4 min-w-[220px]">Requested Products</th>
                <th className="py-4 px-4 text-center">Total Qty</th>
                <th className="py-4 px-4">Delivery Location</th>
                <th className="py-4 px-4">Req. Delivery</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Inbox size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No quotation requests found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1A2E0A]">
                      {req.requestNumber || req.id}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {req.requestDate}
                      </span>
                    </td>

                    {/* Organization */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                        {req.organizationName}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                        {req.contactPerson} ({req.designation})
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {req.organizationType}
                      </span>
                    </td>

                    {/* Requested Products */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 max-w-[220px]">
                        {(req.requestedProducts || []).slice(0, 2).map((p, pIdx) => (
                          <div key={pIdx} className="truncate text-slate-800 text-[11px]">
                            • {p.productName} ({p.quantity} {p.unit})
                          </div>
                        ))}
                        {(req.requestedProducts || []).length > 2 && (
                          <span className="text-[10px] font-bold text-[#F7941D]">
                            +{(req.requestedProducts || []).length - 2} more items
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Qty */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {req.totalEstimatedUnits} Units
                    </td>

                    {/* Delivery Location */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 truncate max-w-[150px]">
                      {req.deliveryLocation}
                    </td>

                    {/* Delivery Date */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {req.requiredDeliveryDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          req.status === 'Quotation Created'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'Under Review'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : req.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveRequestDetails(req)}
                          title="View Request Details"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border-none bg-transparent"
                        >
                          <Eye size={15} />
                        </button>

                        {req.status !== 'Quotation Created' && (
                          <button
                            type="button"
                            onClick={() => handleCreateQuotation(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-colors cursor-pointer border-none shadow-2xs whitespace-nowrap"
                          >
                            <PlusCircle size={13} className="text-[#F7941D]" />
                            <span>Create Quote</span>
                          </button>
                        )}

                        {req.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => updateRequestStatus(req.id, 'Under Review')}
                            title="Mark as Under Review"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer border-none bg-transparent"
                          >
                            <Clock size={15} />
                          </button>
                        )}

                        {req.status !== 'Rejected' && req.status !== 'Quotation Created' && (
                          <button
                            type="button"
                            onClick={() => setRejectDialogRequest(req)}
                            title="Reject Request"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer border-none bg-transparent"
                          >
                            <XCircle size={15} />
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
      </div>

      {/* Details Modal */}
      {activeRequestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-100 text-[#1A2E0A]">
                  <Inbox size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeRequestDetails.requestNumber || activeRequestDetails.id}
                  </h3>
                  <p className="text-xs text-slate-500">{activeRequestDetails.organizationName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRequestDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Buyer Entity</span>
                <p className="font-bold text-slate-900">{activeRequestDetails.organizationName}</p>
                <p className="text-slate-600">{activeRequestDetails.department}</p>
                <p className="text-slate-700 mt-1">
                  Contact: {activeRequestDetails.contactPerson} ({activeRequestDetails.designation})
                </p>
                <p className="text-slate-600">{activeRequestDetails.email} • {activeRequestDetails.phone}</p>
              </div>

              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Delivery & Budget</span>
                <p className="text-slate-800">
                  Location: <strong>{activeRequestDetails.deliveryLocation}</strong>
                </p>
                <p className="text-slate-700">
                  Target Date: <strong>{activeRequestDetails.requiredDeliveryDate}</strong>
                </p>
                <p className="text-slate-700">
                  Estimated Budget: <strong>{activeRequestDetails.estimatedBudget || 'Flexible'}</strong>
                </p>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1.5">
                Requested Products Breakdown
              </span>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Target Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeRequestDetails.requestedProducts || []).map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.productName}</td>
                        <td className="py-2 px-3 text-right font-bold">{p.quantity} {p.unit}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{p.estimatedPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {activeRequestDetails.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <strong>Buyer Notes:</strong> {activeRequestDetails.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveRequestDetails(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {activeRequestDetails.status !== 'Quotation Created' && (
                <button
                  type="button"
                  onClick={() => {
                    const req = activeRequestDetails;
                    setActiveRequestDetails(null);
                    handleCreateQuotation(req);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold cursor-pointer border-none"
                >
                  Create Quotation from This Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {rejectDialogRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Quotation Request?</h3>
            <p className="text-xs text-slate-600">
              Rejecting inquiry from <strong>{rejectDialogRequest.organizationName}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Products currently out of production / unserviceable delivery pin"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#F7941D]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialogRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer border-none"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
