import React, { useState } from 'react';
import { X, Download, Printer, CheckCircle, Truck, FileText } from 'lucide-react';
import ChallanStatusBadge from './ChallanStatusBadge';
import { downloadDeliveryChallanPdf, printDeliveryChallanPdf, formatDate } from '../utils/deliveryChallanPdfGenerator';

export const DeliveryChallanPreviewModal = ({ isOpen, onClose, challan }) => {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  if (!isOpen || !challan) return null;

  const client = challan.clientSnapshot || {};
  const shipping = client.shippingAddress || {};
  const billing = client.billingAddress || {};
  const transport = challan.transportDetails || {};
  const items = challan.items || [];
  const issuing = challan.issuingCompany || {
    name: 'SAVITRI B2B ENTERPRISE',
    legalName: 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform',
    address: 'Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015',
    phone: '+91 731 498 7720',
    email: 'dispatch@savitri.com',
    gstin: '23AAACS9981K1ZP',
    cin: 'U74999MP2025PTC049102',
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadDeliveryChallanPdf(challan);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      await printDeliveryChallanPdf(challan);
    } catch (e) {
      console.error(e);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1A2E0A] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7941D] rounded-lg text-white">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Delivery Challan Preview</span>
                <span className="text-xs px-2 py-0.5 rounded-sm bg-white/20 font-mono">
                  {challan.challanNumber || 'DC-DRAFT'}
                </span>
              </h3>
              <p className="text-xs text-emerald-200">
                Rule 55 CGST Compliant Official Dispatch Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F7941D] text-white hover:bg-[#d97d0e] transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download size={14} className={downloading ? 'animate-bounce' : ''} />
              <span>{downloading ? 'Saving...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Document Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50">
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 font-sans">
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-start gap-3.5">
                <img
                  src="/LogoSavitri.png"
                  alt="Savitri Logo"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div>
                  <h2 className="text-lg font-black text-[#1A2E0A] uppercase tracking-wide">
                    {issuing.name}
                  </h2>
                  <p className="text-xs text-slate-600 max-w-md">
                    {issuing.legalName}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md">
                    {issuing.address}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                    GSTIN: <span className="font-semibold">{issuing.gstin}</span> | CIN: {issuing.cin}
                  </p>
                </div>
              </div>

              <div className="sm:text-right shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-sm bg-[#1A2E0A] text-white tracking-wider">
                  DELIVERY CHALLAN
                </span>
                <p className="text-xs font-bold text-slate-900 mt-2 font-mono">
                  {challan.challanNumber || 'DC-PREVIEW'}
                </p>
                <p className="text-xs text-slate-600">
                  Date: <span className="font-semibold text-slate-800">{formatDate(challan.challanDate)}</span>
                </p>
                <div className="mt-2">
                  <ChallanStatusBadge status={challan.status || 'Draft'} size="sm" />
                </div>
              </div>
            </div>

            {/* Consignee, Delivery Destination & Order Ref */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Consignee */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-[#1A2E0A] uppercase tracking-wider">
                  Consignee / Client
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {client.companyName || client.name || 'Valued Customer'}
                </p>
                <p className="text-slate-600">Phone: {client.phone || '-'}</p>
                <p className="text-slate-600">Email: {client.email || '-'}</p>
                <p className="font-mono text-slate-700">
                  GSTIN: {client.gstin || 'Consumer / Unregistered'}
                </p>
              </div>

              {/* Delivery Destination */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-[#1A2E0A] uppercase tracking-wider">
                  Delivery Destination
                </p>
                <p className="font-semibold text-slate-900">
                  {shipping.fullName || client.name || 'Recipient'}
                </p>
                <p className="text-slate-600">
                  {[shipping.addressLine1, shipping.addressLine2].filter(Boolean).join(', ') || 'Indore'}
                </p>
                <p className="text-slate-600">
                  {[shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(', ') || 'Madhya Pradesh'}
                </p>
                <p className="text-slate-600">Contact: {shipping.phone || client.phone || '-'}</p>
              </div>

              {/* Order & Transport Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-[#1A2E0A] uppercase tracking-wider">
                  Linked Order & Purpose
                </p>
                <p className="text-slate-900 font-bold font-mono">
                  Order #{challan.orderNumber || '-'}
                </p>
                <p className="text-slate-600">
                  Order Date: {formatDate(challan.orderDate)}
                </p>
                <p className="text-slate-700 font-medium">
                  Purpose: <span className="font-bold text-[#F7941D]">{challan.purpose || 'Supply on Sale'}</span>
                </p>
                <p className="text-slate-600">
                  Vehicle: {transport.vehicleNumber || 'Local Fleet'}
                </p>
              </div>
            </div>

            {/* Transport Details Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-900 block">Transporter</span>
                <span className="font-medium">{transport.transporterName || 'Self / In-House'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-900 block">Vehicle No</span>
                <span className="font-medium font-mono">{transport.vehicleNumber || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-900 block">LR / Docket No</span>
                <span className="font-medium font-mono">{transport.lrNumber || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-900 block">E-Way Bill No</span>
                <span className="font-medium font-mono">{transport.ewayBillNumber || 'N/A'}</span>
              </div>
            </div>

            {/* Goods Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1A2E0A] text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">HSN</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Prev. Disp</th>
                    <th className="py-2.5 px-3 text-center font-bold bg-[#2A4515]">This Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        {item.variantTitle && (
                          <span className="text-[11px] text-slate-500">Variant: {item.variantTitle}</span>
                        )}
                        {item.sku && (
                          <span className="text-[11px] font-mono text-slate-400 ml-2">SKU: {item.sku}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.hsn || '-'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'Units'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{item.orderedQuantity}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{item.previouslyDispatchedQuantity || 0}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-800 bg-emerald-50/50">
                        {item.dispatchedQuantity}
                      </td>
                    </tr>
                  ))}
                  {/* Summary row */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      TOTAL DISPATCHED QUANTITY
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      {items.reduce((sum, i) => sum + (Number(i.orderedQuantity) || 0), 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-center text-emerald-900 bg-amber-100 font-black text-sm">
                      {challan.totalDispatchedQuantity ||
                        items.reduce((sum, i) => sum + (Number(i.dispatchedQuantity) || 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms and Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Statutory Declaration & Terms
                </p>
                <p>
                  1. Issued under Rule 55 of CGST Rules, 2017 for goods movement.
                </p>
                <p>
                  2. Goods have been dispatched in good condition under seal.
                </p>
                <p>
                  3. Please inspect packages and acknowledge receipt with signature and official stamp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-28 bg-slate-50/30">
                  <span className="font-bold text-slate-700">Receiver's Seal & Signature</span>
                  <div className="border-t border-slate-300 pt-1 text-slate-500">
                    Received in Good Order
                  </div>
                </div>
                <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-28 bg-slate-50/30">
                  <span className="font-bold text-[#1A2E0A]">For SAVITRI B2B ENTERPRISE</span>
                  <div className="border-t border-slate-300 pt-1 text-slate-500">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-100 border-t border-slate-200 shrink-0">
          <span className="text-xs text-slate-500">
            Previewing official dispatch document format
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Close Preview
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1A2E0A] text-white hover:bg-[#2A4515] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallanPreviewModal;
