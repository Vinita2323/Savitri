import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSuperAdmin } from '../context/SuperAdminContext';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  Store,
  Wallet,
  Bike,
  RotateCcw,
  Percent,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Lock,
  Boxes,
  FileSpreadsheet,
  Truck,
  Landmark,
  ScanBarcode,
  Users,
  UserCheck,
  CalendarCheck,
  ClipboardList,
  CalendarRange,
  Clock,
} from 'lucide-react';
import { SuperAdminBrandSwitcher } from './SuperAdminBrandSwitcher';

export const SuperAdminSidebar = () => {
  const { sidebarOpen, setSidebarOpen, logout, superAdmin } = useSuperAdmin();
  const location = useLocation();

  const navigationItems = [
    {
      group: 'TREASURY & LEDGER',
      items: [
        {
          to: '/super-admin/dashboard',
          label: 'Financial Dashboard',
          icon: LayoutDashboard,
        },
        {
          to: '/super-admin/cash-bank',
          label: 'Cash and Bank',
          icon: Landmark,
        },
        {
          to: '/super-admin/transactions',
          label: 'Seller Payments',
          icon: BookOpen,
        },
        {
          to: '/super-admin/payments',
          label: 'Customer Payments',
          icon: Receipt,
        },
      ],
    },
    {
      group: 'SETTLEMENTS & PAYOUTS',
      items: [
        {
          to: '/super-admin/payouts/sellers',
          label: 'Seller Payouts',
          icon: Wallet,
        },
        {
          to: '/super-admin/payouts/captains',
          label: 'Captain Payouts',
          icon: Bike,
        },
        {
          to: '/super-admin/seller-settlements',
          label: 'Seller Purchases',
          icon: Store,
        },
      ],
    },
    {
      group: 'OPERATIONS & INVENTORY',
      items: [
        {
          to: '/super-admin/stores',
          label: 'Stores & Sellers',
          icon: Store,
        },
        {
          to: '/super-admin/inventory',
          label: 'Inventory Control',
          icon: Boxes,
        },
        {
          to: '/super-admin/pos-billing',
          label: 'POS Billing',
          icon: ScanBarcode,
        },
        {
          to: '/super-admin/delivery-partners',
          label: 'Delivery Partners',
          icon: Bike,
        },
        {
          to: '/super-admin/quotations',
          label: 'Quotation Management',
          icon: FileSpreadsheet,
        },
        {
          to: '/super-admin/proforma-invoices',
          label: 'Proforma Invoices',
          icon: Receipt,
        },
        {
          to: '/super-admin/delivery-challans',
          label: 'Delivery Challan',
          icon: Truck,
        },
      ],
    },
    {
      group: 'WORKFORCE & EMPLOYEE MANAGEMENT',
      items: [
        {
          to: '/super-admin/employees',
          label: 'Employee Dashboard',
          icon: Users,
        },
        {
          to: '/super-admin/employees/directory',
          label: 'Employee Directory',
          icon: UserCheck,
        },
        {
          to: '/super-admin/employees/attendance',
          label: 'Attendance Management',
          icon: CalendarCheck,
        },
        {
          to: '/super-admin/employees/tasks',
          label: 'Task Management',
          icon: ClipboardList,
        },
        {
          to: '/super-admin/employees/leaves',
          label: 'Leave Management',
          icon: CalendarRange,
        },
        {
          to: '/super-admin/employees/shifts',
          label: 'Shifts & Holidays',
          icon: Clock,
        },
        {
          to: '/super-admin/employees/reports',
          label: 'Workforce Reports',
          icon: BarChart3,
        },
      ],
    },
    {
      group: 'GOVERNANCE & ADJUSTMENTS',
      items: [
        {
          to: '/super-admin/refunds',
          label: 'Refunds & Returns',
          icon: RotateCcw,
        },
        {
          to: '/super-admin/commissions',
          label: 'Commissions',
          icon: Percent,
        },
      ],
    },
    {
      group: 'COMPLIANCE & AUDIT',
      items: [
        {
          to: '/super-admin/reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-72' : 'w-20'
      } bg-[#1A2E0A] text-slate-100 transition-all duration-300 flex flex-col h-screen sticky top-0 z-40 shrink-0 select-none shadow-2xl font-sans`}
    >
      {/* Brand switcher header (My Bill Book style) */}
      <div className="shrink-0 border-b border-[#003837] bg-[#001c1b] px-3 py-3">
        <div className={`mb-2 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <p className="text-xs font-normal uppercase tracking-wider text-teal-300/50">Savitri Treasury</p>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="cursor-pointer rounded-lg border-none bg-transparent p-1.5 text-teal-300/80 transition-colors hover:bg-[#003837] hover:text-white"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        <SuperAdminBrandSwitcher collapsed={!sidebarOpen} />
      </div>

      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navigationItems.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {sidebarOpen && (
              <h4 className="text-xs font-normal text-teal-300/60 tracking-wider uppercase px-3 mb-2">
                {sec.group}
              </h4>
            )}
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  (item.to === '/super-admin/employees'
                    ? location.pathname === '/super-admin/employees' || location.pathname === '/super-admin/employees/' || location.pathname === '/super-admin/employees/dashboard'
                    : item.to !== '/super-admin/dashboard' && location.pathname.startsWith(item.to));

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[15px] font-normal border-none cursor-pointer no-underline ${
                      isActive
                        ? 'bg-[#79B433] text-white font-medium shadow-md shadow-[#001c1b]/60'
                        : 'text-teal-100/80 hover:text-white hover:bg-[#003837]'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon
                      size={20}
                      className={isActive ? 'text-white shrink-0' : 'text-teal-300/70 shrink-0'}
                    />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#003837] bg-[#001c1b] shrink-0">
        <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} gap-2`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-[#003837] border border-[#F7941D]/40 flex items-center justify-center text-[#F7941D] shrink-0 font-medium text-sm">
                CFO
              </div>
              <div className="truncate">
                <p className="text-sm font-normal text-white truncate">
                  {superAdmin?.name || 'Chief Financial Officer'}
                </p>
                <p className="text-xs text-teal-300 truncate font-normal flex items-center gap-1">
                  <Lock size={10} /> Super Admin
                </p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#003837] border border-[#F7941D]/40 flex items-center justify-center text-[#F7941D] font-black text-xs">
              SA
            </div>
          )}

          {sidebarOpen && (
            <button
              onClick={logout}
              className="p-2 text-teal-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
              title="Logout from Super Admin Treasury"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
