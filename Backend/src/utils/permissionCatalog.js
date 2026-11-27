/**
 * What an Admin can be allowed to do inside ONE brand. Super Admin picks these per admin and per brand
 * (AdminBrandAccess). This is not a login role: the account stays role "admin"; the presets below are only starting points
 * that are COPIED into the brand record, so changing one brand never changes the preset or another brand.
 *
 *  - `global: true`   the data is shared by every brand. Changing it changes it for all brands.
 *  - `sensitive: []`  actions that are never part of a preset and must be ticked one by one.
 * Things reserved for the Super Admin (brands, admin accounts, platform commission rates, payroll policy ...) are not listed
 * here at all, so no permission can unlock them.
 */
export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'];

const m = (key, label, group, actions, extra = {}) => ({ key, label, group, actions, sensitive: [], global: false, labels: {}, ...extra });
const shared = (key, label, actions, extra = {}) => m(key, label, 'Shared by all brands', actions, { global: true, sensitive: actions.filter((a) => a !== 'view'), ...extra });

export const MODULES = [
  m('dashboard', 'Dashboard', 'General', ['view']),
  m('reports', 'Reports', 'General', ['view', 'export']),

  m('products', 'Products', 'Catalogue and stock', ['view', 'create', 'edit', 'delete', 'manage'], { labels: { manage: 'Block / activate' } }),
  m('inventory', 'Inventory', 'Catalogue and stock', ['view']),
  m('purchases', 'Purchases', 'Catalogue and stock', ['view', 'create', 'edit', 'export'], { labels: { edit: 'Cancel purchase' } }),

  m('orders', 'Orders', 'Sales', ['view', 'edit'], { labels: { edit: 'Update status / assign captain' } }),
  m('returns', 'Returns', 'Sales', ['view', 'edit', 'approve', 'reject']),
  m('pos', 'POS billing', 'Sales', ['view', 'create', 'delete']),
  m('quotations', 'Quotations', 'Sales', ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export']),
  m('proforma', 'Proforma invoices', 'Sales', ['view', 'create', 'edit', 'manage'], { sensitive: ['manage'], labels: { manage: 'Record payment / convert' } }),
  m('challans', 'Delivery challans', 'Sales', ['view', 'create', 'edit', 'approve'], { labels: { approve: 'Finalise' } }),
  m('transport', 'Transport', 'Sales', ['view', 'edit', 'delete'], { labels: { edit: 'Assign captain', delete: 'Cancel trip' } }),

  m('customers', 'Customers', 'People', ['view', 'edit'], { labels: { edit: 'Block / unblock' } }),
  m('sellers', 'Sellers', 'People', ['view', 'edit', 'approve', 'reject', 'delete']),
  m('captains', 'Captains', 'People', ['view', 'edit', 'approve', 'reject', 'delete']),
  m('profile_requests', 'Profile edit requests', 'People', ['view', 'approve', 'reject']),
  m('memberships', 'Memberships (subscriptions)', 'People', ['view']),

  m('employees', 'Employees', 'Workforce', ['view', 'create', 'edit', 'approve', 'reject', 'manage'], { sensitive: ['manage'], labels: { manage: 'Reset passwords' } }),
  m('attendance', 'Attendance', 'Workforce', ['view', 'create', 'edit', 'export']),
  m('tasks', 'Tasks', 'Workforce', ['view', 'create', 'edit', 'approve'], { labels: { approve: 'Review' } }),
  m('leaves', 'Leaves', 'Workforce', ['view', 'create', 'approve', 'reject']),
  m('payroll', 'Salary and payroll', 'Workforce', ['view', 'create', 'edit', 'approve', 'reject', 'export', 'manage'], { sensitive: ['approve', 'reject', 'manage'], labels: { create: 'Generate', manage: 'Record payments' } }),

  m('commissions', 'Commissions', 'Money', ['view', 'manage'], { sensitive: ['manage'], labels: { manage: 'Change seller commission' } }),
  m('payouts', 'Payouts, refunds and cash settlements', 'Money', ['view', 'approve', 'reject', 'manage'], { sensitive: ['approve', 'reject', 'manage'], labels: { manage: 'Pay out / process refund' } }),
  m('finance', 'Finance and cash/bank', 'Money', ['view', 'export', 'manage'], { sensitive: ['manage'], labels: { manage: 'Record and change entries' } }),
  m('referrals', 'Referrals', 'Money', ['view', 'approve', 'manage'], { sensitive: ['manage'], labels: { manage: 'Credit rewards' } }),

  shared('categories', 'Categories', ['view', 'create', 'edit', 'delete']),
  shared('promotions', 'Promotions and banners', ['view', 'create', 'edit', 'delete']),
  shared('content', 'FAQs, policies and support', ['view', 'create', 'edit', 'delete']),
  shared('pricing', 'Pricing, charges and vehicle types', ['view', 'create', 'edit', 'delete']),
  shared('settings', 'Platform settings (fees, plans, referral rules)', ['view', 'manage'], { labels: { manage: 'Change settings' } }),
];

export const MODULE_MAP = new Map(MODULES.map((x) => [x.key, x]));

const pick = (spec) => Object.fromEntries(Object.entries(spec).map(([k, list]) => [k, list.filter((a) => MODULE_MAP.get(k).actions.includes(a))]).filter(([, v]) => v.length));

const adminPreset = () => Object.fromEntries(MODULES.map((x) => [x.key, x.actions.filter((a) => !x.sensitive.includes(a))]).filter(([, v]) => v.length));

const subAdminPreset = () => pick({
  dashboard: ['view'], reports: ['view'],
  products: ['view', 'create', 'edit'], inventory: ['view'], purchases: ['view', 'create'],
  orders: ['view', 'edit'], returns: ['view', 'edit'], pos: ['view', 'create'],
  quotations: ['view', 'create', 'edit'], proforma: ['view', 'create', 'edit'], challans: ['view', 'create', 'edit'], transport: ['view', 'edit'],
  customers: ['view'], sellers: ['view'], captains: ['view'], memberships: ['view'],
  employees: ['view'], attendance: ['view', 'create', 'edit'], tasks: ['view', 'create', 'edit'], leaves: ['view', 'create'],
  referrals: ['view'],
});

export const ROLE_PRESETS = [
  { key: 'ADMIN', label: 'Admin', description: 'Everything inside the brand, except money approvals, password resets and shared settings.', permissions: adminPreset() },
  { key: 'SUB_ADMIN', label: 'Sub Admin', description: 'Day-to-day work: view, add and edit. No deleting, approving or money actions.', permissions: subAdminPreset() },
  { key: 'CUSTOM', label: 'Custom role', description: 'Starts empty. Tick exactly what is needed.', permissions: {} },
];
export const ROLE_KEYS = ROLE_PRESETS.map((r) => r.key);

/**
 * Strict reading of a stored or submitted matrix: unknown modules and actions are dropped, and a module without "view"
 * grants nothing. Used when reading from the database, so damaged data can only reduce access.
 */
export const cleanMatrix = (input) => {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const mod of MODULES) {
    if (!Object.prototype.hasOwnProperty.call(input, mod.key)) continue;
    const list = input[mod.key];
    if (!Array.isArray(list)) continue;
    const actions = mod.actions.filter((a) => list.includes(a));
    if (actions.includes('view')) out[mod.key] = actions;
  }
  return out;
};

/** Validation of what Super Admin submits: anything unknown is refused rather than silently changed. Returns an error text or ''. */
export const matrixError = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Permissions must be given per module.';
  for (const [key, list] of Object.entries(input)) {
    const mod = MODULE_MAP.get(key);
    if (!mod) return `Unknown module: ${String(key).slice(0, 40)}`;
    if (!Array.isArray(list)) return `The actions of ${mod.label} must be a list.`;
    const bad = list.find((a) => !mod.actions.includes(a));
    if (bad !== undefined) return `${mod.label} has no "${String(bad).slice(0, 20)}" action.`;
    if (list.length && !list.includes('view')) return `${mod.label}: "View" is needed for any other action.`;
  }
  return '';
};

export const enabledModuleCount = (permissions) => Object.keys(cleanMatrix(permissions)).length;
export const can = (permissions, need) => {
  const [mod, action] = need.split('.');
  return Boolean(permissions?.[mod]?.includes(action));
};
