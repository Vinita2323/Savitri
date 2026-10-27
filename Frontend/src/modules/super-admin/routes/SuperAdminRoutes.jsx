
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { SuperAdminProvider, useSuperAdmin } from '../context/SuperAdminContext';
import { SuperAdminLayout } from '../layouts/SuperAdminLayout';
import PageSkeleton from '../../../components/PageSkeleton';

// Lazy-loaded Super Admin Pages
const SuperAdminLogin = lazy(() => import('../pages/SuperAdminLogin').then(m => ({ default: m.SuperAdminLogin })));
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const SuperAdminTransactions = lazy(() => import('../pages/SuperAdminTransactions').then(m => ({ default: m.SuperAdminTransactions })));
const SuperAdminPayments = lazy(() => import('../pages/SuperAdminPayments').then(m => ({ default: m.SuperAdminPayments })));
const SuperAdminSellerSettlements = lazy(() => import('../pages/SuperAdminSellerSettlements').then(m => ({ default: m.SuperAdminSellerSettlements })));
const SuperAdminSellerPayoutData = lazy(() => import('../pages/SuperAdminSellerPayoutData'));
const SuperAdminCaptainPayoutData = lazy(() => import('../pages/SuperAdminCaptainPayoutData'));
const SuperAdminRefunds = lazy(() => import('../pages/SuperAdminRefunds').then(m => ({ default: m.SuperAdminRefunds })));
const SuperAdminCommissions = lazy(() => import('../pages/SuperAdminCommissions').then(m => ({ default: m.SuperAdminCommissions })));
const SuperAdminReports = lazy(() => import('../pages/SuperAdminReports').then(m => ({ default: m.SuperAdminReports })));
const BrandSellerPayouts = lazy(() => import('../pages/BrandSellerPayouts'));
const BrandSellerDetail = lazy(() => import('../pages/BrandSellerDetail'));
const BrandCustomerPayments = lazy(() => import('../pages/BrandCustomerPayments'));
const CustomerPurchaseHistory = lazy(() => import('../pages/CustomerPurchaseHistory'));
const SuperAdminInventory = lazy(() => import('../pages/SuperAdminInventory'));
const SuperAdminStores = lazy(() => import('../pages/SuperAdminStores'));
const SuperAdminDeliveryPartners = lazy(() => import('../pages/SuperAdminDeliveryPartners'));

// Quotation Management Module Pages
import { QuotationProvider } from '../../admin/quotations/context/QuotationContext';
const QuotationDashboard = lazy(() => import('../../admin/quotations/pages/QuotationDashboard').then(m => ({ default: m.QuotationDashboard })));
const QuotationList = lazy(() => import('../../admin/quotations/pages/QuotationList').then(m => ({ default: m.QuotationList })));
const CreateQuotation = lazy(() => import('../../admin/quotations/pages/CreateQuotation').then(m => ({ default: m.CreateQuotation })));
const QuotationRequests = lazy(() => import('../../admin/quotations/pages/QuotationRequests').then(m => ({ default: m.QuotationRequests })));
const AcceptedQuotations = lazy(() => import('../../admin/quotations/pages/AcceptedQuotations').then(m => ({ default: m.AcceptedQuotations })));
const ClosedQuotations = lazy(() => import('../../admin/quotations/pages/ClosedQuotations').then(m => ({ default: m.ClosedQuotations })));
const QuotationDetails = lazy(() => import('../../admin/quotations/pages/QuotationDetails').then(m => ({ default: m.QuotationDetails })));

// Delivery Challan Module Pages
import { DeliveryChallanProvider } from '../../admin/delivery-challans/context/DeliveryChallanContext';
const DeliveryChallanList = lazy(() => import('../../admin/delivery-challans/pages/DeliveryChallanList').then(m => ({ default: m.DeliveryChallanList })));
const CreateDeliveryChallan = lazy(() => import('../../admin/delivery-challans/pages/CreateDeliveryChallan').then(m => ({ default: m.CreateDeliveryChallan })));
const DeliveryChallanDetails = lazy(() => import('../../admin/delivery-challans/pages/DeliveryChallanDetails').then(m => ({ default: m.DeliveryChallanDetails })));
const EditDeliveryChallan = lazy(() => import('../../admin/delivery-challans/pages/EditDeliveryChallan').then(m => ({ default: m.EditDeliveryChallan })));

