import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, CalendarCheck, CalendarDays, CheckSquare, Clock, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import employeePortalService from '../../../services/employeePortalService';

const NAV = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/attendance', label: 'Attendance', icon: Clock },
  { to: '/employee/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/employee/leaves', label: 'Leave', icon: CalendarCheck },
  { to: '/employee/holidays', label: 'Holidays', icon: CalendarDays },
  { to: '/employee/notifications', label: 'Notifications', icon: Bell },
  { to: '/employee/profile', label: 'My Profile', icon: User },
];

export default function EmployeeLayout() {
  const { employee, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      employeePortalService
        .notifications({ limit: 1 })
        .then((d) => alive && setUnread(d.unread || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    const onChange = () => load();
    window.addEventListener('employee-notifications-changed', onChange);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener('employee-notifications-changed', onChange);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/employee/login', { replace: true });
  };

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <img src="/LogoSavitri.png" alt="" className="w-9 h-9 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div>
          <p className="text-sm font-extrabold text-slate-900 m-0 leading-tight">Employee Portal</p>
          <p className="text-xs text-slate-500 m-0">{employee?.brandName}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold no-underline transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5" />
            <span className="flex-1">{label}</span>
            {to.endsWith('notifications') && unread > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
            )}
          </NavLink>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100">
        <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer bg-transparent border-0">
          <LogOut className="w-4.5 h-4.5" /> Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">{sidebar}</aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[85%] bg-white h-full shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center gap-3">
          <button type="button" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <NavLink to="/employee/notifications" className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            {unread > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />}
          </NavLink>
          <div className="flex items-center gap-2.5">
            {employee?.avatar ? (
              <img src={employee.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">{(employee?.fullName || '?').charAt(0).toUpperCase()}</span>
            )}
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-slate-800 m-0">{employee?.fullName}</p>
              <p className="text-xs text-slate-500 m-0">{employee?.employeeId}</p>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
