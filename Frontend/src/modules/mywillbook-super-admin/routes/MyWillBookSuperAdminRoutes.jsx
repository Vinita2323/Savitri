import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MyWillBookSuperAdminProvider } from '../context/MyWillBookSuperAdminContext';
import { MWBLayout } from '../layouts/MWBLayout';
import PageSkeleton from '../../../components/PageSkeleton';

const DemoEntry = lazy(() => import('../pages/DemoEntry'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const PlatformAnalytics = lazy(() => import('../pages/PlatformAnalytics'));
const BrandManagement = lazy(() => import('../pages/BrandManagement'));
const CityServiceAreas = lazy(() => import('../pages/Cities'));
const BrandConfiguration = lazy(() => import('../pages/BrandConfiguration'));
const AdminManagement = lazy(() => import('../pages/AdminManagement'));
const StaffRoles = lazy(() => import('../pages/StaffRoles'));
const ActivityLogs = lazy(() => import('../pages/ActivityLogs'));
const FinancialOverview = lazy(() => import('../pages/FinancialOverview'));
const CommissionReports = lazy(() => import('../pages/CommissionReports'));
const PayoutOverview = lazy(() => import('../pages/PayoutOverview'));
const PaymentReconciliation = lazy(() => import('../pages/PaymentReconciliation'));
const GlobalSettings = lazy(() => import('../pages/GlobalSettings'));
const MembershipRules = lazy(() => import('../pages/MembershipRules'));
const NotificationsTemplates = lazy(() => import('../pages/NotificationsTemplates'));
const TermsPolicies = lazy(() => import('../pages/TermsPolicies'));
const AuditLogs = lazy(() => import('../pages/AuditLogs'));
const SecuritySettings = lazy(() => import('../pages/SecuritySettings'));

/**
 * Isolated MyWillBook Super Admin frontend routes.
 * Demo-only — no production auth or API calls.
 */
const MyWillBookSuperAdminRoutes = () => (
  <MyWillBookSuperAdminProvider>
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route index element={<DemoEntry />} />
        <Route element={<MWBLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<PlatformAnalytics />} />
          <Route path="brands" element={<BrandManagement />} />
          <Route path="cities" element={<CityServiceAreas />} />
          <Route path="brand-configuration" element={<BrandConfiguration />} />
          <Route path="admins" element={<AdminManagement />} />
          <Route path="roles" element={<StaffRoles />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="finance" element={<FinancialOverview />} />
          <Route path="commissions" element={<CommissionReports />} />
          <Route path="payouts" element={<PayoutOverview />} />
          <Route path="reconciliation" element={<PaymentReconciliation />} />
          <Route path="settings" element={<GlobalSettings />} />
          <Route path="membership" element={<MembershipRules />} />
          <Route path="notifications" element={<NotificationsTemplates />} />
          <Route path="policies" element={<TermsPolicies />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="security" element={<SecuritySettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/mywillbook-super-admin" replace />} />
      </Routes>
    </Suspense>
  </MyWillBookSuperAdminProvider>
);

export default MyWillBookSuperAdminRoutes;
