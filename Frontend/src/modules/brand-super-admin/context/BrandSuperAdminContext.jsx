import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  INITIAL_BRANDS,
  INITIAL_ADMINS,
  MONTHLY_TRENDS,
  RECENT_ACTIVITY,
  SELLER_PERF,
  CAPTAIN_PERF,
  EXPENSE_ROWS,
} from '../mock/brandMockData';

const BrandSuperAdminContext = createContext(null);

export const BrandSuperAdminProvider = ({ children }) => {
  const [brands, setBrands] = useState(INITIAL_BRANDS);
  const [admins, setAdmins] = useState(INITIAL_ADMINS);
  const [selectedBrandId, setSelectedBrandId] = useState(INITIAL_BRANDS[0]?.id || null);
  const [demoEntered, setDemoEntered] = useState(false);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) || brands[0] || null,
    [brands, selectedBrandId]
  );

  const summary = useMemo(() => {
    const active = brands.filter((b) => b.status === 'Active');
    return {
      totalBrands: brands.length,
      totalCities: new Set(brands.map((b) => b.city)).size,
      totalSellers: brands.reduce((s, b) => s + (b.sellers || 0), 0),
      totalCaptains: brands.reduce((s, b) => s + (b.captains || 0), 0),
      totalOrders: brands.reduce((s, b) => s + (b.orders || 0), 0),
      combinedSales: brands.reduce((s, b) => s + (b.sales || 0), 0),
      totalExpenses: brands.reduce((s, b) => s + (b.expenses || 0), 0),
      pendingApprovals: brands.filter((b) => b.status === 'Inactive').length + 2,
      activeBrands: active.length,
    };
  }, [brands]);

  const isBrandCodeUnique = (code, excludeId = null) => {
    const normalized = String(code || '').trim().toUpperCase();
    return !brands.some(
      (b) => b.code.toUpperCase() === normalized && b.id !== excludeId
    );
  };

  const createBrand = (payload) => {
    const id = `brand_${Date.now()}`;
    const next = {
      id,
      sellers: 0,
      captains: 0,
      products: 0,
      orders: 0,
      sales: 0,
      expenses: 0,
      inventoryValue: 0,
      revenue: 0,
      logo: payload.logo || '/LogoSavitri.png',
      ...payload,
      code: String(payload.code || '').trim().toUpperCase(),
    };
    setBrands((prev) => [next, ...prev]);
    setSelectedBrandId(id);
    return next;
  };

  const updateBrand = (id, patch) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch, code: patch.code ? String(patch.code).trim().toUpperCase() : b.code } : b))
    );
  };

  const toggleBrandStatus = (id) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: b.status === 'Active' ? 'Inactive' : 'Active' } : b
      )
    );
  };

  const createAdmin = (payload) => {
    const id = `adm_${Date.now()}`;
    const next = { id, status: 'Active', ...payload };
    setAdmins((prev) => [next, ...prev]);
    return next;
  };

  const updateAdmin = (id, patch) => {
    setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const toggleAdminStatus = (id) => {
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a
      )
    );
  };

  const value = {
    brands,
    admins,
    selectedBrandId,
    setSelectedBrandId,
    selectedBrand,
    summary,
    demoEntered,
    setDemoEntered,
    isBrandCodeUnique,
    createBrand,
    updateBrand,
    toggleBrandStatus,
    createAdmin,
    updateAdmin,
    toggleAdminStatus,
    monthlyTrends: MONTHLY_TRENDS,
    recentActivity: RECENT_ACTIVITY,
    sellerPerf: SELLER_PERF,
    captainPerf: CAPTAIN_PERF,
    expenseRows: EXPENSE_ROWS,
  };

  return (
    <BrandSuperAdminContext.Provider value={value}>
      {children}
    </BrandSuperAdminContext.Provider>
  );
};

export const useBrandSuperAdmin = () => {
  const ctx = useContext(BrandSuperAdminContext);
  if (!ctx) {
    throw new Error('useBrandSuperAdmin must be used within BrandSuperAdminProvider');
  }
  return ctx;
};
