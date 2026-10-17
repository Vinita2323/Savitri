/**
 * Demonstration / mock dataset for Brand Super Admin UI only.
 * Not connected to any API or database.
 */

export const DEMO_BANNER =
  'Demonstration data only — not connected to live orders, payments, or inventory.';

export const INITIAL_BRANDS = [
  {
    id: 'brand_fg',
    name: 'Fashion Gallary',
    code: 'FG-IND',
    city: 'Indore',
    address: 'Vijay Nagar Square, Indore, MP 452010',
    contact: '9302841832',
    gst: '23AABCF1234A1Z5',
    status: 'Active',
    logo: '/LogoSavitri.png',
    sellers: 12,
    captains: 8,
    products: 186,
    orders: 1240,
    sales: 1850000,
    expenses: 142000,
    inventoryValue: 620000,
    revenue: 1850000,
  },
  {
    id: 'brand_fh',
    name: 'Fashion Hub',
    code: 'FH-BPL',
    city: 'Bhopal',
    address: 'MP Nagar Zone II, Bhopal, MP 462011',
    contact: '9876543210',
    gst: '23AABCF5678B1Z9',
    status: 'Active',
    logo: '/LogoSavitri.png',
    sellers: 9,
    captains: 6,
    products: 142,
    orders: 980,
    sales: 1320000,
    expenses: 98000,
    inventoryValue: 410000,
    revenue: 1320000,
  },
  {
    id: 'brand_fa',
    name: 'Fashion Adda',
    code: 'FA-JBP',
    city: 'Jabalpur',
    address: 'Wright Town, Jabalpur, MP 482001',
    contact: '9123456780',
    gst: '23AABCF9012C1Z2',
    status: 'Inactive',
    logo: '/LogoSavitri.png',
    sellers: 5,
    captains: 3,
    products: 74,
    orders: 320,
    sales: 410000,
    expenses: 45000,
    inventoryValue: 180000,
    revenue: 410000,
  },
];

export const INITIAL_ADMINS = [
  {
    id: 'adm_1',
    name: 'Riya Sharma',
    email: 'riya.fg@demo.savitri',
    brands: ['brand_fg'],
    role: 'Brand Admin',
    status: 'Active',
  },
  {
    id: 'adm_2',
    name: 'Aman Verma',
    email: 'aman.fh@demo.savitri',
    brands: ['brand_fh'],
    role: 'Brand Admin',
    status: 'Active',
  },
  {
    id: 'adm_3',
    name: 'Neha Patel',
    email: 'neha.multi@demo.savitri',
    brands: ['brand_fg', 'brand_fh'],
    role: 'Regional Admin',
    status: 'Active',
  },
  {
    id: 'adm_4',
    name: 'Karan Singh',
    email: 'karan.fa@demo.savitri',
    brands: ['brand_fa'],
    role: 'Brand Admin',
    status: 'Inactive',
  },
];

export const MONTHLY_TRENDS = [
  { month: 'May', orders: 420, revenue: 520000 },
  { month: 'Jun', orders: 510, revenue: 640000 },
  { month: 'Jul', orders: 580, revenue: 710000 },
  { month: 'Aug', orders: 640, revenue: 790000 },
  { month: 'Sep', orders: 720, revenue: 880000 },
  { month: 'Oct', orders: 810, revenue: 980000 },
];

export const RECENT_ACTIVITY = [
  { id: 1, text: 'Fashion Gallary marked 48 orders as Packed (demo)', time: '12 min ago', type: 'order' },
  { id: 2, text: 'New seller onboarding draft for Fashion Hub (demo)', time: '1 hr ago', type: 'seller' },
  { id: 3, text: 'Fashion Adda status set to Inactive (demo)', time: '3 hr ago', type: 'brand' },
  { id: 4, text: 'Captain payout batch preview — ₹86,400 (demo)', time: '5 hr ago', type: 'finance' },
  { id: 5, text: 'Expense entry draft — warehouse rent FG (demo)', time: 'Yesterday', type: 'expense' },
];

export const SELLER_PERF = [
  { id: 's1', brandId: 'brand_fg', name: 'Style Street', orders: 210, sales: 320000, rating: 4.7 },
  { id: 's2', brandId: 'brand_fg', name: 'Urban Wear Co', orders: 180, sales: 275000, rating: 4.5 },
  { id: 's3', brandId: 'brand_fh', name: 'Hub Trends', orders: 160, sales: 240000, rating: 4.6 },
  { id: 's4', brandId: 'brand_fh', name: 'Bhopal Closet', orders: 120, sales: 185000, rating: 4.3 },
  { id: 's5', brandId: 'brand_fa', name: 'Adda Apparel', orders: 90, sales: 110000, rating: 4.2 },
];

export const CAPTAIN_PERF = [
  { id: 'c1', brandId: 'brand_fg', name: 'Rohit M.', deliveries: 320, earnings: 42000, onTime: '96%' },
  { id: 'c2', brandId: 'brand_fg', name: 'Suresh K.', deliveries: 280, earnings: 38000, onTime: '94%' },
  { id: 'c3', brandId: 'brand_fh', name: 'Imran A.', deliveries: 250, earnings: 34000, onTime: '95%' },
  { id: 'c4', brandId: 'brand_fa', name: 'Vikas T.', deliveries: 110, earnings: 15000, onTime: '91%' },
];

export const EXPENSE_ROWS = [
  { id: 'e1', brandId: 'brand_fg', category: 'Warehouse Rent', amount: 45000, date: '2026-10-01' },
  { id: 'e2', brandId: 'brand_fg', category: 'Packaging', amount: 18000, date: '2026-10-05' },
  { id: 'e3', brandId: 'brand_fh', category: 'Marketing', amount: 22000, date: '2026-10-03' },
  { id: 'e4', brandId: 'brand_fh', category: 'Utilities', amount: 12000, date: '2026-10-08' },
  { id: 'e5', brandId: 'brand_fa', category: 'Maintenance', amount: 9000, date: '2026-10-02' },
];

export const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN')}`;
