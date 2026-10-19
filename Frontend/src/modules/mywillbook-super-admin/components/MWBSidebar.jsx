import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Store,
  MapPin,
  Settings2,
  Users,
  Shield,
  ScrollText,
  Wallet,
  Percent,
  Banknote,
  Scale,
  SlidersHorizontal,
  Crown,
  Bell,
  FileText,
  ClipboardList,
  Lock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';

const BASE = '/mywillbook-super-admin';

const SECTIONS = [
  {
    heading: 'OVERVIEW',
    items: [
      { to: `${BASE}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
      { to: `${BASE}/analytics`, label: 'Platform Analytics', icon: BarChart3 },
    ],
  },
  {
    heading: 'BUSINESS MANAGEMENT',
    items: [
      { to: `${BASE}/brands`, label: 'Brand Management', icon: Store },
      { to: `${BASE}/cities`, label: 'City & Service Areas', icon: MapPin },
      { to: `${BASE}/brand-configuration`, label: 'Brand Configuration', icon: Settings2 },
    ],
  },
  {
    heading: 'ACCESS MANAGEMENT',
    items: [
      { to: `${BASE}/admins`, label: 'Admin Management', icon: Users },
      { to: `${BASE}/roles`, label: 'Staff Roles & Permissions', icon: Shield },
      { to: `${BASE}/activity-logs`, label: 'Login & Activity Logs', icon: ScrollText },
    ],
  },
  {
    heading: 'FINANCE & REPORTS',
    items: [
      { to: `${BASE}/finance`, label: 'Financial Overview', icon: Wallet },
      { to: `${BASE}/commissions`, label: 'Commission Reports', icon: Percent },
      { to: `${BASE}/payouts`, label: 'Payout Overview', icon: Banknote },
      { to: `${BASE}/reconciliation`, label: 'Payment Reconciliation', icon: Scale },
    ],
  },
  {
    heading: 'PLATFORM CONTROL',
    items: [
      { to: `${BASE}/settings`, label: 'Global Settings', icon: SlidersHorizontal },
      { to: `${BASE}/membership`, label: 'Global Membership Rules', icon: Crown },
      { to: `${BASE}/notifications`, label: 'Notifications & Templates', icon: Bell },
      { to: `${BASE}/policies`, label: 'Terms & Policies', icon: FileText },
    ],
  },
  {
    heading: 'SECURITY',
    items: [
      { to: `${BASE}/audit-logs`, label: 'Audit Logs', icon: ClipboardList },
      { to: `${BASE}/security`, label: 'Security Settings', icon: Lock },
    ],
  },
];

export const MWBSidebar = ({ onNavigate } = {}) => {
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed, setDemoEntered } = useMyWillBookSuperAdmin();
  const collapsed = sidebarCollapsed;

  const handleNav = () => {
    onNavigate?.();
  };

  const logout = () => {
    setDemoEntered(false);
    navigate(BASE, { replace: true });
    onNavigate?.();
  };

  return (
    <aside
      className={`flex h-full shrink-0 flex-col text-white transition-all ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{ backgroundColor: '#172D0B' }}
    >
      <div
        className={`flex items-center gap-2 border-b border-white/10 px-3 py-4 ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
          <img src="/LogoSavitri.png" alt="Savitri" className="h-full w-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight">MyWillBook</p>
            <p className="truncate text-[10px] font-medium text-emerald-200/70">Super Admin · demo</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {SECTIONS.map((section) => (
          <div key={section.heading}>
            {!collapsed && (
              <p
                className="mb-1.5 px-2 text-[9px] font-black uppercase tracking-widest"
                style={{ color: '#FF9418' }}
              >
                {section.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNav}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold no-underline transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                    style={({ isActive }) =>
                      isActive ? { backgroundColor: '#31551C' } : undefined
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-2">
        <div
          className={`flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#31551C]">
            <User size={14} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold">Root Administrator</p>
              <p className="truncate text-[10px] text-emerald-200/60">Demo profile</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={logout}
          className={`flex w-full items-center gap-2 rounded-xl border-none bg-white/5 px-3 py-2.5 text-xs font-bold text-emerald-100/80 hover:bg-white/10 cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={14} />
          {!collapsed && 'Logout'}
        </button>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-none bg-transparent px-3 py-2 text-xs font-bold text-emerald-100/60 hover:bg-white/5 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default MWBSidebar;
