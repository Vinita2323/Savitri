import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Info } from 'lucide-react';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { DEMO_BANNER } from '../data/mockData';

/** Demo landing — not a production authentication system. */
const DemoEntry = () => {
  const navigate = useNavigate();
  const { setDemoEntered } = useMyWillBookSuperAdmin();

  const enter = () => {
    setDemoEntered(true);
    navigate('/mywillbook-super-admin/dashboard', { replace: true });
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 font-sans"
      style={{ backgroundColor: '#172D0B' }}
    >
      <div
        className="w-full max-w-md space-y-5 rounded-3xl border p-6 shadow-2xl sm:p-8"
        style={{ backgroundColor: '#0f1f08', borderColor: '#31551C' }}
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex rounded-2xl bg-white p-3 shadow-md">
            <img src="/LogoSavitri.png" alt="Savitri" className="h-10 object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2 text-white">
            <Shield size={18} style={{ color: '#FF9418' }} />
            <h1 className="text-xl font-bold">MyWillBook Super Admin</h1>
          </div>
          <p className="text-xs text-emerald-200/70">
            Platform control panel — frontend demo only
          </p>
        </div>

        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-semibold text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            DEMO ENTRY ONLY — {DEMO_BANNER} This screen does not authenticate users or create
            accounts.
          </span>
        </div>

        <ul className="space-y-1.5 text-left text-[11px] font-medium text-emerald-100/70">
          <li>· Brands, cities, admins & roles (mock CRUD)</li>
          <li>· Finance, commissions, payouts & reconciliation</li>
          <li>· Settings, membership, templates & policies</li>
          <li>· Audit logs & security settings</li>
        </ul>

        <button
          type="button"
          onClick={enter}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90"
          style={{ backgroundColor: '#FF9418' }}
        >
          Enter Panel
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default DemoEntry;
