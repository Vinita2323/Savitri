/**
 * What a City Admin may use. A City Admin is an ordinary Admin account tied to one brand (authorizedBrands = [brandId]),
 * so brand / city data isolation is done by the existing brand scope. On top of that, "permissions" switch whole areas
 * on or off. The check runs on the server (authMiddleware), never only in the menu.
 */
export const CITY_ADMIN_PERMISSIONS = [
  { key: 'sellers', label: 'Sellers' },
  { key: 'customers', label: 'Customers' },
  { key: 'products', label: 'Products' },
  { key: 'inventory', label: 'Inventory and purchases' },
  { key: 'orders', label: 'Orders and returns' },
  { key: 'captains', label: 'Delivery partners (captains)' },
  { key: 'employees', label: 'Employees and payroll' },
  { key: 'finance', label: 'Expenses, transactions, payouts and reports' },
  { key: 'notifications', label: 'Notifications' },
];
export const ALL_PERMISSION_KEYS = CITY_ADMIN_PERMISSIONS.map((p) => p.key);

// API path (after /api) -> permission. Paths that match nothing here are not gated by permissions (login, profile, brand lookup ...).
const RULES = [
  [/^\/super-admin\/brands(\/|$)/, null], // reading the brand list is needed by every admin screen
  [/^\/admin\/(sellers|commission)/, 'sellers'],
  [/^\/(sellers|seller-purchases|seller-registration-fee)(\/|$)/, 'sellers'],
  [/^\/admin\/users/, 'customers'],
  [/^\/(products|bulk-products)(\/|$)/, 'products'],
  [/^\/admin-purchases/, 'inventory'],
  [/^\/fulfillment/, 'inventory'],
  [/^\/pos(\/|$)/, 'inventory'],
  [/^\/admin\/orders/, 'orders'],
  [/^\/(orders|returns|courier|delivery-challans|quotations|proforma-invoices)(\/|$)/, 'orders'],
  [/^\/admin\/(captains|captain-cash-settlements)/, 'captains'],
  [/^\/captain(\/|$)/, 'captains'],
  [/^\/(employees|employee-management|payroll)(\/|$)/, 'employees'],
  [/^\/(super-admin|treasury|wallet)(\/|$)/, 'finance'],
  [/^\/(user\/notifications|fcm-tokens)(\/|$)/, 'notifications'],
];

export const permissionForPath = (originalUrl) => {
  // Express matches routes without regard to case, so this check must not depend on it either
  const path = String(originalUrl || '').split('?')[0].toLowerCase().replace(/^\/api(\/v\d+)?/, '');
  for (const [re, key] of RULES) if (re.test(path)) return key;
  return null;
};

export const cleanPermissions = (list) => {
  if (!Array.isArray(list)) return null;
  const set = new Set(list.map(String));
  return ALL_PERMISSION_KEYS.filter((k) => set.has(k));
};
