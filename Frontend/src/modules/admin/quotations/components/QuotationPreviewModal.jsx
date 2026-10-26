import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { formatINR } from '../utils/quotationCalculations';
import { QuotationStatusChip } from './QuotationStatusChip';

export const QuotationPreviewModal = ({
  quotation,
  isOpen,
  onClose,
  onSend,
  onAccept,
  onReject,
  onEdit,
}) => {
  const printRef = useRef(null);

  if (!isOpen || !quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Client-side print-to-PDF demonstration
    window.print();
  };

  const buyer = quotation.buyer || {};
  const items = quotation.items || [];
  const summary = quotation.summary || {};
  const terms = quotation.termsAndConditions || {};
  const commercial = quotation.commercialTerms || {};
  const govt = quotation.governmentInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1A2E0A] text-white shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-[#F7941D]" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Official Quotation Document Preview — {quotation.quotationNumber}
              </h3>
              <p className="text-[11px] text-slate-300">
                Institutional & Commercial Procurement Specification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer border border-white/20"
              title="Print Document"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7941D] hover:bg-[#e08316] text-[#1A2E0A] text-xs font-bold transition-colors cursor-pointer border-none"
              title="Download PDF"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer ml-2"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800" ref={printRef}>
          {/* Document Header with Logo & Supplier Details */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <img
                    src="/LogoSavitri.png"
                    alt="Savitri Logo"
                    className="h-10 sm:h-12 w-auto max-w-[200px] object-contain"
                  />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#F7941D] bg-[#1A2E0A] px-2 py-0.5 rounded">
                    B2B Enterprise
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Savitri Multi-Brand E-Commerce & Institutional Supply Platform
                </p>
                <p className="text-[11px] text-slate-600">
                  Registered Hub: Indore Central Fulfillment Complex, Sector B, Sanwer Road Industrial Area, Indore (MP) - 452015
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  GSTIN: <strong>23AAACS9981K1ZP</strong> | CIN: U74999MP2025PTC049102 | FSSAI: 11425850000122
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider mb-1.5">
                  COMMERCIAL QUOTATION
                </span>
                <p className="text-xs text-slate-500 font-semibold">
                  Quote No: <strong className="text-slate-900 font-mono">{quotation.quotationNumber}</strong>
                </p>
                <p className="text-xs text-slate-500 font-semibold">
                  Date of Issue: <span className="text-slate-800">{quotation.quotationDate}</span>
                </p>
                <p className="text-xs text-slate-500 font-semibold">
                  Valid Until: <strong className="text-rose-600">{quotation.validUntil}</strong>
                </p>
                <div className="mt-2">
                  <QuotationStatusChip status={quotation.status} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Government / Tender Reference Banner (if applicable) */}
          {govt && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 uppercase tracking-wider">
                <Award size={14} className="text-blue-600" />
                <span>Government Procurement / Tender Specification Reference:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-medium text-[11.5px] pt-1">
                <div>
                  <span className="text-blue-700">Tender Ref:</span> <strong>{govt.tenderRefNumber || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-blue-700">Tender/GeM ID:</span> <strong>{govt.tenderId || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-blue-700">Portal:</span> <strong>{govt.procurementPortal || 'GeM'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1 text-[10px]">
                QUOTATION ISSUED TO (BUYER DETAILS)
              </span>
              <h4 className="text-sm font-bold text-slate-900">{buyer.organizationName}</h4>
              <p className="text-slate-600 font-medium">{buyer.department}</p>
              <p className="text-slate-700 mt-1">
                Attn: <strong>{buyer.contactPerson}</strong> ({buyer.designation})
              </p>
              <p className="text-slate-600">
                Email: {buyer.email} | Phone: {buyer.phone}
              </p>
              {buyer.gstin && (
                <p className="font-mono text-slate-700 mt-0.5">
                  GSTIN: <strong>{buyer.gstin}</strong>
                </p>
              )}
            </div>

            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1 text-[10px]">
                DELIVERY / FULFILLMENT DESTINATION
              </span>
              <p className="text-slate-800 font-medium">
                {buyer.shippingAddress || buyer.billingAddress}
              </p>
              <p className="text-slate-600 mt-0.5">
                City / State: {buyer.city}, {buyer.state} - {buyer.pincode}
              </p>
              <p className="text-slate-700 mt-1">
                Timeline: <strong>{commercial.deliveryTimeline || 'Within 7 Working Days'}</strong>
              </p>
              {quotation.referenceNumber && (
                <p className="text-slate-600 mt-0.5">
                  Buyer RFQ Ref: <strong>{quotation.referenceNumber}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Subject */}
          {quotation.subject && (
            <div className="border-l-4 border-[#F7941D] pl-3 py-1 bg-amber-50/50 text-xs">
              <span className="text-slate-500 font-bold uppercase text-[10px] block">Subject:</span>
              <p className="font-bold text-slate-900">{quotation.subject}</p>
            </div>
          )}

          {/* Product Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">HSN</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-center">GST Rate</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      {item.description && (
                        <span className="text-[11px] text-slate-500 block">{item.description}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                      {item.hsn || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatINR(item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                      {item.gstRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatINR(item.taxableAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing & Commercial Summary Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="sm:w-1/2 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                COMMERCIAL & PAYMENT TERMS
              </span>
              <p className="text-slate-700">
                <strong>Payment Terms:</strong> {commercial.paymentTerms || 'Net 30 Days'}
              </p>
              <p className="text-slate-700">
                <strong>Delivery Schedule:</strong> {commercial.deliveryTimeline || 'Within 7 Working Days'}
              </p>
              <p className="text-slate-700">
                <strong>Delivery Point:</strong> {commercial.deliveryLocation || buyer.shippingAddress}
              </p>
              {commercial.warrantyTerms && (
                <p className="text-slate-700">
                  <strong>Warranty / Guarantee:</strong> {commercial.warrantyTerms}
                </p>
              )}
            </div>

            <div className="sm:w-1/2 bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatINR(summary.subtotal)}</span>
              </div>
              {summary.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span>- {formatINR(summary.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
                <span>Taxable Amount:</span>
                <span>{formatINR(summary.taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Taxes (CGST/SGST/IGST):</span>
                <span>{formatINR(summary.totalTax)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Shipping & Delivery:</span>
                <span>{formatINR(summary.shippingCharges || 0)}</span>
              </div>
              {summary.additionalCharges > 0 && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Packaging & Handling:</span>
                  <span>{formatINR(summary.additionalCharges)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-900 font-sans font-black text-sm border-t-2 border-slate-900 pt-2">
                <span>Grand Total:</span>
                <span className="text-base font-mono text-[#1A2E0A]">{formatINR(summary.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 text-xs text-slate-600 space-y-1.5">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
              STANDARD TERMS & CONDITIONS
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>{terms.payment || 'Payment as per agreed commercial credit terms.'}</li>
              <li>{terms.delivery || 'Prices include standard delivery and unloading at designated point.'}</li>
              <li>{terms.validity || 'Quotation validity 30 days from issue date.'}</li>
              <li>{terms.taxes || 'GST applicable as per current tax schedules.'}</li>
              <li>{terms.other || 'All food and consumable items packaged in compliance with FSSAI regulations.'}</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buyer Acceptance</p>
              <div className="h-12 border-b border-dashed border-slate-300 w-48 mt-2" />
              <p className="text-slate-500 text-[11px] mt-1">Authorized Seal & Signature</p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">For Savitri Enterprise Solutions</p>
              <div className="inline-block mt-2 text-center">
                <span className="font-serif italic font-bold text-slate-800 text-sm block">Deepak Sharma</span>
                <span className="text-[10px] text-slate-400 block border-t border-slate-300 pt-0.5">
                  Authorized Signatory (Procurement Cell)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Buyer Simulation:</span>
            {quotation.status !== 'Accepted' && quotation.status !== 'Converted to Order' && (
              <>
                <button
                  type="button"
                  onClick={() => onAccept && onAccept(quotation.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  <CheckCircle size={13} />
                  <span>Mark Accepted</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReject && onReject(quotation.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  <XCircle size={13} />
                  <span>Mark Rejected</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {quotation.status === 'Draft' && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit && onEdit(quotation.id)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit Draft
                </button>
                <button
                  type="button"
                  onClick={() => onSend && onSend(quotation.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  <Send size={13} className="text-[#F7941D]" />
                  <span>Send to Buyer</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
