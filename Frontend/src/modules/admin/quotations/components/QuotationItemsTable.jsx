import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { GST_RATES, PRODUCT_UNITS } from '../data/mockQuotations';
import { formatINR, calculateLineItem } from '../utils/quotationCalculations';

export const QuotationItemsTable = ({ items, onChangeItems }) => {
  // Add blank custom row
  const handleAddRow = () => {
    const newRow = {
      id: `item-${Date.now()}`,
      name: '',
      sku: '',
      description: '',
      hsn: '',
      quantity: 1,
      unit: 'Pcs',
      unitPrice: 0,
      discountType: 'percentage',
      discountValue: 0,
      gstRate: 5,
      taxableAmount: 0,
      taxAmount: 0,
      lineTotal: 0,
    };
    onChangeItems([...items, newRow]);
  };

  // Update specific field in a row
  const handleFieldChange = (index, field, value) => {
    const updated = items.map((it, idx) => {
      if (idx !== index) return it;
      const modified = { ...it, [field]: value };
      return calculateLineItem(modified);
    });
    onChangeItems(updated);
  };

  // Remove row
  const handleRemoveRow = (index) => {
    if (items.length <= 1) {
      // Clear instead of removing last row to keep table usable
      onChangeItems([
        {
          id: `item-${Date.now()}`,
          name: '',
          sku: '',
          description: '',
          hsn: '',
          quantity: 1,
          unit: 'Pcs',
          unitPrice: 0,
          discountType: 'percentage',
          discountValue: 0,
          gstRate: 5,
          taxableAmount: 0,
          taxAmount: 0,
          lineTotal: 0,
        },
      ]);
      return;
    }
    onChangeItems(items.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse text-xs font-sans min-w-[950px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[240px]">Product / Specification</th>
              <th className="py-3 px-3 w-28">HSN / SAC</th>
              <th className="py-3 px-3 w-24">Qty</th>
              <th className="py-3 px-3 w-24">Unit</th>
              <th className="py-3 px-3 w-28">Unit Price (₹)</th>
              <th className="py-3 px-3 w-28">Disc (%)</th>
              <th className="py-3 px-3 w-28">GST Rate</th>
              <th className="py-3 px-3 w-28 text-right">Taxable (₹)</th>
              <th className="py-3 px-3 w-32 text-right">Line Total (₹)</th>
              <th className="py-3 px-3 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>

                {/* Name, SKU & Description */}
                <td className="py-3 px-3">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    placeholder="Enter item name *"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#F7941D] mb-1"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => handleFieldChange(idx, 'sku', e.target.value)}
                      placeholder="SKU / Item Code"
                      className="w-1/3 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-mono text-slate-600 placeholder:text-slate-400 outline-none focus:border-[#F7941D]"
                    />
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                      placeholder="Technical specification / packaging detail"
                      className="w-2/3 px-2 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600 placeholder:text-slate-400 outline-none focus:border-[#F7941D]"
                    />
                  </div>
                </td>

                {/* HSN */}
                <td className="py-3 px-3">
                  <input
                    type="text"
                    value={item.hsn}
                    onChange={(e) => handleFieldChange(idx, 'hsn', e.target.value)}
                    placeholder="e.g. 11010000"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 outline-none focus:border-[#F7941D]"
                  />
                </td>

                {/* Qty */}
                <td className="py-3 px-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleFieldChange(idx, 'quantity', Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:border-[#F7941D]"
                  />
                </td>

                {/* Unit */}
                <td className="py-3 px-3">
                  <select
                    value={item.unit}
                    onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none focus:border-[#F7941D] cursor-pointer"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Unit Price */}
                <td className="py-3 px-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleFieldChange(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:border-[#F7941D]"
                  />
                </td>

                {/* Discount % */}
                <td className="py-3 px-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={item.discountValue}
                    onChange={(e) => handleFieldChange(idx, 'discountValue', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#F7941D]"
                    placeholder="0%"
                  />
                </td>

                {/* GST Rate */}
                <td className="py-3 px-3">
                  <select
                    value={item.gstRate}
                    onChange={(e) => handleFieldChange(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-[#F7941D] cursor-pointer"
                  >
                    {GST_RATES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.value}% GST
                      </option>
                    ))}
                  </select>
                </td>

                {/* Taxable Amount */}
                <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">
                  {formatINR(item.taxableAmount)}
                </td>

                {/* Line Total */}
                <td className="py-3 px-3 text-right font-mono text-xs font-bold text-slate-900">
                  {formatINR(item.lineTotal)}
                </td>

                {/* Delete */}
                <td className="py-3 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    title="Remove item row"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row Button */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-[#F7941D] bg-[#F7941D]/5 text-[#1A2E0A] text-xs font-bold hover:bg-[#F7941D]/15 transition-all cursor-pointer"
        >
          <Plus size={14} className="text-[#F7941D]" />
          <span>Add Custom Product Row</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Total Line Items: <strong className="text-slate-800">{items.length}</strong>
        </span>
      </div>
    </div>
  );
};
