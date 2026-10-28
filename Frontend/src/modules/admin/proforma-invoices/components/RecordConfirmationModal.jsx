import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, FileCheck } from 'lucide-react';

export const RecordConfirmationModal = ({ invoice, isOpen, onClose, onRecordConfirmation }) => {
  if (!isOpen || !invoice) return null;

  const [poNumber, setPoNumber] = useState(invoice.confirmation?.poNumber || '');
  const [confirmedBy, setConfirmedBy] = useState(
    invoice.confirmation?.confirmedBy || invoice.clientSnapshot?.contactPerson || ''
  );
  const [confirmedAt, setConfirmedAt] = useState(
    invoice.confirmation?.confirmedAt
      ? new Date(invoice.confirmation.confirmedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [expectedPaymentDate, setExpectedPaymentDate] = useState(
    invoice.confirmation?.expectedPaymentDate
      ? new Date(invoice.confirmation.expectedPaymentDate).toISOString().split('T')[0]
      : ''
  );
  const [notes, setNotes] = useState(invoice.confirmation?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!confirmedBy.trim()) {
      setError('Please specify who confirmed this order from the client organization.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordConfirmation(invoice._id, {
        poNumber: poNumber.trim(),
        confirmedBy: confirmedBy.trim(),
        confirmedAt,
        expectedPaymentDate: expectedPaymentDate || null,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Record Client Confirmation</h3>
              <p className="text-xs text-slate-300 font-normal">
                Proforma Invoice #{invoice.proformaNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-sm font-normal text-amber-900 leading-relaxed">
            Record formal acceptance or purchase order receipt from{' '}
            <strong className="font-semibold">{invoice.clientSnapshot?.companyName}</strong>. This updates document status to{' '}
            <strong className="font-semibold">Confirmed</strong> without marking payment received.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Purchase Order (PO) / Confirmation Reference #
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-MP-0914 or Email Acceptance"
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirmed By (Contact Person) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={confirmedBy}
              onChange={(e) => setConfirmedBy(e.target.value)}
              placeholder="e.g. Dr. R. K. Saxena"
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirmation Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={confirmedAt}
                onChange={(e) => setConfirmedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Expected Payment Date
              </label>
              <input
                type="date"
                value={expectedPaymentDate}
                onChange={(e) => setExpectedPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirmation Notes / Commercial Stipulations
            </label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="PO document verified, delivery schedule approved by buyer..."
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Confirmation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordConfirmationModal;
