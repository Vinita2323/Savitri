import React, { useState, useMemo } from 'react';
import { Search, Download, Calendar } from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { TransactionTable } from './TransactionTable';
import {
  formatINR,
  filterTransactions,
  exportTransactionsToCSV,
} from '../utils/cashBankUtils';

export const TransactionPanel = () => {
  const { selectedAccount, currentAccountTransactions } = useCashBank();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredTransactions = useMemo(() => {
    return filterTransactions(currentAccountTransactions, {
      search: searchTerm,
      dateFilter,
      customStart,
      customEnd,
      typeFilter,
    });
  }, [currentAccountTransactions, searchTerm, dateFilter, customStart, customEnd, typeFilter]);

  if (!selectedAccount) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400">
        <p className="text-sm">Select an account to view transactions.</p>
      </div>
    );
  }

  const isCash = selectedAccount.type === 'cash' || selectedAccount.isCash;

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, selectedAccount.accountName);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* 1. Sleek Account Header */}
      <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedAccount.accountName}
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {isCash ? 'Cash' : selectedAccount.bankName || 'Bank'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            {isCash ? 'Physical Cash Vault' : `A/C: ${selectedAccount.maskedAccount || '•••• ----'}`}
            {!isCash && selectedAccount.ifsc ? ` • IFSC: ${selectedAccount.ifsc}` : ''}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Available Balance
          </span>
          <span
            className={`text-xl font-semibold tracking-tight ${
              selectedAccount.balance < 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {formatINR(selectedAccount.balance)}
          </span>
        </div>
      </div>

      {/* 2. Unified Minimal Filter Bar (Single Row) */}
      <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-normal border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none bg-white placeholder:text-slate-400"
          />
        </div>

        {/* Controls: Type Segment + Date Dropdown + Export */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Minimal Type Segmented Control */}
          <div className="bg-slate-200/70 p-0.5 rounded-lg flex items-center text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'money_in', label: 'In' },
              { id: 'money_out', label: 'Out' },
              { id: 'transfer', label: 'Transfer' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  typeFilter === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Date Filter Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-normal border border-slate-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#1A2E0A] text-slate-700 cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Export filtered transactions to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (if Custom is chosen) */}
      {dateFilter === 'custom' && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-xs">
          <span className="text-slate-500 font-medium">From:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded bg-white outline-none"
          />
          <span className="text-slate-500 font-medium">To:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded bg-white outline-none"
          />
        </div>
      )}

      {/* 3. Transaction Table Canvas */}
      <div className="flex-1 min-h-[400px]">
        <TransactionTable
          transactions={filteredTransactions}
          accountName={selectedAccount.accountName}
        />
      </div>

      {/* Footer count */}
      <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/30 flex items-center justify-between">
        <span>
          Showing {filteredTransactions.length} of {currentAccountTransactions.length} records
        </span>
      </div>
    </div>
  );
};

export default TransactionPanel;
