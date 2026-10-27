import React from 'react';
import { Clock, Truck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const ChallanStatusBadge = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold',
  }[size] || 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size] || 14;

  const config = {
    Draft: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Clock,
      label: 'Draft',
    },
    Dispatched: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: Truck,
      label: 'Dispatched',
    },
    'Partially Delivered': {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      label: 'Partially Delivered',
    },
    Delivered: {
      bg: 'bg-teal-50 text-teal-800 border-teal-200',
      icon: CheckCircle2,
      label: 'Delivered',
    },
    Cancelled: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: XCircle,
      label: 'Cancelled',
    },
  }[status] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
    label: status || 'Draft',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-all ${config.bg} ${sizeClasses}`}
    >
      <Icon size={iconSizes} className="shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default ChallanStatusBadge;
