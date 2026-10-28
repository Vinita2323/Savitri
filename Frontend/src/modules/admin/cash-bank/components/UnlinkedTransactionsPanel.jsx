import React from 'react';
import {
  Link as LinkIcon,
  CheckCircle2,
  Download,
  Inbox,
} from 'lucide-react';
import { useCashBank } from '../context/CashBankContext';
import { formatINR, formatDate, exportTransactionsToCSV } from '../utils/cashBankUtils';

export const UnlinkedTransactionsPanel = ({ onOpenLinkModal }) => {
  const { unlinkedTransactions, unlinkedTotal, unlinkedCount } = useCashBank();

  const handleExportUnlinked = () => {
    exportTransactionsToCSV(
      unlinkedTransactions.map((u) => ({
        ...u,
        category: u.suggestedCategory,
        runningBalance: '-',
      })),
      'Unlinked_Transactions'
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* 1. Sleek Header */}
      <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Unlinked Transactions
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {unlinkedCount} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Statement feed items awaiting allocation to an account ledger
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Unallocated Value
            </span>
            <span className="text-xl font-semibold text-slate-900 tracking-tight">
              {formatINR(unlinkedTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportUnlinked}
            disabled={unlinkedTransactions.length === 0}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Export unlinked transactions"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Unlinked Table Canvas */}
      <div className="flex-1 min-h-[400px] overflow-x-auto">
        {unlinkedTransactions.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">All Items Reconciled</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
              No unlinked transactions pending.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4 text-xs font-medium">Date</th>
                <th className="py-2.5 px-4 text-xs font-medium">Description</th>
                <th className="py-2.5 px-4 text-xs font-medium">Feed Source</th>
                <th className="py-2.5 px-4 text-xs font-medium">Reference</th>
                <th className="py-2.5 px-4 text-xs font-medium text-right">Amount</th>
                <th className="py-2.5 px-4 text-xs font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {unlinkedTransactions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 font-normal">
                    {formatDate(item.date)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 text-sm leading-snug">
                      {item.description}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-sm font-normal">
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-normal">
                    {item.source || 'Direct Feed'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                    {item.referenceNumber || '-'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-right font-semibold text-emerald-700 text-sm">
                    +{formatINR(item.amount)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={() => onOpenLinkModal(item)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-[#1A2E0A] hover:bg-[#254210] text-white shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Link</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/30">
        Simulated reconciliation &bull; Linking moves the record to your chosen account ledger
      </div>
    </div>
  );
};

export default UnlinkedTransactionsPanel;
