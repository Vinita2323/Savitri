import React from 'react';
import {
  Clock,
  Send,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';

export const QuotationStatusChip = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Draft':
        return {
          label: 'Draft',
          icon: Clock,
          className: 'bg-slate-100 text-slate-700 border-slate-300',
          dotColor: 'bg-slate-400',
        };
      case 'Sent':
        return {
          label: 'Sent',
          icon: Send,
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
        };
      case 'Under Review':
        return {
          label: 'Under Review',
          icon: Eye,
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
        };
      case 'Revision Requested':
        return {
          label: 'Revision Requested',
          icon: RotateCcw,
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          dotColor: 'bg-purple-500',
        };
      case 'Accepted':
        return {
          label: 'Accepted',
          icon: CheckCircle2,
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500',
        };
      case 'Rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: 'bg-rose-500',
        };
      case 'Expired':
        return {
          label: 'Expired',
          icon: AlertTriangle,
          className: 'bg-orange-50 text-orange-700 border-orange-200',
          dotColor: 'bg-orange-500',
        };
      case 'Converted to Order':
        return {
          label: 'Converted to Order',
          icon: FileCheck2,
          className: 'bg-teal-50 text-teal-800 border-teal-300 font-bold',
          dotColor: 'bg-teal-600',
        };
      default:
        return {
          label: status || 'Pending',
          icon: Clock,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
        };
    }
  };

  const { label, icon: Icon, className, dotColor } = getStatusConfig();
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs font-bold gap-2'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide whitespace-nowrap select-none shadow-2xs ${className} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <Icon size={size === 'sm' ? 11 : 13} className="shrink-0" />
      <span>{label}</span>
    </span>
  );
};
