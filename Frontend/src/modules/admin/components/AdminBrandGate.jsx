import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import API from '../../../services/api';
import { authService } from '../../../services/authService';
import { useAuth } from '../../../context/AuthContext';
import { getAdminBrand, setAdminBrand, ADMIN_BRAND_CHECK_EVENT } from '../../../utils/adminBrand';
import { setAdminPermissions, resetAdminPermissions, hiddenControlsCss } from '../../../utils/adminPermissions';

const AdminBrandContext = createContext({ restricted: false, brands: [], selected: '' });

/**
 * Wraps the Admin panel. For an admin limited to some brands it makes sure one of THEIR brands is selected before any page
 * loads data, and loads what may be done in that brand; every other admin is not affected.
 */
export const AdminBrandGate = ({ children }) => {
  const [state, setState] = useState({ loading: true, restricted: false, brands: [], selected: '' });
  const shown = useRef(null); // the brand and permissions the pages on screen were loaded for
  const busy = useRef(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (busy.current) return; // several refused calls at once need one check only
    busy.current = true;
    try {
      const { data } = await API.get('/admin/my-brands');
      if (!data?.restricted) {
        setAdminBrand('');
        resetAdminPermissions();
        setState({ loading: false, restricted: false, brands: [], selected: '' });
        return;
      }
      const brands = data.brands || [];
      const stored = getAdminBrand();
      const selected = brands.some((b) => b.brandId === stored) ? stored : brands[0]?.brandId || '';
      setAdminBrand(selected);
      const current = brands.find((b) => b.brandId === selected);
      const access = data.enforced
        ? { enforced: true, configured: Boolean(current?.configured), permissions: current?.permissions || {} }
        : { enforced: false, configured: true, permissions: {} };
      // the brand being shown, or what may be done in it, changed while the panel was open: start again with clean pages
      const signature = JSON.stringify([selected, access]);
      if (shown.current && selected && shown.current !== signature) { window.location.reload(); return; }
      shown.current = signature;
      setAdminPermissions(access);
      setState({ loading: false, restricted: true, brands, selected, css: hiddenControlsCss(data.allActions) });
    } catch {
      setState((s) => ({ ...s, loading: false })); // pages show their own errors; the server enforces access either way
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => resetAdminPermissions, []); // leaving the Admin panel: other panels are not limited by this

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener(ADMIN_BRAND_CHECK_EVENT, load);
    window.addEventListener('focus', load);
    return () => { window.removeEventListener(ADMIN_BRAND_CHECK_EVENT, load); window.removeEventListener('focus', load); };
  }, [load]);

  if (state.loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500" data-testid="admin-brand-loading">Loading your panel…</div>;

  if (state.restricted && state.brands.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" data-testid="admin-no-brands">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <Building2 className="mx-auto text-slate-400" size={32} />
          <h1 className="m-0 text-lg font-extrabold text-slate-900">No brand assigned yet</h1>
          <p className="m-0 text-sm text-slate-600">Your account is active, but no brand is assigned to it. Please ask your Super Admin to assign one, then reload this page.</p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white border-0 cursor-pointer">Reload</button>
            <button type="button" onClick={() => { authService.logout('admin'); logout('admin'); navigate('/admin/login', { replace: true }); }} className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white cursor-pointer">Log out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminBrandContext.Provider value={state}>
      {state.css ? <style data-testid="admin-permission-css">{state.css}</style> : null}
      {children}
    </AdminBrandContext.Provider>
  );
};

/** Header control: which of the admin's brands the panel is showing. Hidden for admins who are not limited to brands. */
export const AdminBrandSwitcher = () => {
  const { restricted, brands, selected } = useContext(AdminBrandContext);
  if (!restricted) return null;
  return (
    <label className="flex items-center gap-2 min-w-0 text-xs font-bold text-slate-600">
      <Building2 size={16} className="text-emerald-700 shrink-0" />
      <span className="hidden lg:inline">Brand</span>
      <select
        data-testid="admin-brand-switcher"
        aria-label="Brand shown in the panel"
        value={selected}
        onChange={(e) => { setAdminBrand(e.target.value); window.location.reload(); }}
        className="min-w-0 max-w-[150px] sm:max-w-[260px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 cursor-pointer"
      >
        {brands.map((b) => <option key={b.brandId} value={b.brandId}>{b.name} ({b.city}){b.status !== 'Active' ? ` · ${b.status}` : ''}</option>)}
      </select>
    </label>
  );
};
