import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const SuperAdminContext = createContext();

export const SuperAdminProvider = ({ children }) => {
  const navigate = useNavigate();
  const { setSuperAdminSessionValid } = useAuth();

  const [sessionValid, setSessionValid] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  const [superAdmin, setSuperAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem('shippnex_super_admin_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // UI-only brand list for Super Admin switcher (not wired to financial APIs)
  const [brands, setBrands] = useState([
    { id: 'brand_fg', name: 'Fashion Gallary', shortName: 'Fashion Gallary', city: 'Indore', code: 'FG-IND' },
    { id: 'brand_fh', name: 'Fashion Hub', shortName: 'Fashion Hub', city: 'Bhopal', code: 'FH-BPL' },
    { id: 'brand_fa', name: 'Fashion Adda', shortName: 'Fashion Adda', city: 'Jabalpur', code: 'FA-JBP' },
  ]);

  const [selectedBrandId, setSelectedBrandId] = useState('brand_fg');
  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || brands[0] || null;

  const createBrand = useCallback((payload) => {
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    const city = String(payload.city || '').trim();
    if (!name || !code || !city) {
      return { ok: false, message: 'Brand name, code, and city are required.' };
    }
    if (brands.some((b) => b.code.toUpperCase() === code)) {
      return { ok: false, message: 'Brand code already exists in this list.' };
    }
    const id = `brand_${Date.now()}`;
    const next = {
      id,
      name,
      shortName: name,
      city,
      code,
    };
    setBrands((prev) => [next, ...prev]);
    setSelectedBrandId(id);
    return { ok: true, brand: next };
  }, [brands]);

  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/super-admin/login')) {
        if (!cancelled) setSessionChecking(false);
        return;
      }
      try {
        const res = await API.get('/auth/super-admin/me');
        if (!cancelled && res.data?.success && res.data.superAdmin) {
          setSuperAdmin(res.data.superAdmin);
          setSessionValid(true);
          setSuperAdminSessionValid?.(true);
          localStorage.setItem('shippnex_super_admin_session', '1');
          localStorage.setItem('shippnex_super_admin_data', JSON.stringify(res.data.superAdmin));
          localStorage.removeItem('shippnex_super_admin_token');
        } else if (!cancelled) {
          setSessionValid(false);
          setSuperAdminSessionValid?.(false);
        }
      } catch (e) {
        if (!cancelled) {
          setSessionValid(false);
          setSuperAdminSessionValid?.(false);
          localStorage.removeItem('shippnex_super_admin_token');
          localStorage.removeItem('shippnex_super_admin_session');
        }
      } finally {
        if (!cancelled) setSessionChecking(false);
      }
    };
    validate();
    return () => {
      cancelled = true;
    };
  }, [setSuperAdminSessionValid]);

  const login = useCallback((adminData) => {
    localStorage.removeItem('shippnex_super_admin_token');
    localStorage.setItem('shippnex_super_admin_data', JSON.stringify(adminData));
    localStorage.setItem('shippnex_super_admin_session', '1');
    setSuperAdmin(adminData);
    setSessionValid(true);
    setSuperAdminSessionValid?.(true);
  }, [setSuperAdminSessionValid]);

  const logout = useCallback(async () => {
    try {
      await API.post('/auth/super-admin/logout');
    } catch (e) {}
    localStorage.removeItem('shippnex_super_admin_token');
    localStorage.removeItem('shippnex_super_admin_data');
    localStorage.removeItem('shippnex_super_admin_session');
    setSuperAdmin(null);
    setSessionValid(false);
    setSuperAdminSessionValid?.(false);
    navigate('/super-admin/login');
  }, [navigate, setSuperAdminSessionValid]);

  return (
    <SuperAdminContext.Provider
      value={{
        token: sessionValid ? 'cookie' : null,
        superAdmin,
        sidebarOpen,
        setSidebarOpen,
        login,
        logout,
        isAuthenticated: sessionValid,
        sessionChecking,
        brands,
        selectedBrandId,
        setSelectedBrandId,
        selectedBrand,
        createBrand,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
