import React, { useState } from 'react';
import { X, Landmark, Wallet, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';

export const AddAccountModal = ({ isOpen, onClose, defaultType = 'bank' }) => {
  const { addAccount } = useCashBank();

  const [type, setType] = useState(defaultType);
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isCash = type === 'cash';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!accountName.trim()) {
      setError('Please enter a descriptive account name.');
      return;
    }

    if (!isCash) {
      if (!bankName.trim()) {
        setError('Please enter the name of the bank.');
        return;
      }
      if (!accountNumber.trim()) {
        setError('Please enter the bank account number.');
        return;
      }
    }

    const balNum = parseFloat(openingBalance);
    if (isNaN(balNum) || balNum < 0) {
      setError('Opening balance must be zero or a positive amount.');
      return;
    }

    try {
      addAccount({
        accountName: accountName.trim(),
        type,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim(),
        openingBalance: balNum,
        openingBalanceDate,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-[#F7941D] flex items-center justify-center font-bold">
              {isCash ? <Wallet className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Add New Account</h3>
              <p className="text-xs text-slate-300 font-normal">
                Configure a new cash vault or bank account ledger
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

          {/* Account Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Account Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('bank')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                  !isCash
                    ? 'border-[#1A2E0A] bg-emerald-50 text-[#1A2E0A] shadow-xs ring-1 ring-[#1A2E0A]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>Bank Account</span>
              </button>
              <button
                type="button"
                onClick={() => setType('cash')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                  isCash
                    ? 'border-[#1A2E0A] bg-emerald-50 text-[#1A2E0A] shadow-xs ring-1 ring-[#1A2E0A]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Cash in Hand</span>
              </button>
            </div>
          </div>

          {/* Account Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Account Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={isCash ? 'e.g. Factory Petty Cash Vault' : 'e.g. Axis Bank - Operations A/C'}
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
              required
            />
          </div>

          {/* Bank Fields (conditional) */}
          {!isCash && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Axis Bank / Kotak Mahindra"
                    className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 921020048192831"
                    className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none font-mono"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Masked automatically on screen (•••• 2831)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  IFSC Code (Optional)
                </label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="e.g. UTIB0000123"
                  className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none font-mono uppercase"
                />
              </div>
            </>
          )}

          {/* Opening Balance & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Opening Balance (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Opening Balance Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={openingBalanceDate}
                onChange={(e) => setOpeningBalanceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notes / Purpose
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dedicated for marketplace merchant disbursements..."
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
              className="px-5 py-2 text-sm font-medium text-white bg-[#1A2E0A] hover:bg-[#254210] rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#F7941D]" />
              <span>Save Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
