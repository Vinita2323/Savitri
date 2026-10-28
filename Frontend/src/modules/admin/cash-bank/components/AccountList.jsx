import React from 'react';
import { Plus, ShieldAlert } from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { AccountRow } from './AccountRow';
import { formatINR } from '../utils/cashBankUtils';

export const AccountList = ({ onOpenAddAccount }) => {
  const {
    cashAccounts,
    bankAccounts,
    selectedAccountId,
    selectAccount,
    totalBalance,
    unlinkedTotal,
    unlinkedCount,
    isUnlinkedSelected,
  } = useCashBank();

  return (
    <div className="space-y-4">
      {/* 1. Minimal Total Balance Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Total Net Balance
        </span>
        <div className="text-2xl sm:text-[26px] font-semibold text-slate-900 tracking-tight mt-1">
          {formatINR(totalBalance)}
        </div>
        <p className="text-xs text-slate-400 font-normal mt-1">
          Across {cashAccounts.length + bankAccounts.length} cash &amp; bank accounts
        </p>
      </div>

      {/* 2. Cash in Hand Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cash
          </span>
        </div>
        <div className="space-y-1">
          {cashAccounts.map((acc) => (
            <AccountRow
              key={acc.id}
              account={acc}
              isSelected={selectedAccountId === acc.id}
              onSelect={selectAccount}
            />
          ))}
        </div>
      </div>

      {/* 3. Bank Accounts Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Bank Accounts
          </span>
          <button
            type="button"
            onClick={() => onOpenAddAccount('bank')}
            className="text-xs font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bank</span>
          </button>
        </div>

        <div className="space-y-1">
          {bankAccounts.map((acc) => (
            <AccountRow
              key={acc.id}
              account={acc}
              isSelected={selectedAccountId === acc.id}
              onSelect={selectAccount}
            />
          ))}

          {bankAccounts.length === 0 && (
            <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center text-slate-400 text-xs">
              No bank accounts added.
            </div>
          )}
        </div>
      </div>

      {/* 4. Minimal Unlinked Transactions Item */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => selectAccount('unlinked')}
          className={`w-full text-left px-3.5 py-3 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
            isUnlinkedSelected
              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
              : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                isUnlinkedSelected
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm truncate ${
                    isUnlinkedSelected ? 'font-semibold text-amber-950' : 'font-medium text-slate-700'
                  }`}
                >
                  Unlinked Transactions
                </span>
                {unlinkedCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {unlinkedCount}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-normal truncate mt-0.5">
                Pending allocation
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 pl-3">
            <div
              className={`text-sm font-medium ${
                isUnlinkedSelected ? 'text-amber-900 font-semibold' : 'text-slate-700'
              }`}
            >
              {formatINR(unlinkedTotal)}
            </div>
          </div>
        </button>
      </div>

      {/* 5. Minimal 1-line note */}
      <p className="text-[11px] text-slate-400 text-center pt-2">
        Demo data only &bull; Persisted in browser localStorage
      </p>
    </div>
  );
};

export default AccountList;
