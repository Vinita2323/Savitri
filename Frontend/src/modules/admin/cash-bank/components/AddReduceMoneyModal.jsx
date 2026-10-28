import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Tag,
  CreditCard,
  Building2,
} from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { TRANSACTION_CATEGORIES, PAYMENT_MODES } from '../data/cashBankDemoData';
import { formatINR } from '../utils/cashBankUtils';

export const AddReduceMoneyModal = ({ isOpen, onClose, defaultAccountId }) => {
  const { accounts, addTransaction, selectedAccountId } = useCashBank();

  const [type, setType] = useState('money_in');
  const [accountId, setAccountId] = useState(defaultAccountId || selectedAccountId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT/RTGS');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Sync account on open
  useEffect(() => {
    if (defaultAccountId) {
      setAccountId(defaultAccountId);
    } else if (selectedAccountId && selectedAccountId !== 'unlinked') {
      setAccountId(selectedAccountId);
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [defaultAccountId, selectedAccountId, accounts]);

  // Set default category when type changes
  useEffect(() => {
    const list = type === 'money_in' ? TRANSACTION_CATEGORIES.money_in : TRANSACTION_CATEGORIES.money_out;
    setCategory(list[0] || '');
  }, [type]);

  if (!isOpen) return null;

  const selectedTargetAccount = accounts.find((a) => a.id === accountId);
  const currentBal = selectedTargetAccount ? parseFloat(selectedTargetAccount.balance) || 0 : 0;
  const numAmount = parseFloat(amount) || 0;
  const isMoneyIn = type === 'money_in';
  const projectedBal = isMoneyIn ? currentBal + numAmount : currentBal - numAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!date) {
      setError('Please select a transaction date.');
      return;
    }

    try {
      addTransaction({
        accountId,
        type,
        amount: numAmount,
        date,
        category,
        paymentMode,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                isMoneyIn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isMoneyIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Add / Reduce Money</h3>
              <p className="text-xs text-slate-300 font-normal">
                Record receipts, direct income, bills, or operational expenses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (Money In vs Money Out) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Transaction Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('money_in')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                  isMoneyIn
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Money In (Receipt)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('money_out')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                  !isMoneyIn
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-1 ring-rose-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Money Out (Payment)</span>
              </button>
            </div>
          </div>

          {/* Account Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Target Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Transaction Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                required
              />
            </div>
          </div>

          {/* Category & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category / Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
                required
              >
                {(isMoneyIn ? TRANSACTION_CATEGORIES.money_in : TRANSACTION_CATEGORIES.money_out).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Instrument
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference # */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reference / UTR / Cheque # (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR-HDFC-992019 / CHQ-10492"
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer advance remittance for medical instruments batch..."
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none resize-none"
            />
          </div>

          {/* Interactive Balance Preview Box */}
          {selectedTargetAccount && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 block">Current Balance:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {formatINR(currentBal)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-500 block">Adjustment:</span>
                <span
                  className={`font-semibold text-sm ${
                    isMoneyIn ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {isMoneyIn ? '+ ' : '- '}
                  {formatINR(numAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Projected Balance:</span>
                <span
                  className={`font-bold text-sm ${
                    projectedBal < 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatINR(projectedBal)}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer ${
                isMoneyIn
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record {isMoneyIn ? 'Receipt' : 'Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReduceMoneyModal;
