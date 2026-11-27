/**
 * What the signed-in Admin may see in the brand shown now (Admin panel only). It only decides what the screen offers:
 * the server checks the same permission again on every request.
 *
 * `enforced` is false for admins without per-brand permissions (and outside the Admin panel): everything stays as before.
 */
const OPEN = Object.freeze({ enforced: false, configured: true, permissions: {} });
let state = OPEN;

export const setAdminPermissions = (next) => { state = next || OPEN; };
export const resetAdminPermissions = () => { state = OPEN; };
export const adminPermissionsEnforced = () => state.enforced;

/** adminCan('orders.edit') */
export const adminCan = (need) => {
  if (!state.enforced) return true;
  const [module, action] = need.split('.');
  return Boolean(state.permissions?.[module]?.includes(action));
};
export const adminCanAny = (needs) => !state.enforced || needs.length === 0 || needs.some(adminCan);

const each = (tabs, needs) => Object.fromEntries(tabs.split(' ').map((t) => [t, needs]));
// tab (hyphens written as underscores) -> any one of these permissions opens it. [] = always open (the admin's own pages).
const TABS = {
  ...each('profile brands', []),
  ...each('dashboard location', ['dashboard.view']),
  ...each('referral_dashboard referral_list referral_management referral referrals', ['referrals.view']),
  ...each('referral_settings', ['referrals.view', 'settings.view']),
  ...each('commission_management commissions commission', ['commissions.view']),
  ...each('pricing_charges pricing charges pricing_transport transport_pricing transport_charges pricing_delivery delivery_pricing delivery_charges vehicle_details vehicles vehicle_management manage_vehicles', ['pricing.view', 'transport.view']),
  ...each('captain_registration_fee captain_fee', ['captains.view', 'settings.view']),
  ...each('seller_registration_fee registration_fee seller_fee', ['sellers.view', 'settings.view']),
  ...each('profile_edit_requests profile_requests', ['profile_requests.view']),
  ...each('users customers system_user', ['customers.view']),
  ...each('sellers seller manage_sellers seller_list', ['sellers.view']),
  ...each('captains captain delivery_boy deliveries', ['captains.view']),
  ...each('categories subcategories', ['categories.view']),
  ...each('products bulk_uploads catalog_control sku_audit', ['products.view']),
  ...each('add_product', ['products.create', 'products.edit']),
  ...each('taxes settings payment_list sms_gateway billing_charges', ['settings.view']),
  ...each('orders orders_all orders_pending orders_received orders_processed orders_shipped orders_out_for_delivery orders_delivered orders_cancelled orders_fulfilments', ['orders.view']),
  ...each('orders_return returns return_management', ['returns.view']),
  ...each('transport transport_all vehicle_logistics logistics transport_searching transport_active transport_in_progress transport_completed transport_cancelled', ['transport.view']),
  ...each('wallet fund_transfer seller_transaction financial_dashboard', ['finance.view']),
  ...each('withdrawals payouts payout_seller payout_captain payout_refund_return payout_refund', ['payouts.view', 'finance.view']),
  ...each('payout_captain_settlement captain_settlements captain_settlement cash_settlement cash_settlements cash_collection', ['payouts.view']),
  ...each('coupons promo_dashboard promo_home_section promo_category_products promo_bestseller promo_strip promo_lowest_prices promo_shop_by_store promo_home_banners promo_flash_sale', ['promotions.view']),
  ...each('reports', ['reports.view']),
  ...each('faqs policies policy_management customer_app_policy delivery_app_policy seller_app_policy', ['content.view']),
  ...each('roles staff staff_roles', ['accounts.super_admin_only']),
  ...each('seller_membership_plans captain_membership_plans seller_memberships captain_memberships', ['memberships.view', 'settings.view']),
  ...each('quotations quotations/dashboard quotation_dashboard quotations_dashboard quotation_list quotations_all quotations/requests quotation_requests rfq_requests quotations/accepted accepted_quotations quotations/closed rejected_quotations closed_quotations expired_quotations quotations/details quotation_details', ['quotations.view']),
  ...each('quotations/create quotation_create create_quotation', ['quotations.create', 'quotations.edit']),
  ...each('delivery_challans delivery_challans/list delivery_challans/details delivery_challans_menu', ['challans.view']),
  ...each('delivery_challans/create create_delivery_challan', ['challans.create']),
  ...each('delivery_challans/edit', ['challans.edit']),
  ...each('employee_management employee_dashboard employees employees/dashboard employee_directory employees/directory employee_overview employees/overview employee_registrations employees/registrations employee_activity employees/activity', ['employees.view']),
  ...each('employee_attendance employees/attendance employee_attendance_report employees/attendance_report employee_rules employees/rules employee_selfies employees/selfies employee_shifts employees/shifts', ['attendance.view']),
  ...each('employee_tasks employees/tasks employee_review employees/review', ['tasks.view']),
  ...each('employee_leaves employees/leaves', ['leaves.view']),
  ...each('employee_reports employees/reports', ['reports.view']),
  ...each('employee_payroll employees/payroll', ['payroll.view']),
  ...each('purchase_management purchase_dashboard purchase_history purchase_stock purchase_sellers purchase_by_seller', ['purchases.view']),
  ...each('purchase_new', ['purchases.create']),
};

export const tabNeeds = (tab) => {
  const key = String(tab || 'dashboard').toLowerCase().replace(/-/g, '_');
  if (key.startsWith('documents')) return [];
  return TABS[key] || TABS.dashboard; // an unknown address shows the dashboard
};
export const tabAllowed = (tab) => adminCanAny(tabNeeds(tab));

/** True when a section can be seen but nothing in it can be changed. */
export const tabViewOnly = (tab) => {
  if (!state.enforced) return false;
  const needs = tabNeeds(tab);
  const modules = [...new Set(needs.map((n) => n.split('.')[0]))].filter((m) => state.permissions?.[m]);
  return modules.length > 0 && modules.every((m) => state.permissions[m].every((a) => a === 'view' || a === 'export'))
    && !['dashboard', 'inventory', 'memberships', 'reports'].includes(modules[0]);
};

/**
 * Hides every control marked data-perm="module.action ..." whose permission is missing (all listed ones are needed).
 * A stylesheet covers controls that appear later (drawers, modals) without each screen having to track permissions.
 */
export const hiddenControlsCss = (allActions = []) => {
  if (!state.enforced) return '';
  const missing = allActions.filter((need) => /^[a-z_]+\.[a-z]+$/.test(need) && !adminCan(need));
  // "super.only" marks controls only a Super Admin can use
  return `${['super.only', ...missing].map((need) => `[data-perm~="${need}"]`).join(',')}{display:none!important}`;
};
