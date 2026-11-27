/**
 * Which permission each API call needs from an admin with per-brand permissions. DENY BY DEFAULT: a call that matches no
 * rule is refused, so a new endpoint is closed to these admins until it is listed here.
 *
 * A rule's need is: SELF (the admin's own account, always allowed), an array (ANY one of them is enough),
 * { all: [...] } (every one is needed), or a function of the request returning one of those.
 */
export const SELF = 'SELF';

const word = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const ID = '[^/]+';

/** Approve / reject chosen by a field in the body. A value that is neither (or unreadable) needs both. */
const decide = (mod, read, yes, no, other) => (req) => {
  const value = word(read(req.body || {}));
  if (yes.includes(value)) return [`${mod}.approve`];
  if (no.includes(value)) return [`${mod}.reject`];
  if (other?.includes(value)) return [`${mod}.edit`];
  return { all: [`${mod}.approve`, `${mod}.reject`] };
};

const partnerStatus = (mod) => decide(mod, (b) => b.accountStatus || b.status, ['approved'], ['rejected', 'suspended'], ['under_review', 'pending', 'pending_otp']);
const quotationStatus = (req) => {
  const s = word(req.body?.status);
  if (['accepted', 'converted to order'].includes(s)) return ['quotations.approve'];
  if (s === 'rejected') return ['quotations.reject'];
  return ['quotations.edit'];
};
/** Same test as returnController.verifyReturnedProduct: passing releases the refund. */
const verification = (req) => {
  const b = req.body || {};
  const passed = b.verificationPassed === true || b.verificationPassed === 'true' || b.outcome === 'PASSED' || b.outcome === true || b.action === 'APPROVE' || b.action === 'PASS';
  return [passed ? 'returns.approve' : 'returns.reject'];
};
const CAPTAIN_PICKERS = ['captains.view', 'orders.edit', 'returns.edit', 'transport.edit'];

const R = [];
/** path is the API path after /api, lower case, without a trailing slash. ":" stands for one path segment. */
const rule = (methods, path, need) => R.push({ methods: methods === '*' ? null : methods.split(' '), re: new RegExp(`^${path.replace(/:/g, ID)}$`), need });
/** the usual set for a collection: GET view, POST create, PUT/PATCH edit, DELETE delete */
const crud = (base, mod, { view = [`${mod}.view`] } = {}) => {
  rule('GET', `${base}(/.*)?`, view);
  rule('POST', base, [`${mod}.create`]);
  rule('PUT PATCH', `${base}/.+`, [`${mod}.edit`]);
  rule('DELETE', `${base}/:`, [`${mod}.delete`]);
};

// ── the admin's own account ──
rule('*', '/auth/.*', SELF);
rule('GET PUT', '/admin/profile', SELF);
rule('GET', '/admin/my-brands', SELF);
rule('*', '/admin/documents(/.*)?', SELF);
rule('GET', '/super-admin/brands(/:)?', SELF); // the brand names every screen needs; the controller lists only assigned brands
rule('*', '/fcm-tokens(/.*)?', SELF);
rule('GET', '/profile-edit-requests/my-pending', SELF);
rule('POST', '/profile-edit-requests/submit', SELF);

// ── dashboard, customers, sellers, captains ──
rule('GET', '/admin/dashboard/stats', ['dashboard.view']);
rule('GET', '/admin/users(/:/orders)?', ['customers.view']);
rule('PUT', '/admin/users/:/(block|status)', ['customers.edit']);

rule('GET', '/admin/sellers', ['sellers.view']);
rule('PUT', '/admin/sellers/:/status', partnerStatus('sellers'));
rule('PUT', '/admin/sellers/:/details', ['sellers.edit']);
rule('DELETE', '/(admin/)?sellers/:', ['sellers.delete']);
rule('PUT', '/(admin|super-admin)/sellers/:/commission', ['commissions.manage']);
rule('POST', '/(admin|super-admin)/sellers/:/commission/reset', ['commissions.manage']);
rule('GET', '/(admin|super-admin)/sellers/:/commission/history', ['commissions.view', 'sellers.view']);
rule('GET', '/shipping/admin/sellers/:/pickup-address', ['sellers.view', 'products.view']);

rule('GET', '/admin/captains(/available)?', CAPTAIN_PICKERS);
rule('PUT', '/admin/captains/:/status', partnerStatus('captains'));
rule('PUT', '/admin/captains/:/details', ['captains.edit']);
rule('DELETE', '/admin/captains/:', ['captains.delete']);
rule('GET', '/super-admin/delivery-partners', ['captains.view']);
rule('GET', '/admin/captain-cash-settlements', ['payouts.view']);
rule('PUT', '/admin/captain-cash-settlements/:', decide('payouts', (b) => b.action, ['approve'], ['reject']));

