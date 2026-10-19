import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  INITIAL_BRANDS,
  INITIAL_CITIES,
  INITIAL_ADMINS,
  INITIAL_ROLES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_AUDIT_LOGS,
  FINANCE_SUMMARY,
  INITIAL_COMMISSIONS,
  INITIAL_PAYOUTS,
  INITIAL_RECONCILIATION,
  INITIAL_MEMBERSHIP_PLANS,
  INITIAL_TEMPLATES,
  INITIAL_POLICIES,
  INITIAL_GLOBAL_SETTINGS,
  INITIAL_SECURITY_SETTINGS,
  ANALYTICS_SERIES,
  RECENT_ACTIVITY,
  DEMO_NOTIFICATIONS,
  ALL_PERMISSIONS,
} from '../data/mockData';

const MyWillBookSuperAdminContext = createContext(null);

const PAYOUT_TRANSITIONS = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['Processing', 'Rejected'],
  Processing: ['Paid', 'Rejected'],
  Paid: [],
  Rejected: [],
};

export const MyWillBookSuperAdminProvider = ({ children }) => {
  const [brands, setBrands] = useState(INITIAL_BRANDS);
  const [cities, setCities] = useState(INITIAL_CITIES);
  const [admins, setAdmins] = useState(INITIAL_ADMINS);
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [activityLogs] = useState(INITIAL_ACTIVITY_LOGS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [commissions] = useState(INITIAL_COMMISSIONS);
  const [payouts, setPayouts] = useState(INITIAL_PAYOUTS);
  const [reconciliation] = useState(INITIAL_RECONCILIATION);
  const [membershipPlans, setMembershipPlans] = useState(INITIAL_MEMBERSHIP_PLANS);
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [globalSettings, setGlobalSettings] = useState(INITIAL_GLOBAL_SETTINGS);
  const [securitySettings, setSecuritySettings] = useState(INITIAL_SECURITY_SETTINGS);
  const [notifications] = useState(DEMO_NOTIFICATIONS);
  const [demoEntered, setDemoEntered] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pushAudit = (entry) => {
    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        actor: 'Root Administrator',
        at: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ]);
  };

  /* ── Brands ── */
  const createBrand = (payload) => {
    const id = `brand_${Date.now()}`;
    const next = {
      id,
      sellers: 0,
      captains: 0,
      products: 0,
      orders: 0,
      sales: 0,
      commissionRate: globalSettings.defaultCommissionRate,
      logo: payload.logo || '/LogoSavitri.png',
      status: 'Active',
      config: {
        deliveryRadiusKm: 10,
        cashOnDelivery: true,
        autoApproveSellers: false,
        maxActiveCaptains: 10,
        supportPhone: payload.contact || '',
      },
      ...payload,
      code: String(payload.code || '').trim().toUpperCase(),
    };
    setBrands((prev) => [next, ...prev]);
    pushAudit({ entity: 'Brand', entityId: id, change: `Created brand ${next.name} (demo)` });
    return next;
  };

  const updateBrand = (id, patch) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              code: patch.code ? String(patch.code).trim().toUpperCase() : b.code,
              config: patch.config ? { ...b.config, ...patch.config } : b.config,
            }
          : b
      )
    );
    pushAudit({ entity: 'Brand', entityId: id, change: 'Updated brand (demo)' });
  };

  const toggleBrandStatus = (id) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: b.status === 'Active' ? 'Inactive' : 'Active' } : b
      )
    );
    pushAudit({ entity: 'Brand', entityId: id, change: 'Toggled brand status (demo)' });
  };

  const updateBrandConfig = (id, configPatch) => {
    updateBrand(id, { config: configPatch });
  };

  const isBrandCodeUnique = (code, excludeId = null) => {
    const normalized = String(code || '').trim().toUpperCase();
    return !brands.some((b) => b.code.toUpperCase() === normalized && b.id !== excludeId);
  };

  /* ── Cities ── */
  const createCity = (payload) => {
    const id = `city_${Date.now()}`;
    const zones = payload.zones || payload.serviceAreas || [];
    const brandIds = payload.brandIds || [];
    const next = {
      id,
      state: 'Madhya Pradesh',
      status: 'Active',
      brandsCount: brandIds.length,
      captainsCount: 0,
      deliveryAvailable: true,
      sameDayDelivery: false,
      codAvailable: true,
      ...payload,
      brandIds,
      zones,
      serviceAreas: payload.serviceAreas || zones,
    };
    setCities((prev) => [next, ...prev]);
    pushAudit({ entity: 'City', entityId: id, change: `Created city ${next.name} (demo)` });
    return next;
  };

  const updateCity = (id, patch) => {
    setCities((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    pushAudit({ entity: 'City', entityId: id, change: 'Updated city (demo)' });
  };

  const toggleCityStatus = (id) => {
    setCities((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' } : c
      )
    );
  };

  /* ── Admins ── */
  const createAdmin = (payload) => {
    const id = `adm_${Date.now()}`;
    const next = {
      id,
      status: 'Active',
      lastLogin: null,
      brands: [],
      ...payload,
    };
    setAdmins((prev) => [next, ...prev]);
    pushAudit({ entity: 'Admin', entityId: id, change: `Created admin ${next.name} (demo)` });
    return next;
  };

  const updateAdmin = (id, patch) => {
    setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    pushAudit({ entity: 'Admin', entityId: id, change: 'Updated admin (demo)' });
  };

  const toggleAdminStatus = (id) => {
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a
      )
    );
  };

  /* ── Roles ── */
  const createRole = (payload) => {
    const id = `role_${Date.now()}`;
    const next = { id, permissions: [], isSystem: false, ...payload };
    setRoles((prev) => [next, ...prev]);
    pushAudit({ entity: 'Role', entityId: id, change: `Created role ${next.name} (demo)` });
    return next;
  };

  const updateRole = (id, patch) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.isSystem && patch.permissions) {
          return { ...r, ...patch, permissions: r.permissions };
        }
        return { ...r, ...patch };
      })
    );
    pushAudit({ entity: 'Role', entityId: id, change: 'Updated role (demo)' });
  };

  const deleteRole = (id) => {
    setRoles((prev) => prev.filter((r) => r.id !== id || r.isSystem));
    pushAudit({ entity: 'Role', entityId: id, change: 'Deleted role (demo)' });
  };

  /* ── Settings ── */
  const updateGlobalSettings = (patch) => {
    setGlobalSettings((prev) => ({ ...prev, ...patch }));
    pushAudit({ entity: 'Settings', entityId: 'global', change: 'Updated global settings (demo)' });
  };

  const updateSecuritySettings = (patch) => {
    setSecuritySettings((prev) => ({ ...prev, ...patch }));
    pushAudit({ entity: 'Security', entityId: 'security', change: 'Updated security settings (demo)' });
  };

  /* ── Templates ── */
  const createTemplate = (payload) => {
    const id = `tpl_${Date.now()}`;
    const next = { id, status: 'Draft', channel: 'SMS', subject: '', body: '', ...payload };
    setTemplates((prev) => [next, ...prev]);
    pushAudit({ entity: 'Template', entityId: id, change: `Created template ${next.name} (demo)` });
    return next;
  };

  const updateTemplate = (id, patch) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    pushAudit({ entity: 'Template', entityId: id, change: 'Updated template (demo)' });
  };

  const deleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    pushAudit({ entity: 'Template', entityId: id, change: 'Deleted template (demo)' });
  };

  /* ── Policies ── */
  const updatePolicy = (id, patch) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      )
    );
    pushAudit({ entity: 'Policy', entityId: id, change: 'Updated policy (demo)' });
  };

  const publishPolicy = (id) => {
    updatePolicy(id, { status: 'Published' });
  };

  /* ── Membership ── */
  const updateMembershipPlan = (id, patch) => {
    setMembershipPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    pushAudit({ entity: 'Membership', entityId: id, change: 'Updated membership plan (demo)' });
  };

  /* ── Payouts ── */
  const transitionPayout = (id, nextStatus) => {
    setPayouts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const allowed = PAYOUT_TRANSITIONS[p.status] || [];
        if (!allowed.includes(nextStatus)) return p;
        return { ...p, status: nextStatus, updatedAt: new Date().toISOString() };
      })
    );
    pushAudit({
      entity: 'Payout',
      entityId: id,
      change: `Status → ${nextStatus} (demo)`,
    });
  };

  const getPayoutTransitions = (status) => PAYOUT_TRANSITIONS[status] || [];

  const summary = useMemo(() => {
    const active = brands.filter((b) => b.status === 'Active');
    return {
      totalBrands: brands.length,
      activeBrands: active.length,
      totalCities: cities.length,
      activeCities: cities.filter((c) => c.status === 'Active').length,
      totalAdmins: admins.length,
      activeAdmins: admins.filter((a) => a.status === 'Active').length,
      totalSellers: brands.reduce((s, b) => s + (b.sellers || 0), 0),
      totalCaptains: brands.reduce((s, b) => s + (b.captains || 0), 0),
      totalOrders: brands.reduce((s, b) => s + (b.orders || 0), 0),
      combinedSales: brands.reduce((s, b) => s + (b.sales || 0), 0),
      pendingPayouts: payouts.filter((p) => p.status === 'Pending' || p.status === 'Approved').length,
      pendingPayoutAmount: payouts
        .filter((p) => ['Pending', 'Approved', 'Processing'].includes(p.status))
        .reduce((s, p) => s + p.amount, 0),
    };
  }, [brands, cities, admins, payouts]);

  const value = {
    brands,
    cities,
    admins,
    roles,
    activityLogs,
    auditLogs,
    commissions,
    payouts,
    reconciliation,
    membershipPlans,
    templates,
    policies,
    globalSettings,
    securitySettings,
    notifications,
    allPermissions: ALL_PERMISSIONS,
    analyticsSeries: ANALYTICS_SERIES,
    recentActivity: RECENT_ACTIVITY,
    financeSummary: FINANCE_SUMMARY,
    summary,
    demoEntered,
    setDemoEntered,
    sidebarCollapsed,
    setSidebarCollapsed,
    createBrand,
    updateBrand,
    toggleBrandStatus,
    updateBrandConfig,
    isBrandCodeUnique,
    createCity,
    updateCity,
    toggleCityStatus,
    createAdmin,
    updateAdmin,
    toggleAdminStatus,
    createRole,
    updateRole,
    deleteRole,
    updateGlobalSettings,
    updateSecuritySettings,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    updatePolicy,
    publishPolicy,
    updateMembershipPlan,
    transitionPayout,
    getPayoutTransitions,
  };

  return (
    <MyWillBookSuperAdminContext.Provider value={value}>
      {children}
    </MyWillBookSuperAdminContext.Provider>
  );
};

/** Returns context value, or null when used outside the provider (pages fall back to local mock). */
export const useMyWillBookSuperAdmin = () => useContext(MyWillBookSuperAdminContext);
