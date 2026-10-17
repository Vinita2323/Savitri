import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowLeft,
} from 'lucide-react';

const NAV = [
  { to: '/brand-super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/brand-super-admin/brands', label: 'Brand Management', icon: Store },
  { to: '/brand-super-admin/admins', label: 'Admin Management', icon: Users },
  { to: '/brand-super-admin/finance', label: 'Financial Overview', icon: Wallet },
  { to: '/brand-super-admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/brand-super-admin/settings', label: 'Settings', icon: Settings },
];

export const BrandSuperAdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-slate-200 bg-[#0F1C06] text-white transition-all ${
        collapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      <div className={`flex items-center gap-2 border-b border-white/10 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5">
          <img src="/LogoSavitri.png" alt="Savitri" className="h-full w-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight">Brand Super Admin</p>
            <p className="truncate text-[10px] font-medium text-emerald-200/70">Multi-brand control (demo)</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors no-underline ${
                  isActive
                    ? 'bg-[#79B433] text-white'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={item.label}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => navigate('/brand-super-admin')}
          className={`flex w-full items-center gap-2 rounded-xl border-none bg-white/5 px-3 py-2.5 text-xs font-bold text-emerald-100/80 hover:bg-white/10 cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <ArrowLeft size={14} />
          {!collapsed && 'Demo entry'}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-none bg-transparent px-3 py-2 text-xs font-bold text-emerald-100/60 hover:bg-white/5 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && (
            <span className="flex items-center gap-1">
              <Layers size={12} /> Collapse
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
