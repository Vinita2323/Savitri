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
    {
      id: 'brand_fg',
      name: 'Fashion Gallary',
      shortName: 'Fashion Gallary',
      code: 'FG-IND',
      city: 'Indore',
      state: 'Madhya Pradesh',
      address: '12 MG Road, Near Rajwada',
      contact: '9876543210',
      email: 'ops@fashiongallary.in',
      gst: '23AABCF1234A1Z5',
      pan: 'AABCF1234A',
      category: 'Apparel & Fashion',
      website: 'https://fashiongallary.in',
      status: 'Active',
      logo: '/LogoSavitri.png',
    },
    {
      id: 'brand_fh',
      name: 'Fashion Hub',
      shortName: 'Fashion Hub',
      code: 'FH-BPL',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      address: '45 New Market, TT Nagar',
      contact: '9876501234',
      email: 'hello@fashionhub.in',
      gst: '23AABCF5678B1Z2',
      pan: 'AABCF5678B',
      category: 'Apparel & Fashion',
      website: '',
      status: 'Active',
      logo: '/LogoSavitri.png',
    },
    {
      id: 'brand_fa',
      name: 'Fashion Adda',
      shortName: 'Fashion Adda',
      code: 'FA-JBP',
      city: 'Jabalpur',
      state: 'Madhya Pradesh',
      address: '88 Civil Lines',
      contact: '9123456780',
      email: 'care@fashionadda.in',
      gst: '23AABCF9012C1Z9',
      pan: 'AABCF9012C',
      category: 'Apparel & Fashion',
      website: '',
      status: 'Active',
      logo: '/LogoSavitri.png',
    },
  ]);

  const [selectedBrandId, setSelectedBrandId] = useState('brand_fg');
  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || brands[0] || null;

  const createBrand = useCallback((payload) => {
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    const city = String(payload.city || '').trim();
    const state = String(payload.state || '').trim();
    const address = String(payload.address || '').trim();
    const contact = String(payload.contact || '').replace(/\D/g, '').slice(-10);
    const email = String(payload.email || '').trim().toLowerCase();
    const gst = String(payload.gst || '').trim().toUpperCase();
    const pan = String(payload.pan || '').trim().toUpperCase();
    const category = String(payload.category || '').trim();
    const website = String(payload.website || '').trim();
    const status = payload.status === 'Inactive' ? 'Inactive' : 'Active';
    const logo = payload.logo || '/LogoSavitri.png';
    const description = String(payload.description || '').trim();

    if (!name || !code || !city || !state || !address || !contact || !email || !gst || !pan || !category) {
      return { ok: false, message: 'Please fill all required brand and compliance fields.' };
    }
    if (!/^\d{10}$/.test(contact)) {
      return { ok: false, message: 'Enter a valid 10-digit contact number.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, message: 'Enter a valid business email.' };
    }
    if (brands.some((b) => b.code.toUpperCase() === code)) {
      return { ok: false, message: 'Brand code already exists in this list.' };
    }
    const shortName = String(payload.shortName || name).trim() || name;
    const id = `brand_${Date.now()}`;
    const next = {
      id,
      name,
      shortName,
      code,
      city,
      state,
      address,
      contact,
      email,
      gst,
      pan,
      category,
      website,
      status,
      logo,
      description,
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
