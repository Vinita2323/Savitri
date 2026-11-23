import React from 'react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import adminPurchaseService from '../../../services/adminPurchaseService';
import { History } from '../../admin/purchases/PurchaseViews';

/** Super Admin: every Admin's own-store purchases (read only). Seller purchases stay on the Seller Purchases page, so nothing is counted twice. */
export const SuperAdminAdminPurchases = () => (
  <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
    <SuperAdminHeader
      title="Admin Purchases"
      subtitle="Stock bought by admins for their own stores. Seller purchases are on the Seller Purchases page."
      titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl"
      subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500"
    />
    <div className="w-full flex-1 p-4 sm:p-6" data-testid="sa-admin-purchases">
      <History listFn={adminPurchaseService.allAdminPurchases} detailFetcher={adminPurchaseService.adminPurchaseDetail} showAdmin readOnlyDetail invoiceLoaderFor={(id, dl) => adminPurchaseService.invoiceBlob(id, dl)} />
    </div>
  </div>
);

export default SuperAdminAdminPurchases;
