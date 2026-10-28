import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  ArrowRightLeft,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { CashBankProvider, useCashBank } from '../context/CashBankContext';
import { AccountList } from '../components/AccountList';
import { TransactionPanel } from '../components/TransactionPanel';
import { UnlinkedTransactionsPanel } from '../components/UnlinkedTransactionsPanel';
import { AddAccountModal } from '../components/AddAccountModal';
import { AddReduceMoneyModal } from '../components/AddReduceMoneyModal';
import { TransferMoneyModal } from '../components/TransferMoneyModal';
import { LinkTransactionModal } from '../components/LinkTransactionModal';

const CashBankContent = () => {
  const { isUnlinkedSelected, resetDemoData, toast } = useCashBank();

  // Modal open states
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [addAccountDefaultType, setAddAccountDefaultType] = useState('bank');

  const [isAddReduceOpen, setIsAddReduceOpen] = useState(false);
  const [addReduceDefaultAccount, setAddReduceDefaultAccount] = useState('');

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferDefaultFrom, setTransferDefaultFrom] = useState('');

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingItem, setLinkingItem] = useState(null);

  const handleOpenAddAccount = (type = 'bank') => {
    setAddAccountDefaultType(type);
    setIsAddAccountOpen(true);
  };

  const handleOpenAddReduce = (accountId = '') => {
    setAddReduceDefaultAccount(accountId);
    setIsAddReduceOpen(true);
  };

  const handleOpenTransfer = (fromAccountId = '') => {
    setTransferDefaultFrom(fromAccountId);
    setIsTransferOpen(true);
  };

  const handleOpenLinkModal = (item) => {
    setLinkingItem(item);
    setIsLinkModalOpen(true);
  };

  const handleConfirmReset = () => {
    if (
      window.confirm(
        'Reset all Cash and Bank demo data to default sample balances and transactions?'
      )
    ) {
      resetDemoData();
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-lg shadow-lg border bg-slate-900 text-white border-slate-700 animate-in fade-in duration-200 text-xs font-medium">
          {toast.type === 'info' ? (
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Clean Minimal Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 leading-tight">
            Cash and Bank
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Manage cash vaults, bank accounts, fund transfers, and ledger history
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleConfirmReset}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset demo data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenTransfer('')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Transfer Money</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddReduce('')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Add / Reduce Money</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddAccount('bank')}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1A2E0A] hover:bg-[#254210] rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F7941D]" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Left Panel: Account Overview & Account Selector */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <AccountList onOpenAddAccount={handleOpenAddAccount} />
        </div>

        {/* Right Panel: Transaction Table OR Unlinked Transactions Panel */}
        <div className="flex-1 min-w-0 w-full">
          {isUnlinkedSelected ? (
            <UnlinkedTransactionsPanel onOpenLinkModal={handleOpenLinkModal} />
          ) : (
            <TransactionPanel />
          )}
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        defaultType={addAccountDefaultType}
      />

      <AddReduceMoneyModal
        isOpen={isAddReduceOpen}
        onClose={() => setIsAddReduceOpen(false)}
        defaultAccountId={addReduceDefaultAccount}
      />

      <TransferMoneyModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        defaultFromAccountId={transferDefaultFrom}
      />

      <LinkTransactionModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setLinkingItem(null);
        }}
        unlinkedItem={linkingItem}
      />
    </div>
  );
};

export const CashBankPage = () => {
  return (
    <CashBankProvider>
      <CashBankContent />
    </CashBankProvider>
  );
};

export default CashBankPage;
