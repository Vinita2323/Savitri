import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  Truck,
  Building,
  User,
  ShoppingCart,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  MapPin,
  Phone,
  Mail,
  Edit3,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useDeliveryChallan } from '../context/DeliveryChallanContext';
import ChallanStatusBadge from '../components/ChallanStatusBadge';
import DeliveryChallanPreviewModal from '../components/DeliveryChallanPreviewModal';
import { formatDate } from '../utils/deliveryChallanPdfGenerator';

export const DeliveryChallanDetails = ({ onNavigate, challanData }) => {
  const {
    fetchChallanById,
    finalizeChallan,
    updateStatus,
    cancelChallan,
    downloadPdf,
    printPdf,
  } = useDeliveryChallan();

  const [challan, setChallan] = useState(challanData || null);
  const [loading, setLoading] = useState(!challanData);
  const [actionLoading, setActionLoading] = useState(false);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delivery confirmation modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryTargetStatus, setDeliveryTargetStatus] = useState('Delivered');
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiverRemarks, setReceiverRemarks] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  // Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadChallan = useCallback(async () => {
    if (!challan?._id && !challanData?._id) return;
    const targetId = challan?._id || challanData?._id;
    try {
      setLoading(true);
      const res = await fetchChallanById(targetId);
      if (res) {
        setChallan(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [challan?._id, challanData?._id, fetchChallanById]);

  useEffect(() => {
    if (!challan && challanData) {
      setChallan(challanData);
    }
    loadChallan();
  }, [challanData]);

  const handleDownload = async () => {
    if (!challan) return;
    try {
      setActionLoading(true);
      await downloadPdf(challan);
    } catch (e) {
      alert('Failed to download PDF.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!challan) return;
    try {
      setActionLoading(true);
      await printPdf(challan);
    } catch (e) {
      alert('Failed to print PDF.');
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize Draft
  const handleFinalize = async () => {
    if (!challan) return;
    if (!window.confirm(`Are you sure you want to finalize and dispatch Challan #${challan.challanNumber}?`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await finalizeChallan(challan._id);
      if (res.success && res.challan) {
        setChallan(res.challan);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize delivery challan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delivery
  const handleConfirmDelivery = async () => {
    if (!challan) return;
    try {
      setActionLoading(true);
      const res = await updateStatus(challan._id, {
        status: deliveryTargetStatus,
        receivedBy: receivedBy.trim() || 'Client Receiver',
        receivedDate: new Date(receivedDate),
        receiverRemarks: receiverRemarks.trim(),
        receiverPhone: receiverPhone.trim(),
      });
      if (res.success && res.challan) {
        setChallan(res.challan);
        setShowDeliveryModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Challan
  const handleConfirmCancel = async () => {
    if (!challan) return;
    try {
      setActionLoading(true);
      const res = await cancelChallan(challan._id, cancelReason || 'Cancelled by admin');
      if (res.success && res.challan) {
        setChallan(res.challan);
        setShowCancelModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel delivery challan.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !challan) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <RefreshCw size={32} className="animate-spin mx-auto text-[#1A2E0A]" />
        <p className="text-sm font-medium">Loading delivery challan details...</p>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-800">Delivery Challan Not Found</h3>
        <button
          onClick={() => onNavigate && onNavigate('delivery_challans')}
          className="px-4 py-2 bg-[#1A2E0A] text-white text-xs font-bold rounded-xl"
        >
          Return to Challan List
        </button>
      </div>
    );
  }

  const client = challan.clientSnapshot || {};
  const shipping = client.shippingAddress || {};
  const billing = client.billingAddress || {};
  const transport = challan.transportDetails || {};
  const issuing = challan.issuingCompany || {};
  const items = challan.items || [];
  const audit = challan.auditHistory || [];

  const isDraft = challan.status === 'Draft';
  const isDispatched = challan.status === 'Dispatched' || challan.status === 'Partially Delivered';
  const isDelivered = challan.status === 'Delivered';
  const isCancelled = challan.status === 'Cancelled';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate('delivery_challans')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight font-mono">
                {challan.challanNumber}
              </h1>
              <ChallanStatusBadge status={challan.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {formatDate(challan.challanDate)} | Linked to Order #{challan.orderNumber}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <FileText size={15} />
            <span>Preview Document</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#F7941D] hover:bg-[#d97d0e] text-white transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>

          {/* Draft Actions */}
          {isDraft && (
            <>
              <button
                onClick={() => onNavigate && onNavigate('delivery_challans/edit', challan)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
              >
                <Edit3 size={15} />
                <span>Edit Draft</span>
              </button>

              <button
                onClick={handleFinalize}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1A2E0A] hover:bg-[#253f10] text-white transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <Truck size={15} className="text-[#F7941D]" />
                <span>Mark as Dispatched</span>
              </button>
            </>
          )}

          {/* Dispatched Actions -> Mark Delivered */}
          {isDispatched && (
            <button
              onClick={() => {
                setDeliveryTargetStatus('Delivered');
                setShowDeliveryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white transition shadow-md cursor-pointer"
            >
              <CheckCircle size={15} />
              <span>Record Delivery Confirmation</span>
            </button>
          )}

          {/* Cancel Action */}
          {!isDelivered && !isCancelled && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            >
              <XCircle size={15} />
              <span>Cancel Challan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goods Dispatched Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck size={18} className="text-[#1A2E0A]" />
                <span>Dispatched Goods & Quantity Balance</span>
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono">
                Total: {challan.totalDispatchedQuantity} units
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1A2E0A] text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Product Description</th>
                    <th className="py-2.5 px-3 text-center">HSN</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Prev. Disp</th>
                    <th className="py-2.5 px-3 text-center font-bold bg-[#2A4515]">This Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        {item.variantTitle && (
                          <span className="text-[11px] text-slate-500 block">Variant: {item.variantTitle}</span>
                        )}
                        {item.sku && (
                          <span className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.hsn || '-'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'Units'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{item.orderedQuantity}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{item.previouslyDispatchedQuantity || 0}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-900 bg-emerald-50/60">
                        {item.dispatchedQuantity}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      TOTAL SUMMARY
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      {items.reduce((sum, i) => sum + (Number(i.orderedQuantity) || 0), 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-center text-emerald-950 font-black text-sm bg-amber-100">
                      {challan.totalDispatchedQuantity}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Transport & Shipping Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck size={18} className="text-[#1A2E0A]" />
              <span>Transport & Dispatch Information</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Transporter Name</span>
                <span className="font-bold text-slate-900">{transport.transporterName || 'Self / Direct Delivery'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Vehicle Number</span>
                <span className="font-mono font-bold text-slate-900">{transport.vehicleNumber || '-'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">LR / Docket Number</span>
                <span className="font-mono font-bold text-slate-900">{transport.lrNumber || '-'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">E-Way Bill Number</span>
                <span className="font-mono font-bold text-slate-900">{transport.ewayBillNumber || 'N/A (Exempt)'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Purpose of Challan</span>
                <span className="font-bold text-[#F7941D]">{challan.purpose || 'Supply on Sale'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Dispatch Date</span>
                <span className="font-bold text-slate-900">{formatDate(challan.dispatchDate || challan.challanDate)}</span>
              </div>
            </div>

            {challan.shippingNotes && (
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-900 block">Shipping Notes</span>
                <p className="text-slate-700">{challan.shippingNotes}</p>
              </div>
            )}
          </div>

          {/* Delivery Details (If Delivered) */}
          {(challan.deliveryDetails?.receivedBy || challan.status === 'Delivered') && (
            <div className="bg-teal-50/50 rounded-2xl border border-teal-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-teal-900 flex items-center gap-2">
                <CheckCircle size={18} className="text-teal-700" />
                <span>Delivery Confirmation Details</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase block">Received By</span>
                  <span className="font-bold text-slate-900">{challan.deliveryDetails?.receivedBy || 'Consignee'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase block">Delivery Date</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(challan.deliveryDetails?.receivedDate || challan.updatedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase block">Receiver Remarks</span>
                  <span className="font-medium text-slate-800">
                    {challan.deliveryDetails?.receiverRemarks || 'Verified in good condition'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Audit History Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={17} className="text-[#1A2E0A]" />
              <span>Document History & Audit Trail</span>
            </h3>

            <div className="space-y-3">
              {audit.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-emerald-600 pl-3 py-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{entry.action}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(entry.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      By: <span className="font-semibold text-slate-700">{entry.changedBy}</span>
                      {entry.notes && ` — ${entry.notes}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Client, Seller & Order Cards */}
        <div className="space-y-6">
          {/* Linked Order Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A2E0A] uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart size={15} />
                <span>Linked Order</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {challan.order?.orderStatus || 'Active'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-mono font-bold text-slate-900 text-sm">#{challan.orderNumber}</p>
              <p className="text-slate-500">Order Date: {formatDate(challan.orderDate)}</p>
              {challan.orderGrandTotal > 0 && (
                <p className="text-slate-800 font-semibold">
                  Amount: ₹{Number(challan.orderGrandTotal).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>

          {/* Client & Shipping Destination */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3 text-xs">
            <span className="font-bold text-[#1A2E0A] uppercase tracking-wider flex items-center gap-1.5 text-xs">
              <User size={15} />
              <span>Client / Consignee</span>
            </span>

            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {client.companyName || client.name || 'Valued Customer'}
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Phone size={12} className="text-slate-400" />
                <span>{client.phone || '-'}</span>
              </p>
              {client.email && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-400" />
                  <span>{client.email}</span>
                </p>
              )}
              <p className="font-mono text-slate-600">
                GSTIN: {client.gstin || 'Consumer / Unregistered'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Ship To Address</span>
              <p className="font-semibold text-slate-800">{shipping.fullName || client.name}</p>
              <p className="text-slate-600">
                {[shipping.addressLine1, shipping.addressLine2, shipping.landmark].filter(Boolean).join(', ')}
              </p>
              <p className="text-slate-600">
                {[shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(' - ')}
              </p>
            </div>
          </div>

          {/* Issuing Entity (Savitri B2B) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3 text-xs">
            <span className="font-bold text-[#1A2E0A] uppercase tracking-wider flex items-center gap-1.5 text-xs">
              <Building size={15} />
              <span>Issuing Consignor</span>
            </span>

            <div className="space-y-1 text-slate-600">
              <p className="font-bold text-slate-900 text-sm">{issuing.name}</p>
              <p>{issuing.legalName}</p>
              <p>{issuing.address}</p>
              <p className="font-mono font-semibold text-slate-800">GSTIN: {issuing.gstin}</p>
              <p className="font-mono">CIN: {issuing.cin}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <DeliveryChallanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        challan={challan}
      />

      {/* Delivery Confirmation Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-teal-700">
              <div className="p-2.5 bg-teal-50 rounded-xl">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Delivery Receipt</h3>
                <p className="text-xs text-slate-500 font-mono">Challan #{challan.challanNumber}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Status</label>
                <select
                  value={deliveryTargetStatus}
                  onChange={(e) => setDeliveryTargetStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                >
                  <option value="Delivered">Delivered (Full Consignment Received)</option>
                  <option value="Partially Delivered">Partially Delivered</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Received By (Name / Seal) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Person or security personnel who received goods"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Date</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Receiver Contact / Phone</label>
                <input
                  type="text"
                  placeholder="Mobile number"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Package Condition</label>
                <textarea
                  rows={2}
                  placeholder="Goods verified intact under seal..."
                  value={receiverRemarks}
                  onChange={(e) => setReceiverRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Confirm Delivery Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Delivery Challan</h3>
                <p className="text-xs text-slate-500 font-mono">#{challan.challanNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this delivery challan? Cancelling will release the dispatched quantities
              back to eligible order dispatch balance.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryChallanDetails;