rule('GET', '/seller-registration-fee/admin/payments(/:)?', ['sellers.view']);
rule('GET', '/captain-registration-fee/admin/payments(/:)?', ['captains.view']);
rule('GET', '/seller-registration-fee/admin', ['sellers.view', 'settings.view']);
rule('GET', '/captain-registration-fee/admin', ['captains.view', 'settings.view']);
rule('PUT', '/(seller|captain)-registration-fee/admin', ['settings.manage']);

rule('GET', '/profile-edit-requests/admin(/:)?', ['profile_requests.view']);
rule('PUT', '/profile-edit-requests/admin/:/approve', ['profile_requests.approve']);
rule('PUT', '/profile-edit-requests/admin/:/reject', ['profile_requests.reject']);

// ── orders, returns, fulfilment, courier ──
rule('GET', '/admin/orders', ['orders.view']);
rule('PUT', '/admin/orders/:/(status|assign-captain)', ['orders.edit']);
rule('PUT', '/admin/orders/:/return-status', (req) => (/reject|declin|cancel/.test(word(req.body?.returnStatus)) ? ['returns.reject'] : ['returns.approve']));
rule('GET', '/fulfillment/(admin/orders|order/:)', ['orders.view']);
rule('GET', '/courier/(status|fulfillment/:(/label)?)', ['orders.view']);
rule('POST', '/courier/serviceability', ['orders.view']);
rule('POST', '/courier/fulfillment/:/(package|quote|shipment|pickup|simulate)', ['orders.edit']);

rule('GET', '/returns/(admin/all|:)', ['returns.view']);
rule('PUT', '/returns/admin/:/approve', decide('returns', (b) => b.action, ['approve'], ['reject']));
rule('PUT', '/returns/admin/:/assign-captain', ['returns.edit']);
rule('PUT', '/returns/admin/:/verify', verification);

// ── products and stock (GET /products is public: it is checked by staffViewGate with this same table) ──
rule('GET', '/products(/:)?', ['products.view', 'sellers.view', 'promotions.view']);
rule('POST', '/products', ['products.create']);
rule('PUT', '/products/:', ['products.edit']);
rule('DELETE', '/products/:', ['products.delete']);
rule('PATCH', '/products/:/moderation', ['products.manage']);
rule('GET', '/bulk-products/admin/.+', ['products.view']);
rule('GET', '/super-admin/inventory', ['inventory.view']);
rule('GET', '/super-admin/stores(/:)?', ['sellers.view']);

// ── purchases ──
rule('GET', '/admin-purchases(/.*)?', ['purchases.view']);
rule('POST', '/admin-purchases(/products|/invoice)?', ['purchases.create']);
rule('PUT', '/admin-purchases/:/cancel', ['purchases.edit']);

// ── POS ──
rule('GET', '/pos/.+', ['pos.view']);
rule('POST', '/pos/calculate', ['pos.view']);
rule('POST', '/pos/(customers|counter-sale|delivery-order|hold)', ['pos.create']);
rule('DELETE', '/pos/hold/:', ['pos.delete']);

// ── delivery challans ──
rule('GET', '/delivery-challans(/.*)?', ['challans.view']);
rule('POST', '/delivery-challans', ['challans.create']);
rule('PUT', '/delivery-challans/:', ['challans.edit']);
rule('POST', '/delivery-challans/:/finalize', ['challans.approve']);
rule('POST', '/delivery-challans/:/(status|cancel)', ['challans.edit']);

// ── quotations ──
rule('GET', '/quotations(/.*)?', ['quotations.view']);
rule('POST', '/quotations', ['quotations.create']);
rule('POST', '/quotations/requests', ['quotations.create']);
rule('POST', '/quotations/send-email', ['quotations.edit']);
rule('PATCH', '/quotations/requests/:/status', ['quotations.edit']);
rule('POST', '/quotations/requests/:/reject', ['quotations.reject']);
rule('PUT', '/quotations/:', ['quotations.edit']);
rule('DELETE', '/quotations/:', ['quotations.delete']);
rule('PATCH', '/quotations/:/status', quotationStatus);
rule('POST', '/quotations/:/(ready|cancel)', ['quotations.edit']);
rule('POST', '/quotations/:/convert', ['quotations.approve']);
rule('POST', '/quotations/:/duplicate', ['quotations.create']);

