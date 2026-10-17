import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';
import { DemoBanner } from './DemoBanner';

export const BrandSuperAdminHeader = ({ title, subtitle, actions = null }) => {
  const { brands, selectedBrandId, setSelectedBrandId, selectedBrand } = useBrandSuperAdmin();

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold text-slate-900 sm:text-xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-xs font-bold text-slate-800 outline-none focus:border-[#79B433]"
              aria-label="Brand switcher"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.city}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          {selectedBrand ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                selectedBrand.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {selectedBrand.status}
            </span>
          ) : null}
          {actions}
        </div>
      </div>
      <div className="px-4 pb-3 sm:px-6">
        <DemoBanner />
      </div>
    </div>
  );
};
