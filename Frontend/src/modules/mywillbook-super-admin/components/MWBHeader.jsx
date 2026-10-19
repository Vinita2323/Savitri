import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, Search, User } from 'lucide-react';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';

/**
 * Top header: breadcrumbs, optional search, notifications (demo), profile menu.
 */
export const MWBHeader = ({
  breadcrumbs = [],
  search,
  onSearchChange,
  searchPlaceholder = 'Search demo data…',
  showSearch = false,
}) => {
  const { notifications } = useMyWillBookSuperAdmin();
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="min-w-0 flex-1">
        {breadcrumbs.length > 0 ? (
          <nav className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-400">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-slate-700' : ''}>{crumb}</span>
              </span>
            ))}
          </nav>
        ) : (
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            MyWillBook Super Admin
          </p>
        )}
      </div>

      {showSearch && typeof onSearchChange === 'function' && (
        <div className="relative w-full max-w-xs sm:w-56">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-[#FF9418]"
          />
        </div>
      )}

      <div className="relative" ref={bellRef}>
        <button
          type="button"
          onClick={() => {
            setBellOpen((v) => !v);
            setProfileOpen(false);
          }}
          className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF9418] px-1 text-[9px] font-black text-white">
              {unread}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
              Demo notifications
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-slate-50 px-3 py-2.5 ${n.unread ? 'bg-orange-50/40' : ''}`}
                >
                  <p className="text-xs font-bold text-slate-800">{n.title}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{n.at}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => {
            setProfileOpen((v) => !v);
            setBellOpen(false);
          }}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#172D0B] text-white">
            <User size={14} />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-extrabold text-slate-800">Root Administrator</p>
            <p className="truncate text-[10px] font-medium text-slate-400">Demo · full access</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
        {profileOpen && (
          <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-3 py-3">
              <p className="text-xs font-extrabold text-slate-800">Root Administrator</p>
              <p className="text-[11px] font-medium text-slate-400">root@demo.mywillbook</p>
            </div>
            <p className="px-3 py-2 text-[11px] font-semibold text-amber-700">
              Demo profile — no live session.
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default MWBHeader;
