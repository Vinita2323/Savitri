/**
 * Demonstration / mock dataset for MyWillBook Super Admin UI only.
 * Not connected to any API or database.
 */

export const DEMO_BANNER =
  'Demonstration data only — not connected to live orders, payments, or inventory.';

export const ALL_PERMISSIONS = [
  'brands.read',
  'brands.write',
  'cities.read',
  'cities.write',
  'admins.read',
  'admins.write',
  'finance.read',
  'finance.write',
  'settings.write',
  'audit.read',
  'security.write',
];

export const DEMO_NOTIFICATIONS = [
  { id: 'n1', title: 'Pending seller approvals', body: '3 sellers awaiting review (demo)', at: '10 min ago', unread: true },
  { id: 'n2', title: 'Payout batch ready', body: '₹91,500 pending approval (demo)', at: '1 hr ago', unread: true },
  { id: 'n3', title: 'Policy draft updated', body: 'Terms v1.2 saved as draft (demo)', at: 'Yesterday', unread: false },
];

export const INITIAL_ADMINS = [
  { id: 'adm_1', name: 'Riya Sharma', email: 'riya@demo.mywillbook', role: 'Brand Admin', status: 'Active', brands: ['brand_fg'], lastLogin: '2026-10-19T10:00:00Z' },
  { id: 'adm_2', name: 'Aman Verma', email: 'aman@demo.mywillbook', role: 'Brand Admin', status: 'Active', brands: ['brand_fh'], lastLogin: '2026-10-18T16:20:00Z' },
  { id: 'adm_3', name: 'Neha Patel', email: 'neha@demo.mywillbook', role: 'Regional Admin', status: 'Active', brands: ['brand_fg', 'brand_sk'], lastLogin: '2026-10-19T08:45:00Z' },
  { id: 'adm_4', name: 'Karan Singh', email: 'karan@demo.mywillbook', role: 'Brand Admin', status: 'Inactive', brands: ['brand_fa'], lastLogin: '2026-10-10T12:00:00Z' },
];

export const INITIAL_ROLES = [
  { id: 'role_root', name: 'Super Admin', isSystem: true, permissions: [...ALL_PERMISSIONS] },
  { id: 'role_brand', name: 'Brand Admin', isSystem: false, permissions: ['brands.read', 'brands.write', 'cities.read', 'finance.read'] },
  { id: 'role_finance', name: 'Finance Manager', isSystem: false, permissions: ['finance.read', 'finance.write', 'audit.read'] },
  { id: 'role_ops', name: 'Operations Manager', isSystem: false, permissions: ['brands.read', 'cities.read', 'cities.write', 'admins.read'] },
  { id: 'role_support', name: 'Support Staff', isSystem: false, permissions: ['brands.read', 'cities.read', 'audit.read'] },
];

