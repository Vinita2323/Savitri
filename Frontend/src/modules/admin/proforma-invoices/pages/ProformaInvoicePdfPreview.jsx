import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  Send,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import { useProformaInvoice } from '../context/ProformaInvoiceContext';
import SendEmailModal from '../components/SendEmailModal';
import { formatINR, formatDate, numberToWordsINR } from '../utils/proformaCalculations';

export const ProformaInvoicePdfPreview = ({ onNavigate, proformaData }) => {
  const { selectedInvoice, downloadPdf, printPdf, sendEmail, fetchInvoiceById } = useProformaInvoice();

  const [invoice, setInvoice] = useState(proformaData || selectedInvoice || null);
  const [loading, setLoading] = useState(!invoice);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!invoice && proformaData?._id) {
      fetchInvoiceById(proformaData._id)
        .then((res) => {
          if (res) setInvoice(res);
        })
        .finally(() => setLoading(false));
    }
  }, [proformaData, invoice, fetchInvoiceById]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#F7941D] mb-2" />
        <p className="text-xs">Rendering Proforma Invoice Preview...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-bold text-slate-700">No Proforma Invoice Selected for Preview</p>
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

  const handleDownload = async () => {
    try {
      setActionLoading(true);
      await downloadPdf(invoice);
    } catch {
      alert('Failed to download PDF.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setActionLoading(true);
      await printPdf(invoice);
    } catch {
      alert('Print failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col">
      {/* Sticky Top Toolbar */}
      <div className="sticky top-0 z-40 bg-[#1A2E0A] text-white px-4 sm:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('proforma-invoices/details', invoice)}
            className="p-1.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="Back to Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span>Proforma Invoice Preview</span>
              <span className="font-mono text-[#F7941D]">#{invoice.proformaNumber}</span>
            </h2>
            <p className="text-xs font-normal text-slate-300">
              {client.companyName} &bull; Valid Until {formatDate(invoice.validUntil)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownload}
            disabled={actionLoading}
            className="px-3.5 py-1.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#F7941D]" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={actionLoading}
            className="px-3.5 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          {invoice.status !== 'Cancelled' && (
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="px-3.5 py-1.5 text-sm font-semibold text-[#1A2E0A] bg-[#F7941D] hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send Email</span>
            </button>
          )}
        </div>
      </div>

      {/* Main A4 Document Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
        <div className="w-full max-w-[800px] bg-white rounded-xl shadow-xl border border-slate-300 p-8 text-slate-800 font-sans text-xs space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div className="flex items-start gap-3">
              <img
                src="/LogoSavitri.png"
                alt="Savitri"
                className="w-12 h-12 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-base font-bold text-[#1A2E0A] m-0">
                  {issuing.name || 'SAVITRI B2B ENTERPRISE'}
                </h1>
                <p className="text-[10px] text-slate-500 font-medium m-0 mt-0.5">
                  {issuing.legalName || 'Institutional Supply & Commercial Procurement Platform'}
                </p>
                <p className="text-[10px] text-slate-500 m-0 mt-0.5">
                  GSTIN: <span className="font-semibold text-slate-700">{issuing.gstin}</span> | CIN: {issuing.cin}
                </p>
                <p className="text-[10px] text-slate-500 m-0">{issuing.address}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-[#F7941D] text-[#1A2E0A] font-bold text-[10px] px-3 py-1 rounded tracking-wider uppercase">
                Proforma Invoice
              </span>
              <p className="text-[9px] text-slate-400 mt-1.5 italic">
                Preliminary Commercial Quotation / Demand
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded p-2.5">
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 uppercase">Doc #</span>
              <span className="text-xs font-bold text-slate-900 font-mono">{invoice.proformaNumber}</span>
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 uppercase">Date</span>
              <span className="text-xs font-medium text-slate-800">{formatDate(invoice.issueDate)}</span>
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-rose-500 uppercase">Valid Until</span>
              <span className="text-xs font-bold text-rose-600">{formatDate(invoice.validUntil)}</span>
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 uppercase">Reference</span>
              <span className="text-xs font-medium text-slate-700">
                {invoice.referenceQuotation?.quotationNumber || invoice.referenceOrder?.orderNumber || 'Corporate PO'}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded">
              <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase mb-1">Billed To (Buyer)</span>
              <div className="font-bold text-slate-900 text-xs">{client.companyName}</div>
              {client.contactPerson && <div className="text-slate-600">Attn: {client.contactPerson}</div>}
              <div className="text-slate-600">{client.phone} &bull; {client.email}</div>
              <div className="text-slate-600 mt-1">
                {[billing.addressLine1, billing.city, billing.state, billing.pincode].filter(Boolean).join(', ')}
              </div>
              <div className="font-semibold text-slate-800 mt-1">GSTIN: {client.gstin || 'Unregistered'}</div>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded">
              <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase mb-1">Shipped To (Consignee)</span>
              <div className="font-bold text-slate-900 text-xs">{shipping.fullName || client.companyName}</div>
              <div className="text-slate-600">Contact: {shipping.phone || client.phone}</div>
              <div className="text-slate-600 mt-1">
                {[shipping.addressLine1, shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(', ')}
              </div>
              <div className="font-semibold text-slate-800 mt-1">Place of Supply: {billing.state || 'Madhya Pradesh'}</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden border border-slate-200 rounded">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-[#1A2E0A] text-white">
                <tr>
                  <th className="py-2 px-2 text-center w-8">#</th>
                  <th className="py-2 px-2 text-left">Item Description</th>
                  <th className="py-2 px-2 text-center">HSN</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price</th>
                  <th className="py-2 px-2 text-right">Disc.</th>
                  <th className="py-2 px-2 text-right">Taxable</th>
                  <th className="py-2 px-2 text-center">GST</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <div className="font-semibold text-slate-800">{it.name}</div>
                      {it.description && <div className="text-[10px] text-slate-500">{it.description}</div>}
                    </td>
                    <td className="py-1.5 px-2 text-center text-slate-600 font-mono text-[10px]">{it.hsn || '-'}</td>
                    <td className="py-1.5 px-2 text-center text-slate-700">{it.quantity} {it.unit}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatINR(it.unitPrice)}</td>
                    <td className="py-1.5 px-2 text-right text-rose-600 font-mono">
                      {it.discountAmount > 0 ? formatINR(it.discountAmount) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatINR(it.taxableAmount)}</td>
                    <td className="py-1.5 px-2 text-center font-medium">{it.gstRate}%</td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900 font-mono">{formatINR(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Bank Remittance */}
          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded flex flex-col justify-between">
              <div>
                <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase mb-1">Total in Words</span>
                <div className="italic text-slate-800 mb-3">{numberToWordsINR(summary.grandTotal)}</div>
                <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase mb-1">Bank Remittance</span>
                <div className="space-y-0.5 text-[10px] text-slate-700">
                  <div><strong>Bank:</strong> {bank.bankName || 'HDFC Bank Ltd.'}</div>
                  <div><strong>Account:</strong> {bank.accountName || 'Savitri Enterprise B2B Solutions'}</div>
                  <div><strong>A/C No:</strong> <span className="font-mono font-bold">{bank.accountNumber || '50200088921473'}</span></div>
                  <div><strong>IFSC:</strong> <span className="font-mono font-bold">{bank.ifscCode || 'HDFC0001248'}</span></div>
                  <div><strong>UPI:</strong> <span className="font-mono">{bank.upiId || 'savitrient@hdfcbank'}</span></div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span>{formatINR(summary.subtotal)}</span>
              </div>
              {summary.totalDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discounts:</span>
                  <span>-{formatINR(summary.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span>{formatINR(summary.taxableAmount)}</span>
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
                  <span>Freight / Delivery:</span>
                  <span>{formatINR(summary.shippingCharges)}</span>
                </div>
              )}
              <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-sm text-[#1A2E0A]">
                <span>Grand Total:</span>
                <span className="font-mono">{formatINR(summary.grandTotal)}</span>
              </div>
              <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded flex justify-between font-bold text-emerald-800">
                <span>Advance Required ({summary.advancePercentage || 50}%):</span>
                <span className="font-mono">{formatINR(summary.advanceAmount)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signatory */}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-[10px]">
            <div className="col-span-2 text-slate-500 leading-relaxed">
              <span className="block font-bold text-slate-700 uppercase mb-0.5">Commercial Terms</span>
              <p className="whitespace-pre-line m-0">
                {invoice.termsAndConditions ||
                  '1. This is a preliminary commercial Proforma Invoice. It is NOT a tax invoice under Section 31 of CGST Act, 2017.\n2. Goods allocation and dispatch will be initiated strictly upon receipt of advance payment.'}
              </p>
            </div>
            <div className="text-right flex flex-col justify-between">
              <div>
                <span className="block font-bold text-[#1A2E0A]">FOR SAVITRI B2B ENTERPRISE</span>
                <span className="text-[9px] text-slate-400">Authorized Procurement Desk</span>
              </div>
              <div className="mt-6 border-t border-slate-300 pt-1 font-bold text-slate-700">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      <SendEmailModal
        invoice={invoice}
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSendEmail={sendEmail}
      />
    </div>
  );
};

export default ProformaInvoicePdfPreview;
