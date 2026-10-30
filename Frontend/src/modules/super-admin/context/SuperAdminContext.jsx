import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const SuperAdminContext = createContext();

export const SuperAdminProvider = ({ children }) => {
  const navigate = useNavigate();
  const { setSuperAdminSessionValid } = useAuth();

  const [sessionValid, setSessionValid] = useState(() => {
    try {
      const hasToken =
        Boolean(localStorage.getItem('shippnex_super_admin_token')) ||
        Boolean(localStorage.getItem('shippnex_admin_token'));
      const hasSession = localStorage.getItem('shippnex_super_admin_session') === '1';
      return hasToken || hasSession;
    } catch {
      return false;
    }
  });
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

  // Consolidated scope object for Super Admin platform view
  const ALL_BRANDS_SCOPE = useMemo(() => ({
    id: 'ALL',
    brandId: 'ALL',
    name: 'All Brands & Regions (Consolidated)',
    shortName: 'All Regions',
    code: 'ALL-MP',
    city: 'All MP Hubs',
    state: 'Madhya Pradesh',
    address: 'Centralized Platform Oversight',
    contact: '1800-SAVITRI',
    email: 'treasury@savitri.com',
    gst: 'CENTRALIZED',
    pan: 'CENTRALIZED',
    category: 'Consolidated Treasury',
    website: '',
    status: 'Active',
    logo: '/LogoSavitri.png',
  }), []);

  const [brands, setBrands] = useState([]);

  const [selectedBrandId, setSelectedBrandIdState] = useState(() => {
    try {
      return sessionStorage.getItem('shippnex_super_admin_brand') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const setSelectedBrandId = useCallback((id) => {
    setSelectedBrandIdState(id);
    try {
      sessionStorage.setItem('shippnex_super_admin_brand', id);
    } catch {
      /* ignore private-mode storage failures */
    }
  }, []);

  const isAllScope = selectedBrandId === 'ALL';
  const selectedBrand = useMemo(() => {
    if (selectedBrandId === 'ALL') return ALL_BRANDS_SCOPE;
    const found = brands.find(
      (b) => (b.id === selectedBrandId || b.brandId === selectedBrandId) && b.status === 'Active'
    );
    if (found) return found;

    // Fallback to first ACTIVE brand if available
    const firstActive = brands.find((b) => b.status === 'Active');
    return firstActive || ALL_BRANDS_SCOPE;
  }, [selectedBrandId, brands, ALL_BRANDS_SCOPE]);

  // Auto-fallback: If selected brand becomes inactive or doesn't exist,
  // switch scope to the first active brand, or 'ALL' if all brands are deactivated.
  useEffect(() => {
    if (selectedBrandId === 'ALL') return;
    if (!brands || brands.length === 0) return;

    const currentBrand = brands.find((b) => b.id === selectedBrandId || b.brandId === selectedBrandId);
    if (!currentBrand || currentBrand.status !== 'Active') {
      const firstActive = brands.find((b) => b.status === 'Active');
      const fallbackId = firstActive ? (firstActive.brandId || firstActive.id) : 'ALL';
      setSelectedBrandIdState(fallbackId);
      try {
        sessionStorage.setItem('shippnex_super_admin_brand', fallbackId);
      } catch {}
    }
  }, [brands, selectedBrandId]);

  // Fetch live brands from backend
  const fetchBrands = useCallback(async () => {
    try {
      const res = await API.get('/super-admin/brands');
      if (res.data?.success && Array.isArray(res.data.brands)) {
        const formatted = res.data.brands.map((b) => ({
          ...b,
          id: b.brandId || b._id,
          shortName: b.shortName || b.name,
        }));
        setBrands(formatted);
      }
    } catch (err) {
      // Backend unavailable: keep the last known brand list (empty on first load => consolidated scope)
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const createBrand = useCallback(async (payload) => {
    try {
      const res = await API.post('/super-admin/brands', payload);
      if (res.data?.success && res.data.brand) {
        const created = {
          ...res.data.brand,
          id: res.data.brand.brandId || res.data.brand._id,
          shortName: res.data.brand.shortName || res.data.brand.name,
        };
        setBrands((prev) => [created, ...prev.filter((b) => b.brandId !== created.brandId)]);
        fetchBrands();
        return { ok: true, brand: created };
      }
      return { ok: false, message: res.data?.message || 'Could not create brand.' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to register brand in database.';
      return { ok: false, message };
    }
  }, [fetchBrands]);

  const updateBrand = useCallback(async (id, payload) => {
    try {
      const res = await API.put(`/super-admin/brands/${id}`, payload);
      if (res.data?.success && res.data.brand) {
        fetchBrands();
        return { ok: true, brand: res.data.brand };
      }
      return { ok: false, message: res.data?.message || 'Could not update brand.' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update brand.';
      return { ok: false, message };
    }
  }, [fetchBrands]);

  const toggleBrandStatus = useCallback(async (id, status) => {
    // 1. Optimistically update local brands list immediately
    setBrands((prev) =>
      prev.map((b) => (b.id === id || b.brandId === id ? { ...b, status } : b))
    );

    // 2. If deactivating the currently selected brand, immediately switch scope
    if (status !== 'Active') {
      setSelectedBrandIdState((prevSelected) => {
        if (prevSelected === id) {
          const nextActive = brands.find(
            (b) => b.id !== id && b.brandId !== id && b.status === 'Active'
          );
          const fallback = nextActive ? (nextActive.brandId || nextActive.id) : 'ALL';
          try {
            sessionStorage.setItem('shippnex_super_admin_brand', fallback);
          } catch {}
          return fallback;
        }
        return prevSelected;
      });
    }

    // 3. Persist update to MongoDB backend
    try {
      const res = await API.patch(`/super-admin/brands/${id}/status`, { status });
      if (res.data?.success) {
        fetchBrands();
        return { ok: true, brand: res.data.brand };
      }
      fetchBrands();
      return { ok: false, message: res.data?.message || 'Could not update brand status.' };
    } catch (err) {
      fetchBrands();
      const message = err.response?.data?.message || err.message || 'Failed to toggle brand status.';
      return { ok: false, message };
    }
  }, [brands, fetchBrands]);

  const deleteBrand = useCallback(async (id) => {
    try {
      const res = await API.delete(`/super-admin/brands/${id}`);
      if (res.data?.success) {
        fetchBrands();
        return { ok: true, message: res.data.message };
      }
      return { ok: false, message: res.data?.message || 'Could not delete brand.' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to delete brand.';
      return { ok: false, message };
    }
  }, [fetchBrands]);

  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/super-admin/login')) {
        if (!cancelled) setSessionChecking(false);
        return;
      }

      const storedToken =
        localStorage.getItem('shippnex_super_admin_token') ||
        localStorage.getItem('shippnex_admin_token');
      const hasSession = localStorage.getItem('shippnex_super_admin_session') === '1';

      if (!storedToken && !hasSession) {
        if (!cancelled) {
          setSessionValid(false);
          setSessionChecking(false);
        }
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

  const login = useCallback((adminData, token = null) => {
    if (token) {
      localStorage.setItem('shippnex_super_admin_token', token);
      localStorage.setItem('shippnex_admin_token', token);
    }
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
    // Login mirrors the token/session into the admin keys, so clear both sets.
    [
      'shippnex_super_admin_token',
      'shippnex_super_admin_data',
      'shippnex_super_admin_session',
      'shippnex_admin_token',
      'shippnex_admin_data',
      'shippnex_admin_session',
    ].forEach((key) => localStorage.removeItem(key));
    setSuperAdmin(null);
    setSessionValid(false);
    setSuperAdminSessionValid?.(false);
    navigate('/super-admin/login');
  }, [navigate, setSuperAdminSessionValid]);

  return (
    <SuperAdminContext.Provider
      value={{
        token:
          localStorage.getItem('shippnex_super_admin_token') ||
          localStorage.getItem('shippnex_admin_token') ||
          (sessionValid ? 'session' : null),
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
        isAllScope,
        fetchBrands,
        createBrand,
        updateBrand,
        toggleBrandStatus,
        deleteBrand,
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