export const INITIAL_BRANDS = [
  {
    id: 'brand_fg',
    name: 'Fashion Gallary',
    code: 'FG-IND',
    city: 'Indore',
    description: 'Lifestyle fashion brand for Central India.',
    contact: '9302841832',
    contactEmail: 'ops.fg@demo.mywillbook',
    status: 'Active',
    logo: '/LogoSavitri.png',
    assignedAdminId: 'adm_1',
    sellers: 12,
    captains: 8,
    products: 186,
    orders: 1240,
    sales: 1850000,
    commission: 148000,
    pendingPayout: 42000,
    commissionRate: 7.5,
    config: {
      deliveryRadiusKm: 15,
      minOrderAmount: 149,
      deliveryFee: 35,
      freeDeliveryAbove: 699,
      cashOnDelivery: true,
      autoApproveSellers: false,
      maxActiveCaptains: 12,
      supportPhone: '9302841832',
      supportEmail: 'support.fg@demo.mywillbook',
      displayName: 'Fashion Gallary Indore',
      useIdentityOverride: true,
      commissionPercent: 7.5,
      membershipEnabled: true,
      membershipDiscountPercent: 8,
      overrides: { delivery: true, commission: true, membership: true },
    },
  },
  {
    id: 'brand_fh',
    name: 'Fashion Hub',
    code: 'FH-BPL',
    city: 'Bhopal',
    description: 'Multi-category apparel hub.',
    contact: '9876543210',
    contactEmail: 'ops.fh@demo.mywillbook',
    status: 'Active',
    logo: '/LogoSavitri.png',
    assignedAdminId: 'adm_2',
    sellers: 9,
    captains: 6,
    products: 142,
    orders: 980,
    sales: 1320000,
    commission: 105600,
    pendingPayout: 31000,
    commissionRate: 8,
    config: {
      deliveryRadiusKm: 12,
      minOrderAmount: 199,
      deliveryFee: 40,
      freeDeliveryAbove: 799,
      cashOnDelivery: true,
      autoApproveSellers: false,
      maxActiveCaptains: 10,
      supportPhone: '9876543210',
      supportEmail: 'support.fh@demo.mywillbook',
      displayName: '',
      useIdentityOverride: false,
      commissionPercent: 8,
      membershipEnabled: true,
      membershipDiscountPercent: 5,
      overrides: { delivery: false, commission: false, membership: false },
    },
  },
  {
    id: 'brand_fa',
    name: 'Fashion Adda',
    code: 'FA-JBP',
    city: 'Jabalpur',
    description: 'Value fashion for families.',
    contact: '9123456780',
    contactEmail: 'ops.fa@demo.mywillbook',
    status: 'Inactive',
    logo: '/LogoSavitri.png',
    assignedAdminId: 'adm_4',
    sellers: 5,
    captains: 3,
    products: 74,
    orders: 320,
    sales: 410000,
    commission: 32800,
    pendingPayout: 12000,
    commissionRate: 8,
    config: {
      deliveryRadiusKm: 10,
      minOrderAmount: 199,
      deliveryFee: 40,
      freeDeliveryAbove: 799,
      cashOnDelivery: false,
      autoApproveSellers: false,
      maxActiveCaptains: 6,
      supportPhone: '9123456780',
      supportEmail: 'support.fa@demo.mywillbook',
      displayName: '',
      useIdentityOverride: false,
      commissionPercent: 8,
      membershipEnabled: false,
      membershipDiscountPercent: 5,
      overrides: { delivery: false, commission: false, membership: true },
    },
  },
  {
    id: 'brand_sk',
    name: 'Style Kart',
    code: 'SK-UJJ',
    city: 'Ujjain',
    description: 'Trendy streetwear demo brand.',
    contact: '9988776655',
    contactEmail: 'ops.sk@demo.mywillbook',
    status: 'Active',
    logo: '/LogoSavitri.png',
    assignedAdminId: 'adm_3',
    sellers: 7,
    captains: 4,
    products: 96,
    orders: 610,
    sales: 780000,
    commission: 62400,
    pendingPayout: 18500,
    commissionRate: 8,
    config: {
      deliveryRadiusKm: 12,
      minOrderAmount: 199,
      deliveryFee: 40,
      freeDeliveryAbove: 799,
      cashOnDelivery: true,
      autoApproveSellers: true,
      maxActiveCaptains: 8,
      supportPhone: '9988776655',
      supportEmail: 'support.sk@demo.mywillbook',
      displayName: '',
      useIdentityOverride: false,
      commissionPercent: 8,
      membershipEnabled: true,
      membershipDiscountPercent: 5,
      overrides: { delivery: false, commission: false, membership: false },
    },
  },
];

