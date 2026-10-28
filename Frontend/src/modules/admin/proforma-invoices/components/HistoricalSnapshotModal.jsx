import React, { useState } from 'react';
import { X, History, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { formatINR, formatDate } from '../utils/proformaCalculations';

export const HistoricalSnapshotModal = ({ snapshots = [], isOpen, onClose, proformaNumber }) => {
  if (!isOpen) return null;

  const [activeVersionIndex, setActiveVersionIndex] = useState(
    snapshots.length > 0 ? snapshots.length - 1 : 0
  );

  const activeSnapshot = snapshots[activeVersionIndex] || null;
  const snapData = activeSnapshot?.snapshotData || {};
  const snapSummary = snapData.summary || {};
  const snapClient = snapData.clientSnapshot || {};
  const snapItems = snapData.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Historical Sent Document Snapshots</h3>
              <p className="text-xs text-slate-300">
                Immutable records preserved at dispatch &bull; #{proformaNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {snapshots.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-sm">No historical snapshots recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                A permanent snapshot is automatically captured and preserved every time an email is dispatched to the client.
              </p>
            </div>
          ) : (
            <>
              {/* Snapshot Version Switcher */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                  Sent Versions:
                </span>
                {snapshots.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVersionIndex(idx)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeVersionIndex === idx
                        ? 'bg-[#1A2E0A] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Version {s.version || idx + 1}</span>
                    <span className="text-[10px] opacity-75">
                      ({formatDate(s.capturedAt)})
                    </span>
                  </button>
                ))}
              </div>

              {/* Version Metadata Card */}
              {activeSnapshot && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">
                      Version #{activeSnapshot.version || activeVersionIndex + 1}
                    </span>
                    <span className="text-slate-500 ml-2">Reason: {activeSnapshot.reason}</span>
                  </div>
                  <div className="text-slate-500">
                    Captured on:{' '}
                    <strong className="text-slate-700">
                      {new Date(activeSnapshot.capturedAt).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              )}

              {/* Frozen Snapshot Details */}
              <div className="space-y-4 text-xs">
                {/* Client info snapshot */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <span className="block font-semibold text-slate-500">Billed Organization:</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {snapClient.companyName || 'Client Organization'}
                    </span>
                    <div className="text-slate-600 mt-0.5">
                      Attn: {snapClient.contactPerson || '-'} &bull; {snapClient.phone || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-500">Recipient Email:</span>
                    <span className="font-medium text-slate-800">{snapClient.email || '-'}</span>
                    <div className="text-slate-500 mt-0.5">
                      GSTIN: {snapClient.gstin || 'Unregistered'}
                    </div>
                  </div>
                </div>

                {/* Items snapshot */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1A2E0A] text-white">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3 text-center">HSN</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Taxable</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {snapItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{item.name}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">{item.hsn || '-'}</td>
                          <td className="py-2 px-3 text-center text-slate-700">{item.quantity} {item.unit}</td>
                          <td className="py-2 px-3 text-right text-slate-700">{formatINR(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right text-slate-700">{formatINR(item.taxableAmount)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{formatINR(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary snapshot */}
                <div className="flex justify-end">
                  <div className="w-64 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatINR(snapSummary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Total:</span>
                      <span>{formatINR(snapSummary.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Tax (GST):</span>
                      <span>{formatINR(snapSummary.totalTax)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-slate-900">
                      <span>Grand Total:</span>
                      <span>{formatINR(snapSummary.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Advance Required:</span>
                      <span>{formatINR(snapSummary.advanceAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalSnapshotModal;
