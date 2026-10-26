import React from 'react';
import { Receipt, Truck, PlusCircle, ShieldCheck, Tag } from 'lucide-react';
import { formatINR } from '../utils/quotationCalculations';

export const QuotationSummary = ({
  summary,
  overallDiscount,
  onChangeOverallDiscount,
  shippingCharges,
  onChangeShippingCharges,
  additionalCharges,
  onChangeAdditionalCharges,
  isReadOnly = false,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Receipt size={17} className="text-[#F7941D]" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Financial & Commercial Summary
        </h4>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-slate-600">
          <span>Catalog Subtotal:</span>
          <span className="font-mono font-bold text-slate-900">{formatINR(summary.subtotal)}</span>
        </div>

        {/* Item Discounts */}
        {summary.lineDiscountTotal > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span>Item Line Discounts:</span>
            <span className="font-mono font-semibold">- {formatINR(summary.lineDiscountTotal)}</span>
          </div>
        )}

        {/* Overall Commercial Discount */}
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Tag size={13} className="text-[#F7941D]" />
            <span>Additional Overall Discount:</span>
          </div>
          {isReadOnly ? (
            <span className="font-mono font-bold text-emerald-700">- {formatINR(overallDiscount)}</span>
          ) : (
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="50"
                value={overallDiscount}
                onChange={(e) => onChangeOverallDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-6 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 text-right outline-none focus:border-[#F7941D]"
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* Taxable Amount */}
        <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-slate-700 font-semibold">
          <span>Total Taxable Amount:</span>
          <span className="font-mono text-slate-900">{formatINR(summary.taxableAmount)}</span>
        </div>

        {/* GST Breakdown */}
        <div className="rounded-xl bg-slate-50 p-2.5 space-y-1.5 border border-slate-200/60">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Applicable Goods & Services Tax (GST)</span>
            <span>{summary.isIntraState ? 'CGST + SGST (MP Intra-State)' : 'IGST (Inter-State)'}</span>
          </div>

          {summary.isIntraState ? (
            <>
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>Central GST (CGST):</span>
                <span className="font-mono font-medium text-slate-800">{formatINR(summary.cgstAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>State GST (SGST):</span>
                <span className="font-mono font-medium text-slate-800">{formatINR(summary.sgstAmount)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>Integrated GST (IGST):</span>
              <span className="font-mono font-medium text-slate-800">{formatINR(summary.igstAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-800 font-bold border-t border-slate-200/80 pt-1 text-xs">
            <span>Total Taxes:</span>
            <span className="font-mono">{formatINR(summary.totalTax)}</span>
          </div>
        </div>

        {/* Shipping & Freight */}
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Truck size={13} className="text-[#F7941D]" />
            <span>Shipping / Freight Charges:</span>
          </div>
          {isReadOnly ? (
            <span className="font-mono font-bold text-slate-900">{formatINR(shippingCharges)}</span>
          ) : (
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="50"
                value={shippingCharges}
                onChange={(e) => onChangeShippingCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-6 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 text-right outline-none focus:border-[#F7941D]"
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* Additional Charges */}
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-1.5 text-slate-600">
            <PlusCircle size={13} className="text-[#F7941D]" />
            <span>Handling / Packaging Charges:</span>
          </div>
          {isReadOnly ? (
            <span className="font-mono font-bold text-slate-900">{formatINR(additionalCharges)}</span>
          ) : (
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="50"
                value={additionalCharges}
                onChange={(e) => onChangeAdditionalCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-6 pr-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 text-right outline-none focus:border-[#F7941D]"
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* Round Off */}
        {summary.roundOff !== 0 && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Rounding Adjustment:</span>
            <span className="font-mono">{summary.roundOff > 0 ? `+${summary.roundOff}` : summary.roundOff}</span>
          </div>
        )}

        {/* Grand Total Highlight */}
        <div className="rounded-xl bg-[#1A2E0A] p-4 text-white shadow-sm flex items-center justify-between mt-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#F7941D] block">
              Final Quotation Payable Value
            </span>
            <span className="text-xs text-slate-300">All Taxes & Delivery Charges Included</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-mono tracking-tight text-white block">
              {formatINR(summary.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
        <span>GST invoice breakdown compliant with Indian Goods & Services Tax rules.</span>
      </div>
    </div>
  );
};