export const INITIAL_CITIES = [
  {
    id: 'city_ind',
    name: 'Indore',
    state: 'Madhya Pradesh',
    status: 'Active',
    brandIds: ['brand_fg'],
    brandsCount: 1,
    captainsCount: 8,
    zones: ['Vijay Nagar', 'Rajwada', 'Bhawarkuan', 'Palasia'],
    serviceAreas: ['Vijay Nagar', 'Rajwada', 'Bhawarkuan', 'Palasia'],
    deliveryAvailable: true,
    sameDayDelivery: true,
    codAvailable: true,
  },
  {
    id: 'city_bpl',
    name: 'Bhopal',
    state: 'Madhya Pradesh',
    status: 'Active',
    brandIds: ['brand_fh'],
    brandsCount: 1,
    captainsCount: 6,
    zones: ['MP Nagar', 'Arera Colony', 'Kolar', 'New Market'],
    serviceAreas: ['MP Nagar', 'Arera Colony', 'Kolar', 'New Market'],
    deliveryAvailable: true,
    sameDayDelivery: false,
    codAvailable: true,
  },
  {
    id: 'city_jbp',
    name: 'Jabalpur',
    state: 'Madhya Pradesh',
    status: 'Inactive',
    brandIds: ['brand_fa'],
    brandsCount: 1,
    captainsCount: 3,
    zones: ['Wright Town', 'Civil Lines', 'Gorakhpur'],
    serviceAreas: ['Wright Town', 'Civil Lines', 'Gorakhpur'],
    deliveryAvailable: false,
    sameDayDelivery: false,
    codAvailable: false,
  },
  {
    id: 'city_ujj',
    name: 'Ujjain',
    state: 'Madhya Pradesh',
    status: 'Active',
    brandIds: ['brand_sk'],
    brandsCount: 1,
    captainsCount: 4,
    zones: ['Freeganj', 'Mahakal', 'Dewas Gate'],
    serviceAreas: ['Freeganj', 'Mahakal', 'Dewas Gate'],
    deliveryAvailable: true,
    sameDayDelivery: true,
    codAvailable: true,
  },
];

export const INITIAL_GLOBAL_SETTINGS = {
  platformName: 'MyWillBook',
  defaultCurrency: 'INR',
  defaultCommissionRate: 8,
  deliveryRadiusKm: 12,
  minOrderAmount: 199,
  deliveryFee: 40,
  freeDeliveryAbove: 799,
  membershipEnabled: true,
  membershipDiscountPercent: 5,
  supportEmail: 'support@demo.mywillbook',
  timezone: 'Asia/Kolkata',
};

export const GLOBAL_DEFAULTS = {
  deliveryRadiusKm: 12,
  minOrderAmount: 199,
  deliveryFee: 40,
  freeDeliveryAbove: 799,
  commissionPercent: 8,
  membershipEnabled: true,
  membershipDiscountPercent: 5,
  status: 'Active',
};

export const INITIAL_BRAND_CONFIGS = Object.fromEntries(
  INITIAL_BRANDS.map((b) => [b.id, { ...(b.config || {}) }])
);

export const INITIAL_SECURITY_SETTINGS = {
  mfaRequired: false,
  sessionTimeoutMinutes: 60,
  passwordMinLength: 8,
  requireSpecialChar: true,
  ipAllowlistEnabled: false,
  loginAlerts: true,
  maxSessions: 3,
};

export const SECURITY_EVENTS = [
  { id: 'se_1', at: '2026-10-19T08:00:00Z', event: 'Successful root login (demo)', severity: 'Info' },
  { id: 'se_2', at: '2026-10-18T21:10:00Z', event: 'Failed login attempt (demo IP)', severity: 'Warning' },
  { id: 'se_3', at: '2026-10-17T11:00:00Z', event: 'Session timeout preference viewed (demo)', severity: 'Info' },
];

export const DEMO_SESSIONS = [
  { id: 'sess_1', device: 'Chrome · Windows', location: 'Indore (demo)', lastActive: '2026-10-19T14:00:00Z', current: true },
  { id: 'sess_2', device: 'Safari · iPhone', location: 'Bhopal (demo)', lastActive: '2026-10-18T20:00:00Z', current: false },
];

export const INITIAL_ACTIVITY_LOGS = [
  { id: 'al_1', at: '2026-10-19T14:22:00Z', actor: 'Riya Sharma', role: 'Brand Admin', action: 'Login success', ip: '103.21.x.x (demo)', status: 'Success' },
  { id: 'al_2', at: '2026-10-19T13:05:00Z', actor: 'Aman Verma', role: 'Brand Admin', action: 'Updated city zone', ip: '49.36.x.x (demo)', status: 'Success' },
  { id: 'al_3', at: '2026-10-18T21:10:00Z', actor: 'Unknown', role: '—', action: 'Failed login', ip: '45.112.x.x (demo)', status: 'Failed' },
  { id: 'al_4', at: '2026-10-18T16:40:00Z', actor: 'Neha Patel', role: 'Regional Admin', action: 'Viewed finance report', ip: '122.168.x.x (demo)', status: 'Success' },
  { id: 'al_5', at: '2026-10-17T09:12:00Z', actor: 'Karan Singh', role: 'Brand Admin', action: 'Password reset requested', ip: '27.59.x.x (demo)', status: 'Success' },
];

