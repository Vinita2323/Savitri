import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEmployee } from '../context/EmployeeContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  CheckSquare,
  CalendarCheck,
  CalendarDays,
  FileBarChart,
  Building2,
  LogIn,
  LogOut,
} from 'lucide-react';

export const EmployeeHeader = ({ activeTabName = 'dashboard', onNavigate }) => {
  const location = useLocation();
  const { activeBrandId, selectedBrand, brandsList, alert } = useEmployee();

  const isSuperAdmin = location.pathname.startsWith('/super-admin');
  const basePath = isSuperAdmin ? '/super-admin/employees' : '/admin/employees';

  const navLinks = [
    { id: 'dashboard', to: `${basePath}`, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', to: `${basePath}/directory`, label: 'Directory', icon: Users },
    { id: 'attendance', to: `${basePath}/attendance`, label: 'Attendance', icon: Clock },
    { id: 'tasks', to: `${basePath}/tasks`, label: 'Tasks', icon: CheckSquare },
    { id: 'leaves', to: `${basePath}/leaves`, label: 'Leaves', icon: CalendarCheck },
    { id: 'shifts', to: `${basePath}/shifts`, label: 'Shifts & Holidays', icon: CalendarDays },
    { id: 'reports', to: `${basePath}/reports`, label: 'Reports', icon: FileBarChart },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* Toast Alert Notification */}
      {alert && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg border flex items-center gap-2 ${
              alert.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : alert.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : alert.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span>{alert.text}</span>
          </div>
        </div>
      )}

      {/* Top Title & Brand Context Bar */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold text-slate-900 leading-none">
                Employee & Workforce Management
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                HR Suite
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Live attendance tracking, shifts, task workflows, and leave management
            </p>
          </div>
        </div>

        {/* Brand Context Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Brand Scope:</span>
            <span className="font-bold text-slate-800">
              {selectedBrand?.name || (activeBrandId === 'ALL' ? 'All Brands' : activeBrandId)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Submenu Tabs */}
      <div className="px-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {navLinks.map((tab) => {
          const Icon = tab.icon;
          // Support both react-router NavLink and onNavigate callback (for AdminLayout)
          if (onNavigate) {
            const isActive = activeTabName === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`flex items-center gap-2 px-4.5 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          }

          const isActive =
            tab.id === 'dashboard'
              ? location.pathname === tab.to || location.pathname === `${tab.to}/`
              : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={`flex items-center gap-2 px-4.5 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer no-underline ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeHeader;
