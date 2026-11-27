import React from 'react';
import { Lock, Eye } from 'lucide-react';
import { adminPermissionsEnforced, tabAllowed, tabViewOnly } from '../../../utils/adminPermissions';

const SECTIONS = [
  ['dashboard', 'Dashboard'], ['products', 'Products'], ['orders', 'Orders'], ['customers', 'Customers'], ['sellers', 'Sellers'], ['captains', 'Captains'],
  ['purchase_dashboard', 'Purchases'], ['employee_dashboard', 'Employees'], ['employee_attendance', 'Attendance'], ['employee_tasks', 'Tasks'], ['employee_leaves', 'Leaves'],
  ['employee_payroll', 'Salary and payroll'], ['quotations', 'Quotations'], ['delivery_challans', 'Delivery challans'], ['transport', 'Transport'], ['orders_return', 'Returns'],
  ['financial_dashboard', 'Financial dashboard'], ['payout_seller', 'Payouts'], ['commission_management', 'Commissions'], ['seller_memberships', 'Memberships'],
  ['referral_dashboard', 'Referrals'], ['profile_edit_requests', 'Profile edit requests'], ['categories', 'Categories'], ['promo_dashboard', 'Promotions'],
  ['faqs', 'FAQs'], ['pricing_charges', 'Pricing'], ['reports', 'Reports'],
];

/** Shown instead of a page this admin may not open in the selected brand. */
export const NoAccess = ({ onOpen }) => {
  const open = SECTIONS.filter(([tab]) => adminPermissionsEnforced() && tabAllowed(tab));
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3" data-testid="admin-no-access">
      <Lock className="mx-auto text-slate-400" size={30} />
      <h2 className="m-0 text-lg font-extrabold text-slate-900">You do not have access to this section</h2>
      <p className="m-0 text-sm text-slate-600">
        {open.length ? 'It is not part of your permissions for the selected brand. Choose another section, or switch the brand above.' : 'No section is set up for you in the selected brand yet. Please ask your Super Admin, or switch the brand above.'}
      </p>
      {open.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {open.map(([tab, label]) => (
            <button key={tab} type="button" onClick={() => onOpen(tab)} className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer">{label}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ViewOnlyNote = ({ tab }) => (tabViewOnly(tab) ? (
  <p className="m-0 mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900" data-testid="admin-view-only">
    <Eye size={14} /> View only: you can look at this section for the selected brand, but not change it.
  </p>
) : null);