export const INITIAL_AUDIT_LOGS = [
  { id: 'aud_1', at: '2026-10-19T14:22:00Z', actor: 'Root Administrator', module: 'Brand Management', entity: 'Brand', entityId: 'brand_fg', change: 'Updated brand logo (demo)', before: 'logo: /old.png', after: 'logo: /LogoSavitri.png' },
  { id: 'aud_2', at: '2026-10-19T11:40:00Z', actor: 'Neha Patel', module: 'Brand Configuration', entity: 'Settings', entityId: 'global', change: 'Commission override saved (demo)', before: '7.0%', after: '7.5%' },
  { id: 'aud_3', at: '2026-10-18T16:30:00Z', actor: 'Root Administrator', module: 'Brand Management', entity: 'Brand', entityId: 'brand_fa', change: 'Deactivated brand (demo)', before: 'Active', after: 'Inactive' },
  { id: 'aud_4', at: '2026-10-17T12:00:00Z', actor: 'Root Administrator', module: 'Access', entity: 'Admin', entityId: 'adm_4', change: 'Deactivated admin (demo)', before: 'Active', after: 'Inactive' },
];

export const FINANCE_SUMMARY = {
  gmv: 4360000,
  netRevenue: 348800,
  commissionEarned: 348800,
  pendingPayouts: 103500,
  refunds: 22400,
  membershipRevenue: 48600,
};

export const INITIAL_COMMISSIONS = [
  { id: 'com_1', brand: 'Fashion Gallary', brandId: 'brand_fg', seller: 'Meera Boutique', orderId: 'ORD-10021', period: 'Oct 2026', orders: 420, rate: 7.5, amount: 42000, status: 'Pending' },
  { id: 'com_2', brand: 'Fashion Hub', brandId: 'brand_fh', seller: 'Urban Threads', orderId: 'ORD-10088', period: 'Oct 2026', orders: 310, rate: 8, amount: 31000, status: 'Approved' },
  { id: 'com_3', brand: 'Style Kart', brandId: 'brand_sk', seller: 'Kids Corner', orderId: 'ORD-10102', period: 'Oct 2026', orders: 180, rate: 8, amount: 18500, status: 'Paid' },
  { id: 'com_4', brand: 'Fashion Adda', brandId: 'brand_fa', seller: 'Daily Wear Co', orderId: 'ORD-09950', period: 'Sep 2026', orders: 95, rate: 8, amount: 9800, status: 'Paid' },
];

export const INITIAL_PAYOUTS = [
  { id: 'pay_1', ref: 'PO-DEMO-1001', payee: 'Fashion Gallary', brand: 'Fashion Gallary', type: 'Seller', amount: 42000, status: 'Pending', requestedAt: '2026-10-19T09:00:00Z', updatedAt: '2026-10-19T09:00:00Z' },
  { id: 'pay_2', ref: 'PO-DEMO-1002', payee: 'Fashion Hub', brand: 'Fashion Hub', type: 'Seller', amount: 31000, status: 'Approved', requestedAt: '2026-10-18T18:00:00Z', updatedAt: '2026-10-18T18:00:00Z' },
  { id: 'pay_3', ref: 'PO-DEMO-1003', payee: 'Rohit Yadav', brand: 'Fashion Gallary', type: 'Captain', amount: 8500, status: 'Processing', requestedAt: '2026-10-18T12:00:00Z', updatedAt: '2026-10-18T12:00:00Z' },
  { id: 'pay_4', ref: 'PO-DEMO-1004', payee: 'Style Kart', brand: 'Style Kart', type: 'Seller', amount: 18500, status: 'Paid', requestedAt: '2026-10-17T10:00:00Z', updatedAt: '2026-10-17T10:00:00Z' },
  { id: 'pay_5', ref: 'PO-DEMO-1005', payee: 'Sana Khan', brand: 'Fashion Hub', type: 'Captain', amount: 6200, status: 'Rejected', requestedAt: '2026-10-16T14:00:00Z', updatedAt: '2026-10-16T16:00:00Z' },
];

