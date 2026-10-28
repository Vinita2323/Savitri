import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, Loader2, IndianRupee, CheckCircle } from 'lucide-react';
import { formatINR } from '../utils/proformaCalculations';

export const RecordPaymentModal = ({ invoice, isOpen, onClose, onRecordPayment }) => {
  if (!isOpen || !invoice) return null;

  const grandTotal = invoice.summary?.grandTotal || 0;
  const totalPaid = invoice.summary?.totalPaid || 0;
  const balanceDue = invoice.summary?.balanceDue ?? Math.max(0, grandTotal - totalPaid);
  const suggestedAdvance = invoice.summary?.advanceAmount || 0;

  const [amount, setAmount] = useState(
    totalPaid === 0 && suggestedAdvance > 0 ? String(suggestedAdvance) : String(balanceDue)
  );
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState(totalPaid === 0 ? 'Advance' : 'Part Payment');
  const [paymentMethod, setPaymentMethod] = useState('NEFT/RTGS');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (!paymentDate) {
      setError('Please select a payment receipt date.');
      return;
    }

    if (!referenceNumber.trim()) {
      setError('Please provide a UTR / Transaction reference number to record verified payment.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordPayment(invoice._id, {
        amount: parsedAmount,
        paymentDate,
        paymentType,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        bankName: bankName.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Record Verified Payment</h3>
              <p className="text-xs text-slate-300 font-normal">
                Proforma Invoice #{invoice.proformaNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Status Card */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <div>
              <span className="block text-xs font-medium text-slate-500">
                Grand Total
              </span>
              <span className="text-base font-semibold text-slate-800">
                {formatINR(grandTotal)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-emerald-600">
                Total Paid
              </span>
              <span className="text-base font-semibold text-emerald-700">
                {formatINR(totalPaid)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-rose-500">
                Balance Due
              </span>
              <span className="text-base font-semibold text-rose-600">
                {formatINR(balanceDue)}
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount Received (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Category
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
              >
                <option value="Advance">Advance Payment</option>
                <option value="Part Payment">Part Payment / Installment</option>
                <option value="Milestone">Milestone Release</option>
                <option value="Full">Full Settlement</option>
                <option value="Balance">Remaining Balance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Instrument
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
              >
                <option value="NEFT/RTGS">NEFT / RTGS Wire Transfer</option>
                <option value="Bank Transfer">Bank Transfer (IMPS / Direct)</option>
                <option value="UPI">UPI Remittance</option>
                <option value="Cheque">Banker's Cheque / Demand Draft</option>
                <option value="Cash">Cash Receipt</option>
                <option value="Credit Card">Corporate Card / Payment Gateway</option>
                <option value="Other">Other Verified Mode</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                UTR / Transaction Reference <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR1234567890 / CHQ-8821"
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Remitting Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Internal Verification Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Verified in HDFC Bank current account statement by Accounts Desk..."
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Payment...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm &amp; Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
