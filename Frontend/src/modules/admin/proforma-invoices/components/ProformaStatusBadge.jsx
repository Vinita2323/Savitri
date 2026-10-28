import React from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  CheckCheck,
  CreditCard,
  MailCheck,
  MailX,
  Mail,
  Loader2,
} from 'lucide-react';

/**
 * Status Badge for Proforma Invoices:
 * Supports type="document", type="payment", or type="email"
 */
export const ProformaStatusBadge = ({ status, type = 'document', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  // 1. Document Statuses
  if (type === 'document') {
    switch (status) {
      case 'Draft':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Draft
          </span>
        );
      case 'Issued':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Issued
          </span>
        );
      case 'Sent':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
            <Send className="w-3.5 h-3.5 text-purple-500" />
            Sent to Client
          </span>
        );
      case 'Confirmed':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Confirmed
          </span>
        );
      case 'Expired':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Expired
          </span>
        );
      case 'Converted to Invoice':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-teal-50 text-teal-700 border border-teal-200 ${sizeClasses}`}>
            <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
            Converted to Invoice
          </span>
        );
      case 'Cancelled':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-zinc-100 text-zinc-600 border border-zinc-300 ${sizeClasses}`}>
            <Ban className="w-3.5 h-3.5 text-zinc-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 ${sizeClasses}`}>
            {status || 'Unknown'}
          </span>
        );
    }
  }

  // 2. Payment Statuses
  if (type === 'payment') {
    switch (status) {
      case 'Paid':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            Partially Paid
          </span>
        );
      case 'Unpaid':
      default:
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Unpaid
          </span>
        );
    }
  }

  // 3. Email Statuses
  if (type === 'email') {
    switch (status) {
      case 'Sent':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
            <MailCheck className="w-3.5 h-3.5 text-emerald-600" />
            Sent
          </span>
        );
      case 'Sending':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses}`}>
            <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
            Sending...
          </span>
        );
      case 'Failed':
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}>
            <MailX className="w-3.5 h-3.5 text-red-600" />
            Failed
          </span>
        );
      case 'Not Sent':
      default:
        return (
          <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Not Sent
          </span>
        );
    }
  }

  return <span>{status}</span>;
};

export default ProformaStatusBadge;