export const INITIAL_RECONCILIATION = [
  { id: 'rec_1', ref: 'TXN-9001', orderRef: 'ORD-10021', brand: 'Fashion Gallary', gateway: 'Razorpay', method: 'UPI', amount: 12400, txnStatus: 'Success', status: 'Matched', at: '2026-10-19' },
  { id: 'rec_2', ref: 'TXN-9002', orderRef: 'ORD-10088', brand: 'Fashion Hub', gateway: 'Cashfree', method: 'Card', amount: 5600, txnStatus: 'Success', status: 'Mismatch', at: '2026-10-18' },
  { id: 'rec_3', ref: 'TXN-9003', orderRef: 'ORD-10102', brand: 'Style Kart', gateway: 'COD', method: 'Cash', amount: 34200, txnStatus: 'Collected', status: 'Matched', at: '2026-10-18' },
  { id: 'rec_4', ref: 'TXN-9004', orderRef: 'ORD-10115', brand: 'Fashion Gallary', gateway: 'Razorpay', method: 'Wallet', amount: 2100, txnStatus: 'Pending', status: 'Unmatched', at: '2026-10-17' },
];

export const INITIAL_MEMBERSHIP_PLANS = [
  { id: 'mem_s_m', audience: 'Seller', name: 'Seller Monthly', price: 299, durationDays: 30, discountPercent: 5, maxListings: 50, status: 'Active' },
  { id: 'mem_s_h', audience: 'Seller', name: 'Seller Half-Yearly', price: 1499, durationDays: 180, discountPercent: 10, maxListings: 200, status: 'Active' },
  { id: 'mem_s_y', audience: 'Seller', name: 'Seller Yearly', price: 2499, durationDays: 365, discountPercent: 15, maxListings: 500, status: 'Active' },
  { id: 'mem_c_m', audience: 'Captain', name: 'Captain Monthly', price: 149, durationDays: 30, discountPercent: 0, maxListings: 0, status: 'Active' },
  { id: 'mem_c_h', audience: 'Captain', name: 'Captain Half-Yearly', price: 699, durationDays: 180, discountPercent: 0, maxListings: 0, status: 'Active' },
  { id: 'mem_c_y', audience: 'Captain', name: 'Captain Yearly', price: 1199, durationDays: 365, discountPercent: 0, maxListings: 0, status: 'Inactive' },
];

export const INITIAL_TEMPLATES = [
  { id: 'tpl_1', name: 'Order placed SMS', category: 'Orders', channel: 'SMS', subject: '', body: 'Your order {{id}} is placed. Track in the app.', status: 'Published' },
  { id: 'tpl_2', name: 'Payout approved email', category: 'Finance', channel: 'Email', subject: 'Payout approved', body: 'Your payout of {{amount}} is approved (demo).', status: 'Draft' },
  { id: 'tpl_3', name: 'New order in-app', category: 'Orders', channel: 'In-App', subject: 'New order', body: 'You have a new order {{id}}.', status: 'Published' },
  { id: 'tpl_4', name: 'Captain assigned SMS', category: 'Delivery', channel: 'SMS', subject: '', body: 'Captain {{name}} is assigned to order {{id}}.', status: 'Published' },
];

