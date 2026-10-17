import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BrandSuperAdminProvider } from '../context/BrandSuperAdminContext';
import { BrandSuperAdminLayout } from '../layouts/BrandSuperAdminLayout';
import PageSkeleton from '../../../components/PageSkeleton';

const DemoEntry = lazy(() => import('../pages/DemoEntry'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const BrandManagement = lazy(() => import('../pages/BrandManagement'));
const BrandForm = lazy(() => import('../pages/BrandForm'));
const BrandOverview = lazy(() => import('../pages/BrandOverview'));
const AdminManagement = lazy(() => import('../pages/AdminManagement'));
const FinancialOverview = lazy(() => import('../pages/FinancialOverview'));
const Reports = lazy(() => import('../pages/Reports'));
const Settings = lazy(() => import('../pages/Settings'));

/**
 * Isolated Brand Super Admin frontend routes.
 * Does not use production auth — demo entry is labelled as preview only.
 */
const BrandSuperAdminRoutes = () => (
  <BrandSuperAdminProvider>
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route index element={<DemoEntry />} />
        <Route element={<BrandSuperAdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="brands" element={<BrandManagement />} />
          <Route path="brands/new" element={<BrandForm />} />
          <Route path="brands/:brandId" element={<BrandOverview />} />
          <Route path="brands/:brandId/edit" element={<BrandForm />} />
          <Route path="admins" element={<AdminManagement />} />
          <Route path="finance" element={<FinancialOverview />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/brand-super-admin" replace />} />
      </Routes>
    </Suspense>
  </BrandSuperAdminProvider>
);

export default BrandSuperAdminRoutes;
