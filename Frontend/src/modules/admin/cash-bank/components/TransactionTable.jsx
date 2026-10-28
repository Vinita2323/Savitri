import React from 'react';
import { Inbox, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { formatINR, formatDate } from '../utils/cashBankUtils';

export const TransactionTable = ({ transactions = [], accountName = '' }) => {
  if (transactions.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">No Transactions Found</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
          No records match your selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50/70 text-slate-500 border-y border-slate-200/80">
          <tr>
            <th className="py-2.5 px-4 text-xs font-medium">Date</th>
            <th className="py-2.5 px-4 text-xs font-medium">Description</th>
            <th className="py-2.5 px-4 text-xs font-medium">Category</th>
            <th className="py-2.5 px-4 text-xs font-medium">Ref / Mode</th>
            <th className="py-2.5 px-4 text-xs font-medium text-center">Type</th>
            <th className="py-2.5 px-4 text-xs font-medium text-right">Amount</th>
            <th className="py-2.5 px-4 text-xs font-medium text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {transactions.map((tx) => {
            const isMoneyIn = tx.type === 'money_in';
            const isMoneyOut = tx.type === 'money_out';
            const isTransfer = tx.type === 'transfer';

            return (
              <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                {/* Date */}
                <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 font-normal">
                  {formatDate(tx.date)}
                </td>

                {/* Description */}
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-900 text-sm leading-snug">
                    {tx.description || 'Transaction'}
                  </div>
                  {(tx.targetAccountName || tx.notes) && (
                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-sm font-normal">
                      {tx.targetAccountName
                        ? `${tx.transferType === 'out' ? 'To: ' : 'From: '}${tx.targetAccountName}`
                        : tx.notes}
                    </div>
                  )}
                </td>

                {/* Category */}
                <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-normal">
                  {tx.category || '-'}
                </td>

                {/* Ref & Mode */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="font-mono text-xs text-slate-700">
                    {tx.referenceNumber || '-'}
                  </span>
                  {tx.paymentMode && (
                    <span className="text-[11px] text-slate-400 block font-normal">
                      {tx.paymentMode}
                    </span>
                  )}
                </td>

                {/* Minimal Type Badge */}
                <td className="py-3 px-4 whitespace-nowrap text-center">
                  {isMoneyIn && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      In
                    </span>
                  )}
                  {isMoneyOut && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Out
                    </span>
                  )}
                  {isTransfer && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      Transfer
                    </span>
                  )}
                </td>

                {/* Amount */}
                <td className="py-3 px-4 whitespace-nowrap text-right">
                  <span
                    className={`font-semibold text-sm ${
                      isMoneyIn
                        ? 'text-emerald-700'
                        : isMoneyOut
                        ? 'text-rose-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {isMoneyIn && '+'}
                    {isMoneyOut && '-'}
                    {formatINR(tx.amount)}
                  </span>
                </td>

                {/* Running Balance */}
                <td className="py-3 px-4 whitespace-nowrap text-right text-sm text-slate-600 font-medium">
                  {tx.runningBalance !== undefined ? formatINR(tx.runningBalance) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