export const INITIAL_POLICIES = [
  { id: 'pol_1', name: 'Terms & Conditions', version: '1.2', status: 'Published', updatedAt: '2026-09-01T00:00:00Z', body: 'Demo Terms & Conditions for MyWillBook platform. Not a live legal document.' },
  { id: 'pol_2', name: 'Privacy Policy', version: '1.1', status: 'Published', updatedAt: '2026-09-01T00:00:00Z', body: 'Demo Privacy Policy describing how demo data is handled in this UI preview.' },
  { id: 'pol_3', name: 'Refund Policy', version: '1.0', status: 'Draft', updatedAt: '2026-10-10T00:00:00Z', body: 'Demo Refund Policy — refunds illustrated for UI only.' },
  { id: 'pol_4', name: 'Cancellation Policy', version: '1.0', status: 'Draft', updatedAt: '2026-10-10T00:00:00Z', body: 'Demo Cancellation Policy for order cancellations.' },
  { id: 'pol_5', name: 'Seller Policy', version: '1.0', status: 'Published', updatedAt: '2026-08-15T00:00:00Z', body: 'Demo Seller Policy covering listings and settlements.' },
  { id: 'pol_6', name: 'Captain Policy', version: '1.0', status: 'Published', updatedAt: '2026-08-15T00:00:00Z', body: 'Demo Captain Policy covering deliveries and cash handling.' },
];

export const ANALYTICS_SERIES = {
  ordersByMonth: [
    { label: 'Apr', value: 820 },
    { label: 'May', value: 910 },
    { label: 'Jun', value: 980 },
    { label: 'Jul', value: 1050 },
    { label: 'Aug', value: 1120 },
    { label: 'Sep', value: 1180 },
    { label: 'Oct', value: 860 },
  ],
  gmvByMonth: [
    { label: 'Apr', value: 980000 },
    { label: 'May', value: 1100000 },
    { label: 'Jun', value: 1250000 },
    { label: 'Jul', value: 1320000 },
    { label: 'Aug', value: 1410000 },
    { label: 'Sep', value: 1520000 },
    { label: 'Oct', value: 980000 },
  ],
  brandSales: [
    { label: 'Fashion Gallary', value: 1850000 },
    { label: 'Fashion Hub', value: 1320000 },
    { label: 'Style Kart', value: 780000 },
    { label: 'Fashion Adda', value: 410000 },
  ],
  citySales: [
    { label: 'Indore', value: 1850000 },
    { label: 'Bhopal', value: 1320000 },
    { label: 'Ujjain', value: 780000 },
    { label: 'Jabalpur', value: 410000 },
  ],
  salesTrend: [
    { label: 'Mon', value: 120000 },
    { label: 'Tue', value: 145000 },
    { label: 'Wed', value: 132000 },
    { label: 'Thu', value: 168000 },
    { label: 'Fri', value: 210000 },
    { label: 'Sat', value: 255000 },
    { label: 'Sun', value: 198000 },
  ],
  orderTrend: [
    { label: 'Mon', value: 86 },
    { label: 'Tue', value: 102 },
    { label: 'Wed', value: 94 },
    { label: 'Thu', value: 118 },
    { label: 'Fri', value: 141 },
    { label: 'Sat', value: 176 },
    { label: 'Sun', value: 132 },
  ],
  membershipRevenue: [
    { label: 'Apr', value: 42000 },
    { label: 'May', value: 45500 },
    { label: 'Jun', value: 51000 },
    { label: 'Jul', value: 53800 },
    { label: 'Aug', value: 56200 },
    { label: 'Sep', value: 61000 },
    { label: 'Oct', value: 48600 },
  ],
};

export const RECENT_ACTIVITY = [
  { id: 'act_1', at: '2026-10-19T14:22:00Z', title: 'Updated brand logo', detail: 'Riya Sharma · Fashion Gallary', actor: 'Riya Sharma', action: 'Updated brand logo', target: 'Fashion Gallary', time: '2026-10-19 14:22' },
  { id: 'act_2', at: '2026-10-19T13:05:00Z', title: 'Pending seller approval', detail: 'System · Style Kart · 2 sellers', actor: 'System', action: 'Pending seller approval', target: 'Style Kart · 2 sellers', time: '2026-10-19 13:05' },
  { id: 'act_3', at: '2026-10-19T11:40:00Z', title: 'Activated city zone', detail: 'Aman Verma · Bhopal · Kolar', actor: 'Aman Verma', action: 'Activated city zone', target: 'Bhopal · Kolar', time: '2026-10-19 11:40' },
  { id: 'act_4', at: '2026-10-18T18:12:00Z', title: 'Commission override saved', detail: 'Neha Patel · Fashion Gallary', actor: 'Neha Patel', action: 'Commission override saved', target: 'Fashion Gallary', time: '2026-10-18 18:12' },
  { id: 'act_5', at: '2026-10-18T16:30:00Z', title: 'Deactivated brand', detail: 'Root Administrator · Fashion Adda', actor: 'Root Administrator', action: 'Deactivated brand', target: 'Fashion Adda', time: '2026-10-18 16:30' },
];