// ── proforma invoices ──
rule('GET', '/proforma-invoices(/.*)?', ['proforma.view']);
rule('POST', '/proforma-invoices', ['proforma.create']);
rule('PUT', '/proforma-invoices/:', ['proforma.edit']);
rule('POST', '/proforma-invoices/:/(send-email|record-confirmation|cancel)', ['proforma.edit']);
rule('POST', '/proforma-invoices/:/(record-payment|convert-to-invoice)', ['proforma.manage']);
rule('POST', '/proforma-invoices/:/duplicate', ['proforma.create']);

// ── transport ──
rule('GET', '/transport/bookings(/.*)?', ['transport.view']);
rule('PUT', '/transport/bookings/admin/:/assign-captain', ['transport.edit']);
rule('PUT', '/transport/bookings/(admin/)?:/cancel', ['transport.delete']);

// ── employees ──
rule('GET', '/employees/dashboard-summary', ['employees.view']);
rule('GET', '/employees/attendance/records', ['attendance.view']);
rule('POST', '/employees/attendance/(check-in|check-out)', ['attendance.create']);
rule('POST', '/employees/attendance/manual', ['attendance.edit']);
rule('PATCH', '/employees/attendance/:/correction', ['attendance.edit']);
rule('GET', '/employees/tasks/all', ['tasks.view']);
rule('POST', '/employees/tasks(/bulk)?', ['tasks.create']);
rule('PATCH', '/employees/tasks/:/status', (req) => (word(req.body?.status) === 'completed' ? ['tasks.approve'] : ['tasks.edit']));
rule('PUT', '/employees/tasks/:', ['tasks.edit']);
rule('POST', '/employees/tasks/:/comments', ['tasks.edit']);
rule('GET', '/employees/leaves/all', ['leaves.view']);
rule('POST', '/employees/leaves', ['leaves.create']);
rule('PATCH', '/employees/leaves/:/review', decide('leaves', (b) => b.status, ['approved'], ['rejected']));
rule('GET', '/employees/(shifts|holidays)', ['attendance.view', 'employees.view']);
rule('POST', '/employees/(shifts|holidays)', ['attendance.edit']);
// the staff list is the picker on the attendance, task and leave screens
rule('GET', '/employees', ['employees.view', 'attendance.view', 'tasks.view', 'leaves.view', 'payroll.view']);
rule('GET', '/employees/:', ['employees.view']);
rule('POST', '/employees', ['employees.create']);
rule('PUT', '/employees/:', ['employees.edit']);
rule('PATCH', '/employees/:/status', ['employees.edit']);

rule('GET', '/employee-management/overview', ['employees.view']);
rule('GET', '/employee-management/selfies/.+', ['attendance.view']);
rule('POST', '/employee-management/selfies/alerts/read', ['attendance.view']);
rule('PUT', '/employee-management/selfies/settings', ['attendance.edit']);
rule('GET', '/employee-management/registrations(/:)?', ['employees.view']);
rule('POST', '/employee-management/registrations/:/approve', ['employees.approve']);
rule('POST', '/employee-management/registrations/:/reject', ['employees.reject']);
rule('POST', '/employee-management/employees/:/reset-password', ['employees.manage']);
rule('PUT', '/employee-management/employees/:/department', ['employees.edit']);
rule('GET', '/employee-management/departments', ['employees.view']);
rule('POST', '/employee-management/departments', ['employees.edit']);
rule('PUT DELETE', '/employee-management/departments/:', ['employees.edit']);
rule('GET', '/employee-management/attendance-rules', ['attendance.view']);
rule('PUT', '/employee-management/attendance-rules', ['attendance.edit']);
rule('GET', '/employee-management/attendance/export', ['attendance.export']);
rule('GET', '/employee-management/attendance/(daily|monthly|employee/:|:/audit)', ['attendance.view']);
rule('POST', '/employee-management/attendance/(correct|:/correct)', ['attendance.edit']);
rule('GET', '/employee-management/task-submissions', ['tasks.view']);
rule('POST', '/employee-management/tasks/:/(review|extensions/:)', ['tasks.approve']);
rule('GET', '/employee-management/leaves/current', ['leaves.view']);
rule('POST', '/employee-management/leaves/:/decision', decide('leaves', (b) => b.status, ['approved'], ['rejected']));
rule('GET', '/employee-management/activity', ['employees.view']);

