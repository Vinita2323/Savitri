import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { TRANSACTION_CATEGORIES } from '../data/cashBankDemoData';
import { formatINR, formatDate } from '../utils/cashBankUtils';

export const LinkTransactionModal = ({ unlinkedItem, isOpen, onClose }) => {
  const { accounts, linkUnlinkedTransaction } = useCashBank();

  const [targetAccountId, setTargetAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (unlinkedItem) {
      if (accounts.length > 0) {
        // Prefer an account that matches feed or default to first
        const matched =
          accounts.find((a) =>
            unlinkedItem.source?.toLowerCase().includes(a.bankName?.toLowerCase() || '---')
          ) || accounts[0];
        setTargetAccountId(matched.id);
      }
      setCategory(unlinkedItem.suggestedCategory || TRANSACTION_CATEGORIES.money_in[0]);
      setReferenceNumber(unlinkedItem.referenceNumber || '');
      setNotes(unlinkedItem.notes || '');
    }
  }, [unlinkedItem, accounts, isOpen]);

  if (!isOpen || !unlinkedItem) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!targetAccountId) {
      setError('Please select a target account to allocate this transaction.');
      return;
    }

    try {
      linkUnlinkedTransaction(unlinkedItem.id, {
        targetAccountId,
        category,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reconcile transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-[#F7941D] flex items-center justify-center font-bold">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Reconcile &amp; Link Transaction</h3>
              <p className="text-xs text-slate-300 font-normal">
                Simulated allocation of unlinked feed to verified ledger
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

          {/* Unlinked Transaction Summary Card */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900">Pending Feed Item</span>
              <span className="text-amber-800 font-mono font-medium">{formatDate(unlinkedItem.date)}</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {unlinkedItem.description}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
              <span className="text-slate-500">Source: {unlinkedItem.source}</span>
              <span className="text-base font-bold text-emerald-700">
                + {formatINR(unlinkedItem.amount)}
              </span>
            </div>
          </div>

          {/* Target Account Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Allocate to Ledger Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
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

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Accounting Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white"
              required
            >
              {TRANSACTION_CATEGORIES.money_in.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR-HDFC-992102"
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none font-mono"
            />
          </div>

          {/* Verification Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reconciliation Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified with bank statement credit slip against client order..."
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none resize-none"
            />
          </div>

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
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#F7941D]" />
              <span>Reconcile &amp; Link</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkTransactionModal;