const SuperAdminQuotationWrapper = ({ Component }) => {
  const navigate = useNavigate();
  return (
    <QuotationProvider>
      <Component
        onNavigate={(tab, data) => {
          const cleanTab = tab ? tab.replace(/^\//, '') : 'quotations';
          navigate(`/super-admin/${cleanTab}`, { state: data });
        }}
      />
    </QuotationProvider>
  );
};

const SuperAdminDeliveryChallanWrapper = ({ Component }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <DeliveryChallanProvider>
      <Component
        onNavigate={(tab, data) => {
          const cleanTab = tab ? tab.replace(/^delivery_challans/, 'delivery-challans') : 'delivery-challans';
          navigate(`/super-admin/${cleanTab}`, { state: data });
        }}
        challanData={location.state}
      />
    </DeliveryChallanProvider>
  );
};

// Protected Route Component for Super Admin — cookie session must be validated
const SuperAdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, sessionChecking } = useSuperAdmin();
  if (sessionChecking) {
    return <PageSkeleton />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }
  return children;
};

const SuperAdminRoutesContent = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<SuperAdminLogin />} />

        {/* Protected Routes */}
        <Route
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminLayout />
            </SuperAdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/transactions" element={<SuperAdminTransactions />} />
          <Route path="/brands/:brandSlug/seller-payouts" element={<BrandSellerPayouts />} />
          <Route path="/brands/:brandSlug/seller-payouts/:sellerId" element={<BrandSellerDetail />} />
          <Route path="/payments" element={<SuperAdminPayments />} />
          <Route path="/payments/brands/:brandSlug" element={<BrandCustomerPayments />} />
          <Route path="/payments/brands/:brandSlug/customers/:customerId" element={<CustomerPurchaseHistory />} />
          <Route path="/seller-settlements" element={<SuperAdminSellerSettlements />} />
          <Route path="/stores" element={<SuperAdminStores />} />
          <Route path="/brands/:brandSlug/stores" element={<SuperAdminStores />} />
          <Route path="/inventory" element={<SuperAdminInventory />} />
          <Route path="/delivery-partners" element={<SuperAdminDeliveryPartners />} />
          
          {/* Quotation Management Module Routes */}
          <Route path="/quotations" element={<SuperAdminQuotationWrapper Component={QuotationList} />} />
          <Route path="/quotations/dashboard" element={<SuperAdminQuotationWrapper Component={QuotationDashboard} />} />
          <Route path="/quotations/create" element={<SuperAdminQuotationWrapper Component={CreateQuotation} />} />
          <Route path="/quotations/requests" element={<SuperAdminQuotationWrapper Component={QuotationRequests} />} />
          <Route path="/quotations/accepted" element={<SuperAdminQuotationWrapper Component={AcceptedQuotations} />} />
          <Route path="/quotations/closed" element={<SuperAdminQuotationWrapper Component={ClosedQuotations} />} />
          <Route path="/quotations/details" element={<SuperAdminQuotationWrapper Component={QuotationDetails} />} />

          {/* Delivery Challan Management Module Routes */}
          <Route path="/delivery-challans" element={<SuperAdminDeliveryChallanWrapper Component={DeliveryChallanList} />} />
          <Route path="/delivery-challans/create" element={<SuperAdminDeliveryChallanWrapper Component={CreateDeliveryChallan} />} />
          <Route path="/delivery-challans/details" element={<SuperAdminDeliveryChallanWrapper Component={DeliveryChallanDetails} />} />
          <Route path="/delivery-challans/edit" element={<SuperAdminDeliveryChallanWrapper Component={EditDeliveryChallan} />} />

          <Route path="/captain-settlements" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/payouts" element={<Navigate to="/super-admin/payouts/sellers" replace />} />
          <Route path="/payouts/sellers" element={<SuperAdminSellerPayoutData />} />
          <Route path="/payouts/captains" element={<SuperAdminCaptainPayoutData />} />
          <Route path="/refunds" element={<SuperAdminRefunds />} />
          <Route path="/commissions" element={<SuperAdminCommissions />} />
          <Route path="/financial-adjustments" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="/reports" element={<SuperAdminReports />} />
          <Route path="/audit-logs" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

const SuperAdminRoutes = () => {
  return (
    <SuperAdminProvider>
      <SuperAdminRoutesContent />
    </SuperAdminProvider>
  );
};

export default SuperAdminRoutes;
