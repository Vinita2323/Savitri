import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Building,
  Layers,
  IndianRupee,
  Info,
  Copy,
} from 'lucide-react';
import { useProformaInvoice } from '../context/ProformaInvoiceContext';
import { calculateProformaSummary, formatINR, formatDate } from '../utils/proformaCalculations';

const GST_RATES = [
  { label: '0% (Exempt)', value: 0 },
  { label: '5% (Essential Goods)', value: 5 },
  { label: '12% (Concessional)', value: 12 },
  { label: '18% (Standard Rate)', value: 18 },
  { label: '28% (Luxury Goods)', value: 28 },
];

const UNIT_OPTIONS = ['Units', 'Pcs', 'Kg', 'Litre', 'Box', 'Pack', 'Set', 'Carton', 'Ton', 'Meter'];

export const EditProformaInvoice = ({ onNavigate, proformaData }) => {
  const { selectedInvoice, updateInvoice, duplicateInvoice, fetchInvoiceById } = useProformaInvoice();

  const [invoice, setInvoice] = useState(proformaData || selectedInvoice || null);
  const [loading, setLoading] = useState(!invoice);

  // Form states
  const [issueDate, setIssueDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [clientSnapshot, setClientSnapshot] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    billingAddress: {
      addressLine1: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
    },
    shippingAddress: {
      addressLine1: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
    },
  });

  const [items, setItems] = useState([]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [shippingCharges, setShippingCharges] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [advancePercentage, setAdvancePercentage] = useState(50);
  const [manualAdvanceAmount, setManualAdvanceAmount] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch or initialize
  useEffect(() => {
    const initData = (data) => {
      if (!data) return;
      setInvoice(data);
      setIssueDate(data.issueDate ? data.issueDate.slice(0, 10) : '');
      setValidUntil(data.validUntil ? data.validUntil.slice(0, 10) : '');
      if (data.clientSnapshot) {
        setClientSnapshot({
          companyName: data.clientSnapshot.companyName || '',
          contactPerson: data.clientSnapshot.contactPerson || '',
          phone: data.clientSnapshot.phone || '',
          email: data.clientSnapshot.email || '',
          gstin: data.clientSnapshot.gstin || '',
          pan: data.clientSnapshot.pan || '',
          billingAddress: data.clientSnapshot.billingAddress || {
            addressLine1: '',
            city: 'Indore',
            state: 'Madhya Pradesh',
            pincode: '452001',
          },
          shippingAddress: data.clientSnapshot.shippingAddress || {
            addressLine1: '',
            city: 'Indore',
            state: 'Madhya Pradesh',
            pincode: '452001',
          },
        });
      }
      if (data.items) {
        setItems(data.items);
      }
      setOverallDiscount(data.overallDiscount || 0);
      setShippingCharges(data.shippingCharges || 0);
      setAdditionalCharges(data.additionalCharges || 0);
      setAdvancePercentage(data.advancePercentage || data.summary?.advancePercentage || 50);
      setManualAdvanceAmount(data.manualAdvanceAmount || '');
      setPaymentTerms(data.paymentTerms || '');
      setDeliveryTerms(data.deliveryTerms || '');
      setNotes(data.notes || '');
      setTermsAndConditions(data.termsAndConditions || '');
    };

    if (proformaData) {
      initData(proformaData);
      setLoading(false);
    } else if (selectedInvoice) {
      initData(selectedInvoice);
      setLoading(false);
    }
  }, [proformaData, selectedInvoice]);

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        description: '',
        sku: '',
        hsn: '',
        quantity: 1,
        unit: 'Units',
        unitPrice: 0,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const financialSummary = useMemo(() => {
    const buyerState = clientSnapshot.billingAddress?.state || 'Madhya Pradesh';
    return calculateProformaSummary(
      items,
      overallDiscount,
      shippingCharges,
      additionalCharges,
      advancePercentage,
      manualAdvanceAmount ? Number(manualAdvanceAmount) : null,
      buyerState,
      invoice?.payment?.amountPaid || 0
    );
  }, [
    items,
    overallDiscount,
    shippingCharges,
    additionalCharges,
    advancePercentage,
    manualAdvanceAmount,
    clientSnapshot.billingAddress?.state,
    invoice?.payment?.amountPaid,
  ]);

  const handleSave = async (targetStatus = 'Draft') => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!clientSnapshot.companyName.trim()) {
      setErrorMsg('Client / Company Name is required.');
      return;
    }
    if (!items || items.length === 0 || !items.some((i) => i.name.trim())) {
      setErrorMsg('At least one item is required.');
      return;
    }

    const payload = {
      issueDate,
      validUntil,
      clientSnapshot,
      items,
      overallDiscount: Number(overallDiscount) || 0,
      shippingCharges: Number(shippingCharges) || 0,
      additionalCharges: Number(additionalCharges) || 0,
      advancePercentage: Number(advancePercentage) || 50,
      manualAdvanceAmount: manualAdvanceAmount ? Number(manualAdvanceAmount) : null,
      paymentTerms,
      deliveryTerms,
      notes,
      termsAndConditions,
      status: targetStatus,
      summary: {
        subtotal: financialSummary.subtotal,
        totalDiscount: financialSummary.totalDiscount,
        taxableAmount: financialSummary.taxableAmount,
        cgstAmount: financialSummary.cgstAmount,
        sgstAmount: financialSummary.sgstAmount,
        igstAmount: financialSummary.igstAmount,
        totalTax: financialSummary.totalTax,
        shippingCharges: financialSummary.shippingCharges,
        additionalCharges: financialSummary.additionalCharges,
        roundOff: financialSummary.roundOff,
        grandTotal: financialSummary.grandTotal,
        advancePercentage: financialSummary.advancePercentage,
        advanceAmount: financialSummary.advanceAmount,
        balanceDue: financialSummary.balanceDue,
      },
    };

    try {
      setIsSubmitting(true);
      const res = await updateInvoice(invoice._id, payload);
      if (res && res.success) {
        setSuccessMsg('Proforma Invoice updated successfully.');
        setTimeout(() => {
          onNavigate('proforma-invoices/details', res.invoice || { ...invoice, ...payload });
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update Proforma Invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      setIsSubmitting(true);
      const res = await duplicateInvoice(invoice._id);
      if (res && res.invoice) {
        onNavigate('proforma-invoices/edit', res.invoice);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to duplicate invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#F7941D] mb-2" />
        <p className="text-sm font-normal">Loading Proforma Invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-base font-semibold text-slate-800">No Proforma Invoice Selected</p>
        <button
          onClick={() => onNavigate('proforma-invoices')}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#1A2E0A] rounded-xl cursor-pointer"
        >
          Return to List
        </button>
      </div>
    );
  }

  // Guard against non-draft edits
  if (invoice.status !== 'Draft') {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-3">
          <div className="flex items-center gap-2.5 font-semibold text-base">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Document Locked from Direct Editing ({invoice.status})</span>
          </div>
          <p className="text-sm font-normal leading-relaxed text-amber-800">
            Proforma Invoice <strong>#{invoice.proformaNumber}</strong> is currently in{' '}
            <strong>{invoice.status}</strong> status. To maintain historical audit integrity, direct edits are restricted to Draft status only.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDuplicate}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Copy className="w-4 h-4 text-[#F7941D]" />
              <span>Duplicate as New Draft</span>
            </button>
            <button
              onClick={() => onNavigate('proforma-invoices/details', invoice)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              View Document Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('proforma-invoices/details', invoice)}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold text-slate-800 leading-tight">
              Edit Draft Proforma Invoice #{invoice.proformaNumber}
            </h1>
            <p className="text-sm font-normal text-slate-500 mt-0.5">
              Modify draft line items, pricing calculations, and commercial terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSave('Draft')}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('Issued')}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#F7941D]" />
            )}
            <span>Finalize &amp; Issue</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-sm font-normal">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-sm font-normal">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dates Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#F7941D]" />
          <span>Document Dates</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Valid Until Date</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>
        </div>
      </div>

      {/* Client Snapshot Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Building className="w-5 h-5 text-[#F7941D]" />
          <span>Client Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
            <input
              type="text"
              value={clientSnapshot.companyName}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, companyName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person</label>
            <input
              type="text"
              value={clientSnapshot.contactPerson}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, contactPerson: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="text"
              value={clientSnapshot.phone}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={clientSnapshot.email}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>
        </div>
      </div>

      {/* Line Items Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F7941D]" />
            <span>Line Items</span>
          </h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-1.5 text-sm font-medium text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#F7941D]" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A2E0A] text-white text-xs sm:text-sm font-semibold">
              <tr>
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-3 min-w-[220px]">Product / Description</th>
                <th className="py-3 px-2 w-24">HSN</th>
                <th className="py-3 px-2 w-20 text-center">Qty</th>
                <th className="py-3 px-2 w-24 text-center">Unit</th>
                <th className="py-3 px-2 w-28 text-right">Unit Price</th>
                <th className="py-3 px-2 w-24 text-right">Disc. %</th>
                <th className="py-3 px-2 w-28 text-center">GST Rate</th>
                <th className="py-3 px-3 w-28 text-right">Total</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => {
                const qty = Math.max(1, Number(it.quantity) || 1);
                const price = Math.max(0, Number(it.unitPrice) || 0);
                const base = qty * price;
                const discAmt = (base * Math.min(100, Number(it.discountValue) || 0)) / 100;
                const taxable = base - discAmt;
                const tax = (taxable * (Number(it.gstRate) || 0)) / 100;
                const rowTotal = taxable + tax;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium text-sm">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-normal text-slate-800 outline-none focus:border-[#1A2E0A]"
                        required
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={it.hsn || ''}
                        onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-sm text-center outline-none focus:border-[#1A2E0A]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-normal text-center outline-none focus:border-[#1A2E0A]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none bg-white text-sm text-center"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-normal text-right outline-none focus:border-[#1A2E0A]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={it.discountValue || 0}
                        onChange={(e) => handleItemChange(idx, 'discountValue', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-right outline-none focus:border-[#1A2E0A]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={it.gstRate}
                        onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none bg-white text-sm text-center font-normal"
                      >
                        {GST_RATES.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm font-medium text-slate-900 font-mono">
                      {formatINR(rowTotal)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 p-1 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustments & Real-time Calculations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Commercial notes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#F7941D]" />
            <span>Commercial Terms &amp; Conditions</span>
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Terms</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:border-[#1A2E0A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery Terms</label>
            <input
              type="text"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:border-[#1A2E0A]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks / Notes</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none resize-none focus:border-[#1A2E0A]"
            />
          </div>
        </div>

        {/* Calculations breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
            <span>Recalculated Financial Summary</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Special Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Freight / Shipping (₹)</label>
              <input
                type="number"
                min="0"
                value={shippingCharges}
                onChange={(e) => setShippingCharges(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 pt-3 text-sm font-normal">
            <div className="flex justify-between text-slate-600">
              <span>Gross Line Subtotal:</span>
              <span className="font-medium text-slate-800">{formatINR(financialSummary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Net Taxable Value:</span>
              <span className="font-medium text-slate-800">{formatINR(financialSummary.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total GST:</span>
              <span className="font-medium text-slate-800">{formatINR(financialSummary.totalTax)}</span>
            </div>
            <div className="border-t-2 border-[#1A2E0A] pt-3 flex items-baseline justify-between text-slate-900">
              <span className="text-base sm:text-lg font-semibold">Grand Total:</span>
              <span className="text-xl sm:text-2xl font-semibold font-mono text-[#1A2E0A]">
                {formatINR(financialSummary.grandTotal)}
              </span>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800">
              <span className="text-sm font-semibold">Advance Required ({financialSummary.advancePercentage}%):</span>
              <span className="text-base font-semibold font-mono">{formatINR(financialSummary.advanceAmount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('proforma-invoices/details', invoice)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave('Draft')}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
              ) : (
                <Save className="w-4 h-4 text-[#F7941D]" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProformaInvoice;