// ── payroll (policy change, payment reversal and the audit log stay with the Super Admin) ──
rule('GET', '/payroll/payrolls/:/slip', ['payroll.export']);
rule('GET', '/payroll/reports/:', (req) => (['', 'json'].includes(word(req.query?.format)) ? ['payroll.view'] : ['payroll.export']));
rule('GET', '/payroll/(policy|dashboard|next-period|salary(/:)?|adjustments|payrolls(/:)?|payments)', ['payroll.view']);
rule('PUT', '/payroll/salary/:', ['payroll.edit']);
rule('POST', '/payroll/adjustments(/:/cancel)?', ['payroll.edit']);
rule('POST', '/payroll/payrolls/(preview|generate)', ['payroll.create']);
rule('POST', '/payroll/payrolls/:/(recalculate|adjustments|submit|cancel)', ['payroll.edit']);
rule('PUT', '/payroll/payrolls/:/overtime', ['payroll.edit']);
rule('DELETE', '/payroll/payrolls/:/adjustments/:', ['payroll.edit']);
rule('POST', '/payroll/payrolls/:/approve', ['payroll.approve']);
rule('POST', '/payroll/payrolls/:/reject', ['payroll.reject']);
rule('POST', '/payroll/payrolls/:/payments', ['payroll.manage']);

// ── memberships, referrals, commissions, money ──
rule('GET', '/membership/admin/(seller|captain)/(plans|subscriptions|stats)', ['memberships.view', 'settings.view']);
rule('POST', '/membership/admin/(seller|captain)/plans', ['settings.manage']);
rule('PUT DELETE', '/membership/admin/(seller|captain)/plans/:(/toggle)?', ['settings.manage']);
rule('POST', '/membership/admin/check-expiry', ['settings.manage']);

rule('GET', '/referral/admin/settings', ['referrals.view', 'settings.view']);
rule('PUT', '/referral/admin/settings', ['settings.manage']);
rule('GET', '/referral/admin/(stats|all)', ['referrals.view']);
rule('PUT', '/referral/admin/:/approve', ['referrals.approve']);
rule('POST', '/referral/admin/:/credit', ['referrals.manage']);

rule('GET', '/admin/commission-settings', ['commissions.view']);
rule('GET', '/admin/commission-reports', ['commissions.view', 'reports.view']);
rule('GET', '/super-admin/commissions(/history)?', ['commissions.view']);

rule('GET', '/super-admin/dashboard/metrics', ['finance.view']);
rule('GET', '/super-admin/(payouts(/:)?|refunds)', ['payouts.view', 'finance.view']);
rule('PUT', '/super-admin/payouts/:/approve', ['payouts.approve']);
rule('PUT', '/super-admin/payouts/:/reject', ['payouts.reject']);
rule('PUT', '/super-admin/(payouts|refunds)/:/process', ['payouts.manage']);

rule('GET', '/treasury/export/.+', ['finance.export']);
rule('GET', '/treasury/.+', ['finance.view']);
rule('POST PUT PATCH', '/treasury/.+', ['finance.manage']);

// ── shared by all brands ──
rule('GET', '/categories(/.*)?', ['categories.view', 'products.view']);
crud('/categories', 'categories', { view: ['categories.view', 'products.view'] });
crud('/banners', 'promotions');
rule('GET', '/faqs/admin', ['content.view']);
rule('POST', '/faqs', ['content.create']);
rule('PUT', '/faqs/:', ['content.edit']);
rule('DELETE', '/faqs/:', ['content.delete']);
rule('POST PUT', '/policies', ['content.edit']);
rule('DELETE', '/policies/:', ['content.delete']);
rule('PUT', '/(support-settings|support)', ['content.edit']);
for (const base of ['/pricing/admin(/(transport|vehicles|delivery))?', '/transport/vehicles(/admin/all)?']) rule('GET', base, ['pricing.view', 'transport.view']);
rule('POST', '/(pricing/admin/(transport|vehicles|delivery)|transport/vehicles)', ['pricing.create']);
rule('PUT PATCH', '/(pricing/admin/(transport|vehicles|delivery)|transport/vehicles)/:(/activate)?', ['pricing.edit']);
rule('DELETE', '/(pricing/admin/(transport|vehicles|delivery)|transport/vehicles)/:', ['pricing.delete']);

/** '/api/v1/Admin/Users/?x=1' -> '/admin/users'. Express matches paths without regard to case or a trailing slash. */
export const apiPath = (originalUrl) => {
  const path = String(originalUrl || '').split('?')[0].toLowerCase().replace(/^\/api(\/v\d+)?(?=\/|$)/, '');
  return path.replace(/\/+$/, '') || '/';
};

/** The need of a call, or null when no rule covers it (= refused). */
export const needFor = (req) => {
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  const path = apiPath(req.originalUrl);
  const found = R.find((r) => (!r.methods || r.methods.includes(method)) && r.re.test(path));
  if (!found) return null;
  return typeof found.need === 'function' ? found.need(req) : found.need;
};
