import React from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  Edit,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Building2,
  Calendar,
  FileText,
  Award,
  Package,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import { formatINR } from '../utils/quotationCalculations';
import { QuotationStatusChip } from '../components/QuotationStatusChip';

export const QuotationDetails = ({ onNavigate }) => {
  const {
    selectedQuotationId,
    getQuotationById,
    setEditingQuotationId,
    sendQuotation,
    acceptQuotation,
    rejectQuotation,
    convertToOrder,
  } = useQuotations();

  const quotation = getQuotationById(selectedQuotationId);

  if (!quotation) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 font-sans">
        <FileText size={42} className="mx-auto text-slate-300" />
        <h3 className="text-base font-bold text-slate-800">No Quotation Selected</h3>
        <p className="text-xs text-slate-500">Please choose a quotation from the Quotation List.</p>
        <button
          type="button"
          onClick={() => onNavigate('quotations')}
          className="px-4 py-2 rounded-xl bg-[#1A2E0A] text-white text-xs font-bold cursor-pointer border-none"
        >
          Back to All Quotations
        </button>
      </div>
    );
  }

  const buyer = quotation.buyer || {};
  const items = quotation.items || [];
  const summary = quotation.summary || {};
  const commercial = quotation.commercialTerms || {};
  const terms = quotation.termsAndConditions || {};
  const govt = quotation.governmentInfo;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('quotations')}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Back to Quotations"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
                {quotation.quotationNumber}
              </h1>
              <QuotationStatusChip status={quotation.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Issued to {buyer.organizationName || 'Client'} • Created on {quotation.quotationDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quotation.status === 'Draft' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingQuotationId(quotation.id);
                  onNavigate('quotations/create');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                <Edit size={14} className="text-blue-600" />
                <span>Edit Draft</span>
              </button>
              <button
                type="button"
                onClick={() => sendQuotation(quotation.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer border-none shadow-xs"
              >
                <Send size={14} className="text-[#F7941D]" />
                <span>Send to Buyer</span>
              </button>
            </>
          )}

          {quotation.status === 'Accepted' && (
            <button
              type="button"
              onClick={() => {
                const ord = convertToOrder(quotation.id);
                alert(`Quotation successfully converted to Order: ${ord}`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-xs"
            >
              <CheckCircle2 size={14} />
              <span>Convert to Purchase Order</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Document</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F7941D] hover:bg-[#e08316] text-[#1A2E0A] text-xs font-bold transition-all cursor-pointer border-none shadow-xs"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6 text-slate-800">
        {/* Document Header */}
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
                Central Logistics Depot, Sector B, Sanwer Road Industrial Area, Indore (MP) - 452015
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                GSTIN: <strong>23AAACS9981K1ZP</strong> | CIN: U74999MP2025PTC049102
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider mb-1.5">
                COMMERCIAL QUOTATION
              </span>
              <p className="text-xs text-slate-600 font-semibold">
                Quote No: <strong className="text-slate-900 font-mono">{quotation.quotationNumber}</strong>
              </p>
              <p className="text-xs text-slate-600 font-semibold">
                Issue Date: <span className="text-slate-800">{quotation.quotationDate}</span>
              </p>
              <p className="text-xs text-slate-600 font-semibold">
                Validity: <strong className="text-rose-600">{quotation.validUntil}</strong>
              </p>
              {quotation.convertedOrderId && (
                <p className="text-xs text-teal-700 font-bold font-mono mt-1">
                  Converted Order: {quotation.convertedOrderId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Government Tender Info (if applicable) */}
        {govt && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-950 uppercase tracking-wider">
              <Award size={15} className="text-blue-600" />
              <span>Government Tender / GeM Bidding Specification:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-medium text-[11.5px] pt-1">
              <div>
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Tender Reference:</span>
                <strong>{govt.tenderRefNumber || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Portal Bid ID:</span>
                <strong>{govt.tenderId || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Procurement Channel:</span>
                <strong>{govt.procurementPortal || 'GeM'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Buyer & Destination Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1 text-[10px]">
              BUYER & INVOICING ENTITY
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
              DELIVERY LOCATION & TIMELINE
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
                Buyer Reference: <strong>{quotation.referenceNumber}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Subject */}
        {quotation.subject && (
          <div className="border-l-4 border-[#F7941D] pl-3 py-1 bg-amber-50/50 text-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px] block">Quotation Subject:</span>
            <p className="font-bold text-slate-900">{quotation.subject}</p>
          </div>
        )}

        {/* Product Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-3 text-center w-8">#</th>
                <th className="py-3 px-3">Item Name & Specification</th>
                <th className="py-3 px-3 text-center">HSN</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-center">GST Rate</th>
                <th className="py-3 px-3 text-right">Taxable Amount</th>
                <th className="py-3 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{it.name}</span>
                    {it.description && (
                      <span className="text-[11px] text-slate-500 block">{it.description}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600 text-[11px]">
                    {it.hsn || '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">
                    {formatINR(it.unitPrice)}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700">
                    {it.gstRate}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    {formatINR(it.taxableAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Commercial Terms & Financial Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
          <div className="sm:w-1/2 space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
              PAYMENT & DISPATCH CONDITIONS
            </span>
            <p className="text-slate-700">
              <strong>Payment Terms:</strong> {commercial.paymentTerms || 'Net 30 Days'}
            </p>
            <p className="text-slate-700">
              <strong>Dispatch Timeline:</strong> {commercial.deliveryTimeline || 'Within 7 Working Days'}
            </p>
            <p className="text-slate-700">
              <strong>Price Guarantee:</strong> {commercial.priceValidity || '30 Days from issue date'}
            </p>
            {commercial.warrantyTerms && (
              <p className="text-slate-700">
                <strong>Warranty / Assurance:</strong> {commercial.warrantyTerms}
              </p>
            )}
            {commercial.notesOnTaxes && (
              <p className="text-slate-500 text-[11px] pt-1">
                Note: {commercial.notesOnTaxes}
              </p>
            )}
          </div>

          <div className="sm:w-1/2 bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Catalog Subtotal:</span>
              <span>{formatINR(summary.subtotal)}</span>
            </div>
            {summary.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discount Applied:</span>
                <span>- {formatINR(summary.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
              <span>Total Taxable Amount:</span>
              <span>{formatINR(summary.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Goods & Services Tax (GST):</span>
              <span>{formatINR(summary.totalTax)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Freight & Delivery:</span>
              <span>{formatINR(summary.shippingCharges || 0)}</span>
            </div>
            {summary.additionalCharges > 0 && (
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Handling / Packaging:</span>
                <span>{formatINR(summary.additionalCharges)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-900 font-sans font-black text-sm border-t-2 border-slate-900 pt-2">
              <span>Grand Total Payable:</span>
              <span className="text-lg font-mono text-[#1A2E0A]">{formatINR(summary.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Standard Terms */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 text-xs text-slate-600 space-y-1.5">
          <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
            GENERAL CONDITIONS OF CONTRACT
          </span>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>{terms.payment || 'Payment as per agreed commercial credit terms.'}</li>
            <li>{terms.delivery || 'Prices include delivery and unloading at designated point.'}</li>
            <li>{terms.validity || 'Quotation validity 30 days from issue date.'}</li>
            <li>{terms.taxes || 'GST applicable as per current tax schedules.'}</li>
            <li>{terms.other || 'All supplied items compliant with relevant Indian Quality Standards.'}</li>
          </ul>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end pt-8 border-t border-slate-200 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buyer Acceptance Confirmation</p>
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

      {/* Buyer Simulation Bar (for Demo / Review) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Buyer Review Actions Simulation:</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Test client response transitions in demo:</span>
        </div>

        <div className="flex items-center gap-2">
          {quotation.status !== 'Accepted' && quotation.status !== 'Converted to Order' && (
            <>
              <button
                type="button"
                onClick={() => acceptQuotation(quotation.id)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer border-none"
              >
                <CheckCircle2 size={13} />
                <span>Mark as Accepted</span>
              </button>
              <button
                type="button"
                onClick={() => rejectQuotation(quotation.id)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer border-none"
              >
                <XCircle size={13} />
                <span>Mark as Rejected</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
