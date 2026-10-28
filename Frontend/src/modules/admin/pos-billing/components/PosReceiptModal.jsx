import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePos } from '../context/PosContext';
import {
  downloadPosReceiptPdf,
  printPosReceiptDocument,
} from '../utils/posPdfGenerator';
import {
  X,
  Printer,
  FileDown,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  FileText,
  Receipt,
} from 'lucide-react';

export const PosReceiptModal = () => {
  const navigate = useNavigate();
  const {
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    lastCompletedSale,
    setLastCompletedSale,
    showAlert,
  } = usePos();

  const [receiptFormat, setReceiptFormat] = useState('THERMAL'); // 'THERMAL' | 'A4'
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  if (!isReceiptModalOpen || !lastCompletedSale) return null;

  const sale = lastCompletedSale;
  const store = sale.store || {};
  const customer = sale.customer || {};
  const items = sale.items || [];
  const payment = sale.payment || {};
  const isDelivery = sale.saleType === 'DELIVERY_ORDER';

  // 1. Isolated Iframe Print
  const handlePrint = () => {
    const el = document.getElementById('pos-printable-receipt');
    printPosReceiptDocument(
      el,
      receiptFormat,
      `Receipt-${sale.invoiceNumber || 'POS'}`
    );
  };

  // 2. Direct PDF Download
  const handleDownloadPdf = async (formatToDownload = receiptFormat) => {
    setIsDownloading(true);
    setShowDownloadOptions(false);
    try {
      const ok = downloadPosReceiptPdf(sale, formatToDownload);
      if (ok) {
        if (showAlert) {
          showAlert(
            `Downloaded ${formatToDownload === 'THERMAL' ? 'Thermal Receipt' : 'A4 Tax Invoice'} PDF!`,
            'success'
          );
        }
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      if (showAlert) showAlert('Failed to download PDF: ' + err.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNewSale = () => {
    setIsReceiptModalOpen(false);
    setLastCompletedSale(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Modal Top Bar */}
        <div className="bg-gray-50 px-6 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Sale Completed
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {sale.invoiceNumber}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                {new Date(sale.createdAt || Date.now()).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="flex items-center gap-1 bg-gray-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReceiptFormat('THERMAL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  receiptFormat === 'THERMAL'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setReceiptFormat('A4')}
                className={`px-3 py-1 rounded-md transition-all ${
                  receiptFormat === 'A4'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                A4 Tax Invoice
              </button>
            </div>

            <button
              type="button"
              onClick={handleNewSale}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50 flex justify-center">
          {/* THERMAL 80MM RECEIPT */}
          {receiptFormat === 'THERMAL' ? (
            <div
              id="pos-printable-receipt"
              className="w-[340px] bg-white p-5 shadow-sm border border-gray-200 font-mono text-xs text-gray-800 space-y-3 leading-tight"
            >
              {/* Store Header */}
              <div className="text-center pb-2 border-b border-dashed border-gray-300">
                <h2 className="text-sm font-bold text-gray-900 uppercase">
                  {store.storeName || 'SHIPPEX RETAIL'}
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">{store.address}</p>
                <p className="text-[10px] text-gray-500">Phone: {store.phone}</p>
                {store.gstin && (
                  <p className="text-[10px] font-bold text-gray-600">GSTIN: {store.gstin}</p>
                )}
                <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 uppercase">
                  {isDelivery ? 'Delivery Order Bill' : 'Retail POS Counter Sale'}
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice No:</span>
                  <span className="font-bold">{sale.invoiceNumber}</span>
                </div>
                {isDelivery && sale.orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Ref:</span>
                    <span className="font-bold">{sale.orderId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Date/Time:</span>
                  <span>{new Date(sale.createdAt || Date.now()).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span>{customer.name || 'Walk-in Customer'}</span>
                </div>
                {customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span>+91 {customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="pb-2 border-b border-dashed border-gray-300">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left pb-1 font-semibold">Item</th>
                      <th className="text-center pb-1 font-semibold">Qty</th>
                      <th className="text-right pb-1 font-semibold">Price</th>
                      <th className="text-right pb-1 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="py-1">
                        <td className="py-1 pr-1 font-sans">
                          <div className="font-medium line-clamp-1">{it.name}</div>
                          {it.discountPercent > 0 && (
                            <span className="text-[9px] text-emerald-700 block">
                              Disc {it.discountPercent}% off
                            </span>
                          )}
                        </td>
                        <td className="text-center py-1 font-bold">{it.quantity}</td>
                        <td className="text-right py-1">₹{it.salePrice}</td>
                        <td className="text-right py-1 font-bold">₹{it.lineTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-gray-300">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{sale.subtotal?.toFixed(2)}</span>
                </div>

                {sale.itemDiscountsTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Item Discounts:</span>
                    <span>-₹{sale.itemDiscountsTotal?.toFixed(2)}</span>
                  </div>
                )}

                {sale.billDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Bill Discount:</span>
                    <span>-₹{sale.billDiscountAmount?.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>GST Total:</span>
                  <span>₹{sale.gstTotal?.toFixed(2)}</span>
                </div>

                {isDelivery && (
                  <div className="flex justify-between text-indigo-700 font-semibold">
                    <span>Delivery Fee:</span>
                    <span>₹{sale.deliveryCharge || 0}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1 border-t border-gray-200">
                  <span>GRAND TOTAL:</span>
                  <span>₹{sale.grandTotal?.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Mode:</span>
                  <span className="font-bold">{payment.method || 'CASH'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Tendered:</span>
                  <span>₹{payment.amountReceived?.toFixed(2) || '0.00'}</span>
                </div>
                {payment.balanceDue > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Balance Due:</span>
                    <span>₹{payment.balanceDue?.toFixed(2)}</span>
                  </div>
                )}
                {payment.referenceNumber && (
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Ref/UTR:</span>
                    <span>{payment.referenceNumber}</span>
                  </div>
                )}
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-1 text-[10px] text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">*** Thank You for Shopping! ***</p>
                <p>Goods once sold can be returned within 7 days in original condition.</p>
                <p className="font-mono text-[9px] text-gray-400">Powered by ShippNex POS</p>
              </div>
            </div>
          ) : (
            /* A4 TAX INVOICE FORMAT */
            <div
              id="pos-printable-receipt"
              className="w-full bg-white p-8 rounded-lg shadow-sm border border-gray-200 font-sans text-xs text-gray-800 space-y-6"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-emerald-800">
                    {store.storeName || 'SHIPPEX E-COMMERCE'}
                  </h1>
                  <p className="text-gray-500 text-xs mt-1">{store.address}</p>
                  <p className="text-gray-500 text-xs">Phone: {store.phone}</p>
                  {store.gstin && (
                    <p className="text-xs font-bold text-gray-700 mt-1">
                      GSTIN / UIN: {store.gstin}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
                    TAX INVOICE
                  </span>
                  <div className="mt-3 text-xs space-y-0.5">
                    <p>
                      <strong>Invoice No:</strong> {sale.invoiceNumber}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN')}
                    </p>
                    {isDelivery && sale.orderId && (
                      <p>
                        <strong>Order Ref:</strong> {sale.orderId}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">
                    Customer / Billed To
                  </h4>
                  <p className="font-bold text-gray-900 text-xs">{customer.name}</p>
                  {customer.phone && <p className="text-gray-600">Phone: +91 {customer.phone}</p>}
                  {customer.email && <p className="text-gray-600">{customer.email}</p>}
                </div>
                {isDelivery && (
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">
                      Shipping / Delivery Address
                    </h4>
                    <p className="text-gray-700 text-xs">
                      {customer.shippingAddress?.addressLine1 || 'Walk-in counter sale'}
                      {customer.shippingAddress?.city && `, ${customer.shippingAddress.city}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Item & Description</th>
                    <th className="py-2 px-3 text-center">HSN/SKU</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">GST Rate</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-gray-900">{it.name}</div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-gray-500">
                        {it.sku || '-'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{it.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">₹{it.salePrice}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{it.taxRate || 5}%</td>
                      <td className="py-2 px-3 text-right font-bold font-mono">₹{it.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Bottom Grid */}
              <div className="flex justify-between items-start gap-6 pt-2">
                <div className="flex-1 text-gray-500 text-xs space-y-1">
                  <p>
                    <strong>Payment Mode:</strong> {payment.method} ({payment.status})
                  </p>
                  {payment.referenceNumber && (
                    <p>
                      <strong>Transaction Ref:</strong> {payment.referenceNumber}
                    </p>
                  )}
                  <p className="mt-4 text-[10px]">
                    Certified that the particulars given above are true and correct.
                  </p>
                </div>

                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Value:</span>
                    <span>₹{sale.taxableAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST:</span>
                    <span>₹{(sale.gstTotal / 2)?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST:</span>
                    <span>₹{(sale.gstTotal / 2)?.toFixed(2)}</span>
                  </div>
                  {isDelivery && (
                    <div className="flex justify-between text-indigo-700 font-medium">
                      <span>Delivery Charge:</span>
                      <span>₹{sale.deliveryCharge || 0}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-300">
                    <span>Total Invoice Value:</span>
                    <span>₹{sale.grandTotal?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            {/* Download PDF Split Dropdown */}
            <div className="relative inline-flex">
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => handleDownloadPdf(receiptFormat)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-l-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
              >
                <FileDown className="w-4 h-4" />
                <span>
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                className="px-2 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-r-xl border-l border-blue-500 text-xs transition-colors"
                title="Choose PDF Format"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {showDownloadOptions && (
                <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                    Select PDF Format
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('A4')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-gray-800 font-semibold"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>A4 Tax Invoice (PDF)</div>
                      <div className="text-[10px] text-gray-400 font-normal">Full GST breakdown format</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('THERMAL')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-gray-800 font-semibold mt-0.5"
                  >
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <div>
                      <div>80mm Thermal Slip (PDF)</div>
                      <div className="text-[10px] text-gray-400 font-normal">Roll receipt printer size</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {isDelivery && sale.orderId && (
              <button
                type="button"
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  navigate('/super-admin/pos-billing/history');
                }}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1 border border-indigo-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Order</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewSale}
            className="px-5 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Sale / Next Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosReceiptModal;
