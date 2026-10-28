import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { formatINR } from '../utils/cashBankUtils';

export const TransferMoneyModal = ({ isOpen, onClose, defaultFromAccountId }) => {
  const { accounts, transferMoney, selectedAccountId } = useCashBank();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Set default from and to accounts
  useEffect(() => {
    if (accounts.length >= 2) {
      const initialFrom = defaultFromAccountId || selectedAccountId || accounts[0].id;
      const validFrom = accounts.some((a) => a.id === initialFrom) ? initialFrom : accounts[0].id;
      setFromAccountId(validFrom);

      const remaining = accounts.filter((a) => a.id !== validFrom);
      if (remaining.length > 0) {
        setToAccountId(remaining[0].id);
      }
    }
  }, [defaultFromAccountId, selectedAccountId, accounts, isOpen]);

  // Adjust destination if source matches
  const handleFromChange = (newFromId) => {
    setFromAccountId(newFromId);
    if (toAccountId === newFromId) {
      const other = accounts.find((a) => a.id !== newFromId);
      if (other) {
        setToAccountId(other.id);
      }
    }
  };

  if (!isOpen) return null;

  const sourceAccount = accounts.find((a) => a.id === fromAccountId);
  const destAccount = accounts.find((a) => a.id === toAccountId);

  const numAmount = parseFloat(amount) || 0;
  const sourceBalance = sourceAccount ? parseFloat(sourceAccount.balance) || 0 : 0;
  const destBalance = destAccount ? parseFloat(destAccount.balance) || 0 : 0;

  const newSourceBalance = sourceBalance - numAmount;
  const newDestBalance = destBalance + numAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fromAccountId || !toAccountId) {
      setError('Please select both source and destination accounts.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Transfer amount must be greater than zero.');
      return;
    }

    if (numAmount > sourceBalance) {
      setError(
        `Insufficient funds in ${sourceAccount?.accountName}. Available: ${formatINR(sourceBalance)}`
      );
      return;
    }

    if (!date) {
      setError('Please select a transfer date.');
      return;
    }

    try {
      transferMoney({
        fromAccountId,
        toAccountId,
        amount: numAmount,
        date,
        referenceNumber: referenceNumber.trim(),
        paymentMode,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to transfer funds.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-[#F7941D] flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Transfer Funds</h3>
              <p className="text-xs text-slate-300 font-normal">
                Internal fund movement between cash vaults and bank accounts
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

          {/* From and To Account Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                From Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => handleFromChange(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                To Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
                required
              >
                {accounts
                  .filter((acc) => acc.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({formatINR(acc.balance)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Transfer Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={sourceBalance > 0 ? sourceBalance : undefined}
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
                Transfer Date <span className="text-rose-500">*</span>
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

          {/* Mode & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Transfer Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
              >
                <option value="Bank Transfer">Bank Transfer (IMPS / Direct)</option>
                <option value="NEFT/RTGS">NEFT / RTGS Wire</option>
                <option value="Cheque">Self Cheque / Clearing</option>
                <option value="Cash Deposit">Cash to Bank Deposit</option>
                <option value="Cash Withdrawal">Bank to Cash Withdrawal</option>
                <option value="Contra Entry">Internal Contra Entry</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reference # (Optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. TRF-2026-9921 / CHQ-0012"
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason / Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replenishing counter cash locker from HDFC main account..."
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none resize-none"
            />
          </div>

          {/* Interactive Invariant Balance Preview Card */}
          {sourceAccount && destAccount && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Account Flow</span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> Total Balance Unchanged
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">From (Deducted)</span>
                  <strong className="text-slate-800 text-xs block truncate">
                    {sourceAccount.accountName}
                  </strong>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-500">{formatINR(sourceBalance)}</span>
                    <span className="text-rose-600 font-semibold">&rarr; {formatINR(newSourceBalance)}</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">To (Credited)</span>
                  <strong className="text-slate-800 text-xs block truncate">
                    {destAccount.accountName}
                  </strong>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-500">{formatINR(destBalance)}</span>
                    <span className="text-emerald-700 font-semibold">&rarr; {formatINR(newDestBalance)}</span>
                  </div>
                </div>
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
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#F7941D]" />
              <span>Confirm &amp; Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferMoneyModal;
