import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, CalendarCheck, CalendarDays, Camera, CheckSquare, Clock, LayoutDashboard, LogOut, User, Wallet } from 'lucide-react';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import employeePortalService from '../../../services/employeePortalService';
import { SelfieProvider, useSelfie } from '../context/SelfieContext';
import { SelfieChecking, SelfieGate, SelfieReminderBanner } from '../components/SelfieWidgets';

// Desktop sidebar shows everything; the phone's bottom bar keeps the five everyday tabs
// (notifications live behind the bell, the profile behind the avatar).
const SIDEBAR_NAV = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/attendance', label: 'Attendance', icon: Clock },
  { to: '/employee/selfie', label: 'Selfie Verification', icon: Camera },
  { to: '/employee/salary', label: 'My Salary', icon: Wallet },
  { to: '/employee/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/employee/leaves', label: 'Leave', icon: CalendarCheck },
  { to: '/employee/holidays', label: 'Holidays', icon: CalendarDays },
  { to: '/employee/notifications', label: 'Notifications', icon: Bell },
  { to: '/employee/profile', label: 'My Profile', icon: User },
];
const TABS = [
  { to: '/employee/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/employee/attendance', label: 'Attendance', icon: Clock },
  { to: '/employee/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/employee/leaves', label: 'Leave', icon: CalendarCheck },
  { to: '/employee/holidays', label: 'Holidays', icon: CalendarDays },
];

export default function EmployeeLayout() {
  return (
    <SelfieProvider>
      <EmployeeLayoutInner />
    </SelfieProvider>
  );
}

function EmployeeLayoutInner() {
  const { employee, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const { status: selfieStatus, loaded: selfieLoaded, error: selfieError, refresh: refreshSelfie, needsAction } = useSelfie();
  // The app stays closed until today's login selfie exists (or the server says none is needed)
  const gateOpen = selfieLoaded && selfieStatus?.required && selfieStatus?.loginRequired;
  const checking = !selfieLoaded || (selfieError && !selfieStatus);

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

  const avatar = employee?.avatar ? (
    <img src={employee.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
  ) : (
    <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">{(employee?.fullName || '?').charAt(0).toUpperCase()}</span>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <img src="/LogoSavitri.png" alt="" className="w-9 h-9 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div>
            <p className="text-sm font-extrabold text-slate-900 m-0 leading-tight">Employee Portal</p>
            <p className="text-xs text-slate-500 m-0">{employee?.brandName}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {SIDEBAR_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold no-underline transition-colors ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{label}</span>
              {to.endsWith('notifications') && unread > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer bg-transparent border-0">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: compact on phones */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center gap-3 pt-[env(safe-area-inset-top,0px)] box-content">
          <div className="lg:hidden flex items-center gap-2.5 min-w-0">
            <img src="/LogoSavitri.png" alt="" className="w-8 h-8 object-contain shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] font-extrabold text-slate-900 m-0 truncate">Employee Portal</p>
              <p className="text-xs text-slate-500 m-0 truncate">{employee?.brandName}</p>
            </div>
          </div>
          <div className="flex-1" />
          <NavLink to="/employee/selfie" data-testid="header-selfie" className="relative w-11 h-11 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center" aria-label="Selfie verification">
            <Camera className="w-6 h-6" />
            {needsAction && <span data-testid="header-selfie-dot" className="absolute top-2 right-2 w-3 h-3 rounded-full bg-rose-500 border-2 border-white" />}
          </NavLink>
          <NavLink to="/employee/notifications" className="relative w-11 h-11 -mr-1 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center" aria-label="Notifications">
            <Bell className="w-6 h-6" />
            {unread > 0 && <span className="absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
          </NavLink>
          <NavLink to="/employee/profile" className="flex items-center justify-center gap-2.5 no-underline min-w-11 min-h-11" aria-label="My profile">
            {avatar}
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-slate-800 m-0">{employee?.fullName}</p>
              <p className="text-xs text-slate-500 m-0">{employee?.employeeId}</p>
            </div>
          </NavLink>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-4 sm:p-6 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-6">
          {!checking && !gateOpen && (
            <>
              <SelfieReminderBanner />
              <Outlet />
            </>
          )}
        </main>
        {checking && <SelfieChecking error={selfieError} onRetry={refreshSelfie} onLogout={handleLogout} />}
        {gateOpen && <SelfieGate onLogout={handleLogout} />}

        {/* Phone bottom tab bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]" aria-label="Main">
          <ul className="grid grid-cols-5 list-none m-0 p-0">
            {TABS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 h-14 no-underline text-[10px] font-semibold transition-colors ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`w-11 h-6 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-100' : ''}`}><Icon className="w-5 h-5" /></span>
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
