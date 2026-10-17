import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Info } from 'lucide-react';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';
import { DEMO_BANNER } from '../mock/brandMockData';

/** Preview entry only — not a production authentication system. */
const DemoEntry = () => {
  const navigate = useNavigate();
  const { setDemoEntered } = useBrandSuperAdmin();

  const enter = () => {
    setDemoEntered(true);
    navigate('/brand-super-admin/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A2E0A] p-4 font-sans">
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-[#355A1C] bg-[#0F1C06] p-6 shadow-2xl sm:p-8">
        <div className="text-center space-y-3">
          <div className="mx-auto inline-flex rounded-2xl bg-white p-3 shadow-md">
            <img src="/LogoSavitri.png" alt="Savitri" className="h-10 object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2 text-white">
            <Shield size={18} className="text-[#F7941D]" />
            <h1 className="text-xl font-bold">Brand Super Admin</h1>
          </div>
          <p className="text-xs text-teal-300/70">Multi-brand management frontend prototype</p>
        </div>

        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-semibold text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            DEMO ENTRY ONLY — {DEMO_BANNER} This screen does not authenticate users or create accounts.
          </span>
        </div>

        <button
          type="button"
          onClick={enter}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[#79B433] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#79B433]/20 hover:bg-[#689A2B]"
        >
          Enter demo panel
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default DemoEntry;
