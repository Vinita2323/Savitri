import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { MWBSidebar } from '../components/MWBSidebar';
import { MWBHeader } from '../components/MWBHeader';

export const MWBLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] font-sans text-slate-800">
      <div className="hidden md:block">
        <MWBSidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 border-none bg-slate-900/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full shadow-2xl">
            <MWBSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 cursor-pointer"
            aria-label="Open menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <img src="/LogoSavitri.png" alt="" className="h-7 w-7 object-contain" />
            <span className="text-sm font-extrabold text-slate-900">MyWillBook Super Admin</span>
          </div>
        </div>

        <MWBHeader breadcrumbs={['MyWillBook', 'Super Admin']} />

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MWBLayout;
