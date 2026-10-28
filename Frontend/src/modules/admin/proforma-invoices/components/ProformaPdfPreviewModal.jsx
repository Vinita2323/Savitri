import React from 'react';
import { X, Download, Printer, Send, Eye, FileText } from 'lucide-react';
import { formatINR, formatDate, numberToWordsINR } from '../utils/proformaCalculations';

export const ProformaPdfPreviewModal = ({
  invoice,
  isOpen,
  onClose,
  onDownload,
  onPrint,
  onOpenSendEmail,
}) => {
  if (!isOpen || !invoice) return null;

  const client = invoice.clientSnapshot || {};
  const billing = client.billingAddress || {};
  const shipping = client.shippingAddress || {};
  const issuing = invoice.issuingCompany || {};
  const bank = issuing.bankDetails || {};
  const items = invoice.items || [];
  const summary = invoice.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Preview Control Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#1A2E0A] text-white shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#F7941D]" />
            <div>
              <h3 className="font-semibold text-sm">
                Proforma Invoice Preview — #{invoice.proformaNumber}
              </h3>
              <p className="text-[11px] text-slate-300">
                Official Commercial Document &bull; Valid Until {formatDate(invoice.validUntil)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(invoice)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download PDF directly"
            >
              <Download className="w-4 h-4 text-[#F7941D]" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => onPrint(invoice)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print PDF via iframe"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            {onOpenSendEmail && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSendEmail(invoice);
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#1A2E0A] bg-[#F7941D] hover:bg-amber-400 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 flex justify-center">
          <div className="w-full max-w-[780px] bg-white rounded-lg shadow-lg border border-slate-300 p-8 text-slate-800 font-sans text-xs">
            {/* 1. Header & Brand */}
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
                  <h1 className="text-base font-bold text-[#1A2E0A] tracking-wide m-0">
                    {issuing.name || 'SAVITRI B2B ENTERPRISE'}
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 m-0">
                    {issuing.legalName || 'Institutional Supply & Commercial Procurement Desk'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 m-0">
                    GSTIN: <span className="font-semibold text-slate-700">{issuing.gstin}</span> | CIN: {issuing.cin}
                  </p>
                  <p className="text-[10px] text-slate-500 m-0">
                    {issuing.address} | Support: {issuing.phone}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-[#F7941D] text-[#1A2E0A] font-bold text-[10px] px-3 py-1 rounded tracking-wider uppercase">
                  Proforma Invoice
                </span>
                <p className="text-[9px] text-slate-400 mt-1.5 italic">
                  Not a Tax Invoice under Section 31 CGST Act
                </p>
              </div>
            </div>

            {/* 2. Metadata Bar */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded p-2.5 my-3">
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 uppercase">Proforma #</span>
                <span className="text-xs font-bold text-slate-900 font-mono">{invoice.proformaNumber}</span>
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 uppercase">Issue Date</span>
                <span className="text-xs font-medium text-slate-800">{formatDate(invoice.issueDate)}</span>
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-rose-500 uppercase">Valid Until</span>
                <span className="text-xs font-bold text-rose-600">{formatDate(invoice.validUntil)}</span>
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 uppercase">Ref. Quote / Order</span>
                <span className="text-xs font-medium text-slate-700">
                  {invoice.referenceQuotation?.quotationNumber || invoice.referenceOrder?.orderNumber || 'Corporate Order'}
                </span>
              </div>
            </div>

            {/* 3. Client & Shipping info */}
            <div className="grid grid-cols-2 gap-4 my-3 text-[11px]">
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded">
                <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase tracking-wide mb-1">
                  Billed To (Buyer)
                </span>
                <div className="font-bold text-slate-900 text-xs">{client.companyName}</div>
                {client.contactPerson && <div className="text-slate-600">Attn: {client.contactPerson}</div>}
                <div className="text-slate-600">Ph: {client.phone} | {client.email}</div>
                <div className="text-slate-600 mt-1">
                  {[billing.addressLine1, billing.addressLine2, billing.city, billing.state, billing.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                <div className="font-semibold text-slate-800 mt-1">
                  GSTIN: {client.gstin || 'Unregistered / Consumer'}
                </div>
              </div>

              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded">
                <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase tracking-wide mb-1">
                  Shipped To (Consignee)
                </span>
                <div className="font-bold text-slate-900 text-xs">
                  {shipping.fullName || client.companyName}
                </div>
                <div className="text-slate-600">Contact: {shipping.phone || client.phone}</div>
                <div className="text-slate-600 mt-1">
                  {[shipping.addressLine1, shipping.addressLine2, shipping.city, shipping.state, shipping.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                <div className="font-semibold text-slate-800 mt-1">
                  Place of Supply: {billing.state || 'Madhya Pradesh'}
                </div>
              </div>
            </div>

            {/* 4. Products Table */}
            <div className="my-3 overflow-hidden border border-slate-200 rounded">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-[#1A2E0A] text-white">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8 font-semibold">#</th>
                    <th className="py-1.5 px-2 text-left font-semibold">Item &amp; Description</th>
                    <th className="py-1.5 px-2 text-center font-semibold">HSN</th>
                    <th className="py-1.5 px-2 text-center font-semibold">Qty</th>
                    <th className="py-1.5 px-2 text-right font-semibold">Unit Price</th>
                    <th className="py-1.5 px-2 text-right font-semibold">Disc.</th>
                    <th className="py-1.5 px-2 text-right font-semibold">Taxable</th>
                    <th className="py-1.5 px-2 text-center font-semibold">GST</th>
                    <th className="py-1.5 px-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-left">
                        <div className="font-semibold text-slate-800">{it.name}</div>
                        {it.description && <div className="text-[10px] text-slate-500">{it.description}</div>}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-600 font-mono text-[10px]">{it.hsn || '-'}</td>
                      <td className="py-1.5 px-2 text-center text-slate-700">{it.quantity} {it.unit}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">{formatINR(it.unitPrice)}</td>
                      <td className="py-1.5 px-2 text-right text-rose-600">{it.discountAmount > 0 ? formatINR(it.discountAmount) : '-'}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">{formatINR(it.taxableAmount)}</td>
                      <td className="py-1.5 px-2 text-center text-slate-600">{it.gstRate}%</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatINR(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. Summary & Bank Details */}
            <div className="grid grid-cols-2 gap-4 my-3 text-[11px]">
              {/* Bank Details & Words */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded flex flex-col justify-between">
                <div>
                  <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase tracking-wide mb-1">
                    Amount In Words
                  </span>
                  <div className="text-slate-800 font-medium italic mb-3">
                    {numberToWordsINR(summary.grandTotal)}
                  </div>

                  <span className="block font-bold text-[#1A2E0A] text-[10px] uppercase tracking-wide mb-1">
                    Bank Wire Remittance (NEFT / RTGS)
                  </span>
                  <div className="text-slate-700 space-y-0.5 text-[10px]">
                    <div><strong>Bank:</strong> {bank.bankName || 'HDFC Bank Ltd.'}</div>
                    <div><strong>Account Name:</strong> {bank.accountName || 'Savitri Enterprise B2B Solutions'}</div>
                    <div><strong>Account No:</strong> <span className="font-mono font-bold">{bank.accountNumber || '50200088921473'}</span></div>
                    <div><strong>IFSC Code:</strong> <span className="font-mono font-bold">{bank.ifscCode || 'HDFC0001248'}</span></div>
                    <div><strong>Branch:</strong> {bank.branch || 'Sanwer Road Industrial Area, Indore'}</div>
                    <div><strong>UPI ID:</strong> {bank.upiId || 'savitrient@hdfcbank'}</div>
                  </div>
                </div>
              </div>

              {/* Summary Breakdown */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Gross):</span>
                  <span>{formatINR(summary.subtotal)}</span>
                </div>
                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discounts:</span>
                    <span>-{formatINR(summary.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Net Taxable Value:</span>
                  <span>{formatINR(summary.taxableAmount)}</span>
                </div>
                {summary.cgstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (Central Tax):</span>
                    <span>{formatINR(summary.cgstAmount)}</span>
                  </div>
                )}
                {summary.sgstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (State Tax):</span>
                    <span>{formatINR(summary.sgstAmount)}</span>
                  </div>
                )}
                {summary.igstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (Integrated Tax):</span>
                    <span>{formatINR(summary.igstAmount)}</span>
                  </div>
                )}
                {summary.shippingCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Freight / Shipping:</span>
                    <span>{formatINR(summary.shippingCharges)}</span>
                  </div>
                )}
                {summary.additionalCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Handling / Additional:</span>
                    <span>{formatINR(summary.additionalCharges)}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-1.5 flex justify-between text-sm font-bold text-[#1A2E0A]">
                  <span>Grand Total:</span>
                  <span className="font-mono">{formatINR(summary.grandTotal)}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 flex justify-between text-xs font-bold text-emerald-800">
                  <span>Advance Required ({summary.advancePercentage || 50}%):</span>
                  <span className="font-mono">{formatINR(summary.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Balance Payable Prior to Dispatch:</span>
                  <span className="font-mono font-semibold">{formatINR(summary.balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* 6. Terms & Signatory */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 my-2 text-[10px]">
              <div className="col-span-2 text-slate-500 leading-relaxed pr-2">
                <span className="block font-bold text-slate-700 uppercase tracking-wide mb-0.5">
                  Commercial Stipulations &amp; Terms
                </span>
                <p className="whitespace-pre-line m-0">
                  {invoice.termsAndConditions ||
                    '1. This is a Proforma Invoice and represents a commercial quotation / preliminary demand note. It is NOT a tax invoice under Section 31 of CGST Act, 2017.\n2. Goods allocation and dispatch will be initiated strictly upon receipt of advance payment.'}
                </p>
              </div>
              <div className="text-right flex flex-col justify-between">
                <div>
                  <span className="block font-bold text-[#1A2E0A] text-[10px]">
                    FOR SAVITRI B2B ENTERPRISE
                  </span>
                  <span className="text-[9px] text-slate-400">Authorized Procurement Desk</span>
                </div>
                <div className="mt-8 border-t border-slate-300 pt-1 font-bold text-slate-700 text-[10px]">
                  Authorized Signatory
                </div>
              </div>
            </div>

            {/* 7. Footer note */}
            <div className="text-center border-t border-slate-100 pt-2 text-[9px] text-slate-400">
              Proforma Invoice #{invoice.proformaNumber} &bull; Generated via Savitri Enterprise Logistics &bull; Page 1 of 1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProformaPdfPreviewModal;
