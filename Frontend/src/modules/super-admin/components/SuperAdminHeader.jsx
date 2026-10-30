import React from 'react';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { ShieldCheck, Bell, RefreshCw, Lock } from 'lucide-react';

export const SuperAdminHeader = ({ title, subtitle, onRefresh, refreshing, titleClassName, subtitleClassName }) => {
  const { superAdmin, logout, selectedBrand } = useSuperAdmin();

  return (
    <header className="sticky top-0 z-30 flex min-h-18 w-full min-w-0 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 shadow-xs font-sans sm:px-6 lg:px-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg sm:text-xl font-black text-[#1A2E0A] tracking-tight m-0">{title || 'Treasury & Ledger'}</h1>
          <span className="flex items-center gap-1 text-[10.5px] font-extrabold bg-orange-50 text-[#F7941D] border border-orange-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
            <ShieldCheck size={12} /> SECURE TREASURY
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{selectedBrand?.shortName || selectedBrand?.name || 'All Regions'}</span>
            <span className="text-emerald-600/80 font-normal">({selectedBrand?.city || 'Consolidated'})</span>
          </span>
        </div>
        {subtitle && <p className={subtitleClassName || 'text-xs text-slate-500 m-0 mt-0.5 font-medium'}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Refresh financial data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#F7941D]' : 'text-slate-600'} />
            <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900 m-0 leading-tight">{superAdmin?.name || 'Chief Financial Officer'}</p>
            <p className="text-[10px] text-[#F7941D] font-mono font-bold m-0 flex items-center justify-end gap-1">
              <Lock size={10} /> Super Admin
            </p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
