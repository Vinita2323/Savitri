import React, { useState } from 'react';
import { X, Send, AlertCircle, Loader2, Paperclip, CheckCircle2 } from 'lucide-react';
import { formatINR, formatDate } from '../utils/proformaCalculations';

export const SendEmailModal = ({ invoice, isOpen, onClose, onSendEmail }) => {
  if (!isOpen || !invoice) return null;

  const defaultEmail = invoice.clientSnapshot?.email || '';
  const defaultName = invoice.clientSnapshot?.contactPerson || invoice.clientSnapshot?.companyName || '';
  const defaultSubject = `Proforma Invoice #${invoice.proformaNumber} — ${invoice.clientSnapshot?.companyName || 'Savitri Enterprise'}`;

  const grandTotal = invoice.summary?.grandTotal || 0;
  const advanceRequired = invoice.summary?.advanceAmount || 0;

  const defaultBody = `Dear ${defaultName || 'Valued Client'},

Please find attached the official Proforma Invoice #${invoice.proformaNumber} for your corporate procurement with Savitri Enterprise.

Transaction Summary:
- Document Number: ${invoice.proformaNumber}
- Issue Date: ${formatDate(invoice.issueDate)}
- Valid Until: ${formatDate(invoice.validUntil)}
- Total Payable: ${formatINR(grandTotal)}
- Advance Required: ${formatINR(advanceRequired)} (${invoice.summary?.advancePercentage || 50}%)

Kindly remit the advance payment using the bank wire details indicated on the document to confirm priority stock allocation and initiate delivery scheduling.

Best regards,
Commercial Logistics & Procurement Desk
Savitri B2B Enterprise Solutions
Indore Central Fulfillment Complex`;

  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail.trim())) {
      setError('Please provide a valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setError('Email subject cannot be empty.');
      return;
    }

    try {
      setIsSending(true);
      const res = await onSendEmail(invoice._id, {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        emailSubject: subject.trim(),
        emailBody: body,
      });

      if (res && res.success) {
        setSuccessMsg(res.message || 'Proforma Invoice email successfully sent!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(res?.message || 'Email delivery failed. Please check your SMTP settings.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to send email. Please check your network and SMTP credentials.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1A2E0A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-[#F7941D] flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">
                {invoice.emailStatus === 'Sent' ? 'Resend Proforma Invoice Email' : 'Send Proforma Invoice via Email'}
              </h3>
              <p className="text-xs text-slate-300 font-normal">
                Document #{invoice.proformaNumber} &bull; {invoice.clientSnapshot?.companyName}
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
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@organization.com"
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Recipient Name / Contact Person
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Contact Person Name"
                className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Subject Line <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Message Body
            </label>
            <textarea
              rows="6"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1A2E0A] focus:border-[#1A2E0A] outline-none leading-relaxed"
            />
          </div>

          {/* Attachment Pill */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-slate-700">Attachment:</span>
            <span className="font-mono text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Proforma_Invoice_{invoice.proformaNumber}.pdf
            </span>
            <span className="text-slate-400 text-xs ml-auto">
              Vector PDF rendered automatically
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 text-sm font-medium text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                  Sending Email via SMTP...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#F7941D]" />
                  {invoice.emailStatus === 'Sent' ? 'Resend Proforma Email' : 'Send Proforma Invoice'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendEmailModal;
