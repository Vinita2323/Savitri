import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  Send,
  Edit3,
  Copy,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  History,
  FileCheck,
  CheckCheck,
  Ban,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useProformaInvoice } from '../context/ProformaInvoiceContext';
import ProformaStatusBadge from '../components/ProformaStatusBadge';
import ProformaPdfPreviewModal from '../components/ProformaPdfPreviewModal';
import SendEmailModal from '../components/SendEmailModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import RecordConfirmationModal from '../components/RecordConfirmationModal';
import HistoricalSnapshotModal from '../components/HistoricalSnapshotModal';
import { formatINR, formatDate, numberToWordsINR } from '../utils/proformaCalculations';

export const ProformaInvoiceDetails = ({ onNavigate, proformaData }) => {
  const {
    selectedInvoice,
    fetchInvoiceById,
    downloadPdf,
    printPdf,
    sendEmail,
    recordPayment,
    recordConfirmation,
    duplicateInvoice,
    cancelInvoice,
    convertToInvoice,
  } = useProformaInvoice();

  const [invoice, setInvoice] = useState(proformaData || selectedInvoice || null);
  const [loading, setLoading] = useState(!invoice);

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  const refreshDetails = async () => {
    const id = invoice?._id || proformaData?._id;
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetchInvoiceById(id);
      if (res) setInvoice(res);
    } catch (err) {
      setErrorNotice('Failed to refresh invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!invoice && proformaData?._id) {
      refreshDetails();
    }
  }, [proformaData]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#F7941D] mb-2" />
        <p className="text-xs">Loading Proforma Invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-bold text-slate-700">No Proforma Invoice Selected</p>
        <button
          onClick={() => onNavigate('proforma-invoices')}
          className="px-4 py-2 text-xs font-bold text-white bg-[#1A2E0A] rounded-xl cursor-pointer"
        >
          Return to List
        </button>
      </div>
    );
  }

  const client = invoice.clientSnapshot || {};
  const billing = client.billingAddress || {};
  const shipping = client.shippingAddress || {};
  const issuing = invoice.issuingCompany || {};
  const bank = issuing.bankDetails || {};
  const items = invoice.items || [];
  const summary = invoice.summary || {};
  const payments = invoice.paymentRecords || [];
  const emailHistory = invoice.emailHistory || [];
  const confirmation = invoice.confirmation || {};
  const snapshots = invoice.historicalSnapshots || [];

  const isDraft = invoice.status === 'Draft';
  const isCancelled = invoice.status === 'Cancelled';
  const grandTotal = summary.grandTotal || 0;
  const totalPaid = summary.totalPaid || 0;
  const balanceDue = summary.balanceDue ?? Math.max(0, grandTotal - totalPaid);

  const handleDownload = async () => {
    try {
      setActionLoading(true);
      await downloadPdf(invoice);
      setSuccessNotice(`Proforma Invoice #${invoice.proformaNumber} downloaded.`);
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch {
      setErrorNotice('Failed to download PDF.');
      setTimeout(() => setErrorNotice(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setActionLoading(true);
      await printPdf(invoice);
    } catch {
      setErrorNotice('Print failed.');
      setTimeout(() => setErrorNotice(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!window.confirm(`Duplicate Proforma Invoice #${invoice.proformaNumber} as a new Draft?`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await duplicateInvoice(invoice._id);
      if (res && res.invoice) {
        onNavigate('proforma-invoices/details', res.invoice);
      }
    } catch (err) {
      setErrorNotice(err.response?.data?.message || 'Failed to duplicate invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setActionLoading(true);
      await cancelInvoice(invoice._id, cancelReason);
      setSuccessNotice(`Proforma Invoice #${invoice.proformaNumber} cancelled.`);
      setIsCancelModalOpen(false);
      refreshDetails();
    } catch (err) {
      setErrorNotice(err.response?.data?.message || 'Failed to cancel invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      setActionLoading(true);
      await convertToInvoice(invoice._id);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Conversion requires an active Tax Invoice module. Proforma invoices are preliminary commercial documents and cannot be used as tax invoices.';
      setErrorNotice(msg);
      setTimeout(() => setErrorNotice(''), 6000);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Top Banner Notifications */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Header and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onNavigate('proforma-invoices')}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer mt-1"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-[28px] font-semibold text-slate-800 leading-tight font-mono">
                {invoice.proformaNumber}
              </h1>
              <ProformaStatusBadge status={invoice.status} type="document" size="md" />
              <ProformaStatusBadge status={invoice.paymentStatus} type="payment" size="md" />
              <ProformaStatusBadge status={invoice.emailStatus} type="email" size="md" />
            </div>
            <p className="text-sm font-normal text-slate-500 mt-1">
              Issued to <strong>{client.companyName}</strong> on {formatDate(invoice.issueDate)} &bull;{' '}
              Valid Until <strong className="text-rose-600 font-medium">{formatDate(invoice.validUntil)}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            onClick={refreshDetails}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Edit Draft */}
          {isDraft && (
            <button
              onClick={() => onNavigate('proforma-invoices/edit', invoice)}
              className="px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Draft</span>
            </button>
          )}

          {/* Preview PDF */}
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Preview PDF</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownload}
            disabled={actionLoading}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#F7941D]" />
            <span>Download</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            disabled={actionLoading}
            className="px-3.5 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          {/* Send via Email */}
          {!isCancelled && (
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#F7941D]" />
              <span>{invoice.emailStatus === 'Sent' ? 'Resend Email' : 'Send via Email'}</span>
            </button>
          )}

          {/* Record Confirmation */}
          {!isCancelled && (
            <button
              onClick={() => setIsConfirmationModalOpen(true)}
              className="px-3.5 py-2 text-sm font-medium text-teal-800 bg-teal-100/70 hover:bg-teal-100 border border-teal-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{confirmation.isConfirmed ? 'Edit Confirmation' : 'Record Confirmation'}</span>
            </button>
          )}

          {/* Record Payment */}
          {!isCancelled && invoice.paymentStatus !== 'Paid' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3.5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            title="Duplicate as new Draft"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Cancel */}
          {!isCancelled && invoice.status !== 'Converted to Invoice' && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="p-2 text-rose-500 hover:text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer"
              title="Cancel Document"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metadata Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client & Billing Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-sm font-normal">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Building className="w-4 h-4 text-[#F7941D]" />
            <span>Buyer Organization</span>
          </div>
          <div className="text-base font-semibold text-slate-900">{client.companyName}</div>
          {client.contactPerson && (
            <div className="text-slate-600">Contact: {client.contactPerson}</div>
          )}
          <div className="text-slate-600">
            Phone: {client.phone} &bull; Email: {client.email}
          </div>
          <div className="text-slate-600">
            GSTIN:{' '}
            <strong className="text-slate-800 font-mono font-medium">
              {client.gstin || 'Unregistered'}
            </strong>
          </div>
          <div className="text-slate-500 text-xs pt-1.5 border-t border-slate-100">
            {[billing.addressLine1, billing.city, billing.state, billing.pincode]
              .filter(Boolean)
              .join(', ')}
          </div>
        </div>

        {/* Commercial & Terms Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-sm font-normal">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <FileText className="w-4 h-4 text-[#F7941D]" />
            <span>Commercial Conditions</span>
          </div>
          <div className="text-slate-700">
            <strong>Payment Terms:</strong> {invoice.paymentTerms}
          </div>
          <div className="text-slate-700">
            <strong>Delivery Terms:</strong> {invoice.deliveryTerms}
          </div>
          {invoice.referenceQuotation?.quotationNumber && (
            <div className="text-teal-700 font-medium">
              Ref Quotation: #{invoice.referenceQuotation.quotationNumber}
            </div>
          )}
          {invoice.referenceOrder?.orderNumber && (
            <div className="text-blue-700 font-medium">
              Ref Order: #{invoice.referenceOrder.orderNumber}
            </div>
          )}
        </div>

        {/* Payment Remittance Summary */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-sm font-normal">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Settlement Status</span>
            </span>
            <ProformaStatusBadge status={invoice.paymentStatus} type="payment" size="sm" />
          </div>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-slate-500">Gross Total:</span>
            <span className="text-base font-semibold font-mono text-slate-900">{formatINR(grandTotal)}</span>
          </div>
          <div className="flex justify-between items-baseline text-emerald-700 font-medium">
            <span>Advance Required ({summary.advancePercentage || 50}%):</span>
            <span className="font-mono font-semibold">{formatINR(summary.advanceAmount)}</span>
          </div>
          <div className="flex justify-between items-baseline text-slate-600">
            <span>Verified Paid Amount:</span>
            <span className="font-mono font-semibold text-emerald-700">{formatINR(totalPaid)}</span>
          </div>
          <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline font-semibold">
            <span className="text-slate-700">Balance Outstanding:</span>
            <span className="font-mono text-rose-600 text-sm sm:text-base">{formatINR(balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-sm text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#F7941D]" />
            <span>Itemized Commercial Bill of Quantities</span>
          </span>
          <span className="text-slate-500 text-xs font-normal">{items.length} line items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A2E0A] text-white text-xs sm:text-sm font-semibold">
              <tr>
                <th className="py-3 px-3 text-center w-8">#</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3 text-center">HSN</th>
                <th className="py-3 px-3 text-center">Quantity</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">Discount</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-center">GST Rate</th>
                <th className="py-3 px-3 text-right">Tax Amt</th>
                <th className="py-3 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-normal">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    <div>{it.name}</div>
                    {it.description && <div className="text-xs text-slate-500 font-normal mt-0.5">{it.description}</div>}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{it.hsn || '-'}</td>
                  <td className="py-3 px-3 text-center text-slate-700">{it.quantity} {it.unit}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{formatINR(it.unitPrice)}</td>
                  <td className="py-3 px-3 text-right text-rose-600 font-mono">
                    {it.discountAmount > 0 ? `-${formatINR(it.discountAmount)}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{formatINR(it.taxableAmount)}</td>
                  <td className="py-3 px-3 text-center text-slate-600">{it.gstRate}%</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{formatINR(it.taxAmount)}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono">{formatINR(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculations & Bank Wire Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Wire Details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm font-normal">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[#F7941D]" />
            <span>Bank Remittance Coordinates (NEFT / RTGS)</span>
          </h2>
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1.5 text-slate-700 leading-relaxed text-sm">
            <div><strong>Bank Name:</strong> {bank.bankName || 'HDFC Bank Ltd.'}</div>
            <div><strong>Beneficiary Account:</strong> {bank.accountName || 'Savitri Enterprise B2B Solutions'}</div>
            <div><strong>Account Number:</strong> <span className="font-mono font-semibold text-slate-900">{bank.accountNumber || '50200088921473'}</span></div>
            <div><strong>IFSC Code:</strong> <span className="font-mono font-semibold text-slate-900">{bank.ifscCode || 'HDFC0001248'}</span></div>
            <div><strong>Branch:</strong> {bank.branch || 'Sanwer Road Industrial Area, Indore'}</div>
            <div><strong>UPI ID:</strong> <span className="font-mono">{bank.upiId || 'savitrient@hdfcbank'}</span></div>
          </div>
          <p className="text-xs text-slate-500 italic">
            * Please mention Proforma Invoice #{invoice.proformaNumber} in the wire transfer description.
          </p>
        </div>

        {/* Financial Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-sm font-normal">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Financial Breakdown</span>
          </h2>
          <div className="flex justify-between text-slate-600">
            <span>Gross Subtotal:</span>
            <span className="font-medium text-slate-800">{formatINR(summary.subtotal)}</span>
          </div>
          {summary.totalDiscount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Discounts:</span>
              <span className="font-medium">-{formatINR(summary.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Net Taxable Value:</span>
            <span className="font-medium text-slate-800">{formatINR(summary.taxableAmount)}</span>
          </div>
          {summary.cgstAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>CGST:</span>
              <span>{formatINR(summary.cgstAmount)}</span>
            </div>
          )}
          {summary.sgstAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>SGST:</span>
              <span>{formatINR(summary.sgstAmount)}</span>
            </div>
          )}
          {summary.igstAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>IGST:</span>
              <span>{formatINR(summary.igstAmount)}</span>
            </div>
          )}
          {summary.shippingCharges > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Freight / Shipping:</span>
              <span>{formatINR(summary.shippingCharges)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2.5 flex justify-between font-semibold text-slate-900 text-base">
            <span>Grand Total:</span>
            <span className="font-mono text-lg text-[#1A2E0A]">{formatINR(grandTotal)}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between font-semibold text-emerald-800">
            <span>Required Advance ({summary.advancePercentage || 50}%):</span>
            <span className="font-mono">{formatINR(summary.advanceAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Total Verified Paid:</span>
            <span className="font-mono font-semibold text-emerald-700">{formatINR(totalPaid)}</span>
          </div>
          <div className="flex justify-between text-slate-600 font-semibold border-t border-slate-100 pt-1.5">
            <span>Balance Outstanding:</span>
            <span className="font-mono text-rose-600 text-sm sm:text-base">{formatINR(balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* TRACKING SECTIONS: Payments, Confirmations, Email Log, Historical Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Records Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm font-normal">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Verified Payment Records ({payments.length})</span>
            </h3>
            {!isCancelled && invoice.paymentStatus !== 'Paid' && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-3 py-1 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
              >
                + Record Payment
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm">
              No verified payments recorded yet. Payments are tracked only when confirmed by accounts.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {formatINR(p.amount)}{' '}
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-normal ml-1">
                        {p.paymentType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.paymentMethod} &bull; Ref: <span className="font-mono">{p.referenceNumber || 'N/A'}</span>
                    </div>
                    {p.notes && <div className="text-xs text-slate-400 italic mt-0.5">{p.notes}</div>}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatDate(p.paymentDate)}</div>
                    <div className="text-slate-400">By {p.recordedBy?.name || 'Admin'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Confirmation Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm font-normal">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-teal-600" />
              <span>Client Confirmation Status</span>
            </h3>
            {!isCancelled && (
              <button
                onClick={() => setIsConfirmationModalOpen(true)}
                className="px-3 py-1 text-xs sm:text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer"
              >
                {confirmation.isConfirmed ? 'Edit' : '+ Record PO'}
              </button>
            )}
          </div>

          {confirmation.isConfirmed ? (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1.5 text-slate-800 text-sm">
              <div className="flex items-center justify-between font-semibold text-teal-900">
                <span>Formal Confirmation Received</span>
                <span>{formatDate(confirmation.confirmedAt)}</span>
              </div>
              <div>
                <strong>PO Reference #:</strong>{' '}
                <span className="font-mono font-medium">{confirmation.poNumber || 'Confirmed without PO'}</span>
              </div>
              <div>
                <strong>Confirmed By:</strong> {confirmation.confirmedBy || 'Client Representative'}
              </div>
              {confirmation.expectedPaymentDate && (
                <div>
                  <strong>Expected Payment Date:</strong> {formatDate(confirmation.expectedPaymentDate)}
                </div>
              )}
              {confirmation.notes && (
                <div className="text-xs text-slate-600 italic">Notes: {confirmation.notes}</div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm">
              Awaiting client purchase order / formal acceptance.
            </div>
          )}
        </div>
      </div>

      {/* Email History & Historical Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Audit Log */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm font-normal">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
              <Send className="w-4 h-4 text-purple-600" />
              <span>Email Dispatch History ({emailHistory.length})</span>
            </h3>
            {!isCancelled && (
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="px-3 py-1 text-xs sm:text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer"
              >
                + New Email
              </button>
            )}
          </div>

          {emailHistory.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm">
              No emails sent yet. Click &ldquo;Send via Email&rdquo; to dispatch PDF with commercial terms.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {emailHistory.map((h, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-sm flex items-center justify-between ${
                    h.status === 'Sent'
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                      : 'bg-rose-50/60 border-rose-200 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-medium">{h.recipientEmail}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {h.subject} &bull; {new Date(h.sentAt).toLocaleString('en-IN')}
                    </div>
                    {h.errorDetails && (
                      <div className="text-xs text-rose-600 font-mono mt-0.5">{h.errorDetails}</div>
                    )}
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        h.status === 'Sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historical Snapshots */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm font-normal">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Sent Document Snapshots ({snapshots.length})</span>
            </h3>
            {snapshots.length > 0 && (
              <button
                onClick={() => setIsSnapshotModalOpen(true)}
                className="px-3 py-1 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
              >
                Inspect Snapshots
              </button>
            )}
          </div>

          {snapshots.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm">
              Document snapshots are permanently preserved whenever an email is dispatched.
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-medium text-slate-800">Version #{s.version || idx + 1}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Captured: {new Date(s.capturedAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSnapshotModalOpen(true)}
                    className="text-xs sm:text-sm text-indigo-600 font-medium hover:underline cursor-pointer"
                  >
                    View Frozen Data
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversion Notice Card */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-normal flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-slate-700">
          <CheckCheck className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <strong className="font-semibold">Convert to Actual Tax Invoice:</strong>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              A Proforma Invoice is a preliminary demand note and cannot serve as a tax invoice under GST. Conversion requires a separate Tax Invoice workflow.
            </p>
          </div>
        </div>
        <button
          onClick={handleConvertToInvoice}
          disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer"
        >
          Convert to Tax Invoice
        </button>
      </div>

      {/* MODALS */}
      <ProformaPdfPreviewModal
        invoice={invoice}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onOpenSendEmail={() => setIsEmailModalOpen(true)}
      />

      <SendEmailModal
        invoice={invoice}
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          refreshDetails();
        }}
        onSendEmail={sendEmail}
      />

      <RecordPaymentModal
        invoice={invoice}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          refreshDetails();
        }}
        onRecordPayment={recordPayment}
      />

      <RecordConfirmationModal
        invoice={invoice}
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          refreshDetails();
        }}
        onRecordConfirmation={recordConfirmation}
      />

      <HistoricalSnapshotModal
        snapshots={snapshots}
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        proformaNumber={invoice.proformaNumber}
      />

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cancel Proforma Invoice?</h3>
                <p className="text-xs text-slate-500">#{invoice.proformaNumber}</p>
              </div>
            </div>
            <textarea
              rows="3"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="State reason for cancellation..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none resize-none"
              required
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProformaInvoiceDetails;
