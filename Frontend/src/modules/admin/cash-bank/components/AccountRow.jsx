import React from 'react';
import { Landmark, Wallet } from 'lucide-react';
import { formatINR } from '../utils/cashBankUtils';

export const AccountRow = ({ account, isSelected, onSelect }) => {
  const isCash = account.type === 'cash' || account.isCash;

  return (
    <button
      type="button"
      onClick={() => onSelect(account.id)}
      className={`w-full text-left px-3.5 py-3 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
        isSelected
          ? 'bg-slate-100/80 border-slate-300 shadow-xs'
          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? 'bg-[#1A2E0A] text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <div
            className={`text-sm truncate ${
              isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
            }`}
          >
            {account.accountName}
          </div>
          <div className="text-xs text-slate-400 font-normal truncate mt-0.5">
            {isCash ? 'Physical Cash' : account.maskedAccount || account.bankName}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 pl-3">
        <div
          className={`text-sm ${
            isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
          } ${account.balance < 0 ? 'text-rose-600' : ''}`}
        >
          {formatINR(account.balance)}
        </div>
      </div>
    </button>
  );
};

export default AccountRow;
