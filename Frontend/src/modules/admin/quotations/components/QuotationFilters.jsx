import React from 'react';
import { Search, RotateCcw, Filter, Calendar } from 'lucide-react';
import { ORGANIZATION_TYPES, QUOTATION_STATUSES } from '../data/mockQuotations';

export const QuotationFilters = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  dateFilter,
  onDateFilterChange,
  onReset,
  totalResults,
  isFiltered,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search quote #, org name, contact..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#F7941D] focus:bg-white focus:ring-2 focus:ring-[#F7941D]/15"
          />
        </div>

        {/* Organization Type filter */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
            aria-label="Filter by organization type"
          >
            <option value="ALL">All Organization Types</option>
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
            aria-label="Filter by quotation status"
          >
            <option value="ALL">All Statuses</option>
            {QUOTATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
            aria-label="Filter by date range"
          >
            <option value="ALL">All Time / Any Date</option>
            <option value="weekly">This Week (Last 7 Days)</option>
            <option value="monthly">This Month (Last 30 Days)</option>
            <option value="quarterly">This Quarter (Last 90 Days)</option>
            <option value="valid_active">Currently Valid (Not Expired)</option>
          </select>
        </div>
      </div>

      {/* Secondary Bar: Active count and Reset */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Filter size={13} className="text-[#F7941D]" />
          <span>
            Showing <strong className="text-slate-800 font-bold">{totalResults}</strong> quotations
          </span>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-xs"
          >
            <RotateCcw size={12} className="text-[#F7941D]" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
