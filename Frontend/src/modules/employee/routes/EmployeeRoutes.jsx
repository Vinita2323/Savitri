import React, { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { EmployeeAuthProvider, useEmployeeAuth } from '../context/EmployeeAuthContext';
import EmployeeLayout from '../layouts/EmployeeLayout';
import { Spinner } from '../components/ui';

const EmployeeLogin = lazy(() => import('../pages/EmployeeLogin'));
const EmployeeRegister = lazy(() => import('../pages/EmployeeRegister'));
const PortalDashboard = lazy(() => import('../pages/PortalDashboard'));
const PortalAttendance = lazy(() => import('../pages/PortalAttendance'));
const PortalTasks = lazy(() => import('../pages/PortalTasks'));
const PortalTaskDetail = lazy(() => import('../pages/PortalTaskDetail'));
const PortalLeaves = lazy(() => import('../pages/PortalLeaves'));
const PortalHolidays = lazy(() => import('../pages/PortalHolidays'));
const PortalNotifications = lazy(() => import('../pages/PortalNotifications'));
const PortalProfile = lazy(() => import('../pages/PortalProfile'));
const PortalSelfie = lazy(() => import('../pages/PortalSelfie'));

/** Employee-only guard: an unauthenticated visitor is sent to the employee login. Other roles' tokens are never used here. */
const EmployeeProtected = () => {
  const { isAuthenticated, checking } = useEmployeeAuth();
  const location = useLocation();
  if (checking) return <Spinner label="Checking your session…" />;
  if (!isAuthenticated) {
    sessionStorage.setItem('savitri_employee_auth_expired_redirect', location.pathname);
    return <Navigate to="/employee/login" replace />;
  }
  return <Outlet />;
};

export default function EmployeeRoutes() {
  return (
    <EmployeeAuthProvider>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="login" element={<EmployeeLogin />} />
          <Route path="register" element={<EmployeeRegister />} />
          <Route element={<EmployeeProtected />}>
            <Route element={<EmployeeLayout />}>
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="attendance" element={<PortalAttendance />} />
              <Route path="tasks" element={<PortalTasks />} />
              <Route path="tasks/:id" element={<PortalTaskDetail />} />
              <Route path="leaves" element={<PortalLeaves />} />
              <Route path="holidays" element={<PortalHolidays />} />
              <Route path="notifications" element={<PortalNotifications />} />
              <Route path="profile" element={<PortalProfile />} />
              <Route path="selfie" element={<PortalSelfie />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
        </Routes>
      </Suspense>
    </EmployeeAuthProvider>
  );
}
