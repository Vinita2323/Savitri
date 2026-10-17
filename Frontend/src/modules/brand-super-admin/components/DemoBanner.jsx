import React from 'react';
import { Info } from 'lucide-react';
import { DEMO_BANNER } from '../mock/brandMockData';

export const DemoBanner = ({ className = '' }) => (
  <div
    className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ${className}`}
  >
    <Info size={14} className="mt-0.5 shrink-0" />
    <span>{DEMO_BANNER}</span>
  </div>
);