export const RECENT_FINANCIAL = [
  { id: 'fin_1', time: '2026-10-19 12:00', type: 'Commission accrued', brand: 'Fashion Gallary', amount: 12400 },
  { id: 'fin_2', time: '2026-10-19 10:15', type: 'Payout pending', brand: 'Fashion Hub', amount: 18500 },
  { id: 'fin_3', time: '2026-10-18 21:00', type: 'Membership revenue', brand: 'Platform', amount: 9600 },
  { id: 'fin_4', time: '2026-10-18 17:45', type: 'Refund adjustment', brand: 'Style Kart', amount: -2200 },
  { id: 'fin_5', time: '2026-10-18 09:20', type: 'COD settlement', brand: 'Fashion Gallary', amount: 34200 },
];

export const BRAND_SALES_SERIES = ANALYTICS_SERIES.brandSales.map((d, i) => ({ id: `bs_${i}`, ...d }));
export const CITY_SALES_SERIES = ANALYTICS_SERIES.citySales.map((d, i) => ({ id: `cs_${i}`, ...d }));
export const SALES_TREND = ANALYTICS_SERIES.salesTrend.map((d, i) => ({ id: `st_${i}`, ...d }));
export const ORDER_TREND = ANALYTICS_SERIES.orderTrend.map((d, i) => ({ id: `ot_${i}`, ...d }));
export const MEMBERSHIP_REVENUE = ANALYTICS_SERIES.membershipRevenue.map((d, i) => ({ id: `mr_${i}`, ...d }));

export const CANCELLATION_STATS = [
  { id: 'can_1', reason: 'Customer changed mind', count: 42, rate: '1.8%' },
  { id: 'can_2', reason: 'Out of stock', count: 28, rate: '1.2%' },
  { id: 'can_3', reason: 'Delivery delay', count: 19, rate: '0.8%' },
  { id: 'can_4', reason: 'Payment failed', count: 15, rate: '0.6%' },
];

export const SELLER_PERF = [
  { id: 'sel_1', name: 'Meera Boutique', brand: 'Fashion Gallary', orders: 210, sales: 320000, rating: 4.7 },
  { id: 'sel_2', name: 'Urban Threads', brand: 'Fashion Hub', orders: 186, sales: 278000, rating: 4.5 },
  { id: 'sel_3', name: 'Kids Corner', brand: 'Style Kart', orders: 142, sales: 198000, rating: 4.6 },
  { id: 'sel_4', name: 'Daily Wear Co', brand: 'Fashion Adda', orders: 98, sales: 112000, rating: 4.2 },
];

export const CAPTAIN_PERF = [
  { id: 'cap_1', name: 'Rohit Yadav', city: 'Indore', deliveries: 312, earnings: 46800, onTime: '96%' },
  { id: 'cap_2', name: 'Sana Khan', city: 'Bhopal', deliveries: 278, earnings: 41700, onTime: '94%' },
  { id: 'cap_3', name: 'Vikram Joshi', city: 'Ujjain', deliveries: 201, earnings: 30150, onTime: '92%' },
  { id: 'cap_4', name: 'Pooja Verma', city: 'Indore', deliveries: 188, earnings: 28200, onTime: '97%' },
];

export const ANALYTICS_EXPORT_ROWS = [
  { brand: 'Fashion Gallary', city: 'Indore', orders: 1240, sales: 1850000, cancellations: 28 },
  { brand: 'Fashion Hub', city: 'Bhopal', orders: 980, sales: 1320000, cancellations: 22 },
  { brand: 'Style Kart', city: 'Ujjain', orders: 610, sales: 780000, cancellations: 14 },
  { brand: 'Fashion Adda', city: 'Jabalpur', orders: 320, sales: 410000, cancellations: 18 },
];
