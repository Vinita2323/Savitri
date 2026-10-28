
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

// Proforma Invoice Module Pages
import { ProformaInvoiceProvider } from '../../admin/proforma-invoices/context/ProformaInvoiceContext';
const ProformaInvoiceList = lazy(() => import('../../admin/proforma-invoices/pages/ProformaInvoiceList').then(m => ({ default: m.ProformaInvoiceList })));
const CreateProformaInvoice = lazy(() => import('../../admin/proforma-invoices/pages/CreateProformaInvoice').then(m => ({ default: m.CreateProformaInvoice })));
const ProformaInvoiceDetails = lazy(() => import('../../admin/proforma-invoices/pages/ProformaInvoiceDetails').then(m => ({ default: m.ProformaInvoiceDetails })));
const EditProformaInvoice = lazy(() => import('../../admin/proforma-invoices/pages/EditProformaInvoice').then(m => ({ default: m.EditProformaInvoice })));
const ProformaInvoicePdfPreview = lazy(() => import('../../admin/proforma-invoices/pages/ProformaInvoicePdfPreview').then(m => ({ default: m.ProformaInvoicePdfPreview })));
const CashBankPage = lazy(() => import('../../admin/cash-bank/pages/CashBankPage').then(m => ({ default: m.CashBankPage })));
const PosBillingPage = lazy(() => import('../../admin/pos-billing/pages/PosBillingPage').then(m => ({ default: m.PosBillingPage })));
const PosHistoryPage = lazy(() => import('../../admin/pos-billing/pages/PosHistoryPage').then(m => ({ default: m.PosHistoryPage })));

// Employee Attendance & Task Management Module Pages
import { EmployeeProvider } from '../../admin/employees/context/EmployeeContext';
const EmployeeDashboardPage = lazy(() => import('../../admin/employees/pages/EmployeeDashboardPage'));
const EmployeeDirectoryPage = lazy(() => import('../../admin/employees/pages/EmployeeDirectoryPage'));
const EmployeeAttendancePage = lazy(() => import('../../admin/employees/pages/EmployeeAttendancePage'));
const EmployeeTasksPage = lazy(() => import('../../admin/employees/pages/EmployeeTasksPage'));
const EmployeeLeavesPage = lazy(() => import('../../admin/employees/pages/EmployeeLeavesPage'));
const EmployeeShiftsHolidaysPage = lazy(() => import('../../admin/employees/pages/EmployeeShiftsHolidaysPage'));
const EmployeeReportsPage = lazy(() => import('../../admin/employees/pages/EmployeeReportsPage'));

const SuperAdminEmployeeWrapper = ({ Component, currentTab }) => {
  const navigate = useNavigate();
  return (
    <EmployeeProvider>
      <Component
        currentTab={currentTab}
        onNavigate={(tab, data) => {
          const cleanTab = tab ? tab.replace(/^\//, '') : 'employees';
          if (cleanTab === 'dashboard') {
            navigate('/super-admin/employees', { state: data });
          } else {
            navigate(`/super-admin/employees/${cleanTab}`, { state: data });
          }
        }}
      />
    </EmployeeProvider>
  );
};

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

const SuperAdminProformaInvoiceWrapper = ({ Component }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <QuotationProvider>
      <ProformaInvoiceProvider>
        <Component
          onNavigate={(tab, data) => {
            const cleanTab = tab
              ? tab.replace(/^proforma_invoices/, 'proforma-invoices').replace(/^\//, '')
              : 'proforma-invoices';
            navigate(`/super-admin/${cleanTab}`, { state: data });
          }}
          proformaData={location.state}
        />
      </ProformaInvoiceProvider>
    </QuotationProvider>
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
          <Route path="/cash-bank" element={<CashBankPage />} />
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

          {/* Proforma Invoice Management Module Routes */}
          <Route path="/proforma-invoices" element={<SuperAdminProformaInvoiceWrapper Component={ProformaInvoiceList} />} />
          <Route path="/proforma-invoices/create" element={<SuperAdminProformaInvoiceWrapper Component={CreateProformaInvoice} />} />
          <Route path="/proforma-invoices/details" element={<SuperAdminProformaInvoiceWrapper Component={ProformaInvoiceDetails} />} />
          <Route path="/proforma-invoices/edit" element={<SuperAdminProformaInvoiceWrapper Component={EditProformaInvoice} />} />
          <Route path="/proforma-invoices/preview" element={<SuperAdminProformaInvoiceWrapper Component={ProformaInvoicePdfPreview} />} />

          {/* POS Billing Module Routes */}
          <Route path="/pos-billing" element={<PosBillingPage />} />
          <Route path="/pos-billing/history" element={<PosHistoryPage />} />

          {/* Employee Attendance and Task Management Routes */}
          <Route path="/employees" element={<SuperAdminEmployeeWrapper Component={EmployeeDashboardPage} currentTab="dashboard" />} />
          <Route path="/employees/dashboard" element={<SuperAdminEmployeeWrapper Component={EmployeeDashboardPage} currentTab="dashboard" />} />
          <Route path="/employees/directory" element={<SuperAdminEmployeeWrapper Component={EmployeeDirectoryPage} currentTab="directory" />} />
          <Route path="/employees/attendance" element={<SuperAdminEmployeeWrapper Component={EmployeeAttendancePage} currentTab="attendance" />} />
          <Route path="/employees/tasks" element={<SuperAdminEmployeeWrapper Component={EmployeeTasksPage} currentTab="tasks" />} />
          <Route path="/employees/leaves" element={<SuperAdminEmployeeWrapper Component={EmployeeLeavesPage} currentTab="leaves" />} />
          <Route path="/employees/shifts" element={<SuperAdminEmployeeWrapper Component={EmployeeShiftsHolidaysPage} currentTab="shifts" />} />
          <Route path="/employees/reports" element={<SuperAdminEmployeeWrapper Component={EmployeeReportsPage} currentTab="reports" />} />

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
