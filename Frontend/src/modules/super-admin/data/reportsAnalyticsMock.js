/** Demonstration records for Super Admin Reports & Analytics. Not live results. */

export const DEMO_AS_OF = '2026-10-21';
export const DEMO_UPDATED_LABEL = '21 Oct 2026, 09:40 IST';

export const REPORT_BRANDS = [
  { slug: 'auriva-bites', name: 'Auriva Bites', city: 'Indore', commissionRate: 0.08 },
  { slug: 'quick-commerce', name: 'Quick Commerce', city: 'Bhopal', commissionRate: 0.10 },
  { slug: 'shippnex', name: 'Shippnex', city: 'Indore', commissionRate: 0.12 },
  { slug: 'medcred', name: 'MedCred', city: 'Ujjain', commissionRate: 0.06 },
];

export const REPORT_CUSTOMERS = [
  { id: 'CUS-01', name: 'Aanya Verma', since: '2026-09-02' },
  { id: 'CUS-02', name: 'Rohit Malhotra', since: '2026-09-06' },
  { id: 'CUS-03', name: 'Priya Sen', since: '2026-09-11' },
  { id: 'CUS-04', name: 'Karan Bhatt', since: '2026-09-18' },
  { id: 'CUS-05', name: 'Neha Gupta', since: '2026-09-24' },
  { id: 'CUS-06', name: 'Aditya Rao', since: '2026-10-01' },
  { id: 'CUS-07', name: 'Sneha Iyer', since: '2026-10-04' },
  { id: 'CUS-08', name: 'Manav Joshi', since: '2026-10-08' },
  { id: 'CUS-09', name: 'Diya Kapoor', since: '2026-10-12' },
  { id: 'CUS-10', name: 'Harsh Vyas', since: '2026-10-15' },
  { id: 'CUS-11', name: 'Pooja Nair', since: '2026-10-18' },
  { id: 'CUS-12', name: 'Vivek Shah', since: '2026-10-20' },
  { id: 'CUS-13', name: 'Anjali Das', since: '2026-10-21' },
];

export const REPORT_SELLERS = [
  { id: 'SEL-118', name: 'Anika Rao', store: 'Fresh Foods', brandSlug: 'auriva-bites' },
  { id: 'SEL-119', name: 'Rohan Mehta', store: 'Daily Needs', brandSlug: 'auriva-bites' },
  { id: 'SEL-120', name: 'Meera Shah', store: 'Organic Foods', brandSlug: 'auriva-bites' },
  { id: 'SEL-210', name: 'Kabir Joshi', store: 'City Spice Mart', brandSlug: 'quick-commerce' },
  { id: 'SEL-211', name: 'Isha Nair', store: 'Morning Basket', brandSlug: 'quick-commerce' },
  { id: 'SEL-212', name: 'Dev Patel', store: 'Green Leaf', brandSlug: 'quick-commerce' },
  { id: 'SEL-310', name: 'Neel Kapoor', store: 'Quick Basket', brandSlug: 'shippnex' },
  { id: 'SEL-311', name: 'Tara Singh', store: 'Minute Mart', brandSlug: 'shippnex' },
  { id: 'SEL-312', name: 'Arjun Das', store: 'City Rush', brandSlug: 'shippnex' },
  { id: 'SEL-410', name: 'Leena Kulkarni', store: 'Care Pharmacy', brandSlug: 'medcred' },
  { id: 'SEL-411', name: 'Vikram Iyer', store: 'Wellness Counter', brandSlug: 'medcred' },
  { id: 'SEL-412', name: 'Sana Qureshi', store: 'Neighbour Clinic', brandSlug: 'medcred' },
];

/**
 * Order fields:
 * id, date, brandSlug, customerId, sellerId, status, orderAmount,
 * paymentStatus, collectedAmount, refundStatus, refundedAmount,
 * returnRequested, payoutStatus, deliveryDays, onTime
 * onTime is yes / no / blank. deliveryDays is a number or blank.
 */
const ORDER_ROWS = [
  ['ORD-2601', '2026-09-05', 'auriva-bites', 'CUS-01', 'SEL-118', 'Delivered', 1200, 'Collected', 1200, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2602', '2026-09-12', 'auriva-bites', 'CUS-02', 'SEL-119', 'Delivered', 860, 'Collected', 860, 'Refunded', 200, true, 'Paid', 2, 'yes'],
  ['ORD-2603', '2026-09-20', 'auriva-bites', 'CUS-03', 'SEL-120', 'Delivered', 540, 'Collected', 540, '', 0, false, 'Paid', 1, 'no'],
  ['ORD-2604', '2026-09-28', 'auriva-bites', 'CUS-01', 'SEL-118', 'Cancelled', 430, 'Failed', 0, '', 0, false, '', '', ''],
  ['ORD-2605', '2026-10-02', 'auriva-bites', 'CUS-04', 'SEL-119', 'Delivered', 980, 'Collected', 980, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2606', '2026-10-06', 'auriva-bites', 'CUS-05', 'SEL-120', 'Delivered', 760, 'Collected', 760, 'Pending Review', 0, true, 'Pending', 2, 'yes'],
  ['ORD-2607', '2026-10-09', 'auriva-bites', 'CUS-06', 'SEL-118', 'Delivered', 1500, 'Collected', 1500, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2608', '2026-10-13', 'auriva-bites', 'CUS-07', 'SEL-119', 'Processing', 640, 'Pending', 0, '', 0, false, '', '', ''],
  ['ORD-2609', '2026-10-16', 'auriva-bites', 'CUS-02', 'SEL-120', 'Delivered', 420, 'Collected', 420, 'Refunded', 420, true, 'Pending', 3, 'no'],
  ['ORD-2610', '2026-10-18', 'auriva-bites', 'CUS-08', 'SEL-118', 'Delivered', 1100, 'Collected', 1100, '', 0, false, 'Pending', 1, 'yes'],
  ['ORD-2611', '2026-10-20', 'auriva-bites', 'CUS-11', 'SEL-119', 'Delivered', 890, 'Collected', 890, '', 0, false, 'Pending', 1, 'yes'],
  ['ORD-2612', '2026-10-21', 'auriva-bites', 'CUS-13', 'SEL-118', 'Delivered', 670, 'Collected', 670, '', 0, false, 'Pending', 0, 'yes'],
  ['ORD-2613', '2026-10-21', 'auriva-bites', 'CUS-01', 'SEL-120', 'Failed', 310, 'Failed', 0, '', 0, false, '', '', ''],
  ['ORD-2614', '2026-09-08', 'quick-commerce', 'CUS-02', 'SEL-210', 'Delivered', 2100, 'Collected', 2100, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2615', '2026-09-15', 'quick-commerce', 'CUS-03', 'SEL-211', 'Delivered', 980, 'Collected', 980, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2616', '2026-09-22', 'quick-commerce', 'CUS-04', 'SEL-212', 'Cancelled', 450, 'Pending', 0, '', 0, false, '', '', ''],
  ['ORD-2617', '2026-09-30', 'quick-commerce', 'CUS-05', 'SEL-210', 'Delivered', 1340, 'Collected', 1340, 'Refunded', 340, true, 'Paid', 2, 'no'],
  ['ORD-2618', '2026-10-03', 'quick-commerce', 'CUS-06', 'SEL-211', 'Delivered', 760, 'Collected', 760, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2619', '2026-10-07', 'quick-commerce', 'CUS-07', 'SEL-212', 'Delivered', 1890, 'Collected', 1890, '', 0, false, 'Pending', 1, 'yes'],
  ['ORD-2620', '2026-10-11', 'quick-commerce', 'CUS-08', 'SEL-210', 'Processing', 520, 'Pending', 0, '', 0, false, '', '', ''],
  ['ORD-2621', '2026-10-14', 'quick-commerce', 'CUS-09', 'SEL-211', 'Delivered', 640, 'Collected', 640, 'Approved', 0, true, 'Pending', 2, 'yes'],
  ['ORD-2622', '2026-10-17', 'quick-commerce', 'CUS-10', 'SEL-212', 'Delivered', 1120, 'Collected', 1120, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2623', '2026-10-19', 'quick-commerce', 'CUS-02', 'SEL-210', 'Failed', 380, 'Failed', 0, '', 0, false, '', '', ''],
  ['ORD-2624', '2026-10-21', 'quick-commerce', 'CUS-12', 'SEL-211', 'Processing', 910, 'Pending', 0, '', 0, false, '', '', ''],
  ['ORD-2625', '2026-09-06', 'shippnex', 'CUS-03', 'SEL-310', 'Delivered', 2500, 'Collected', 2500, '', 0, false, 'Paid', 2, 'yes'],
  ['ORD-2626', '2026-09-14', 'shippnex', 'CUS-04', 'SEL-311', 'Delivered', 870, 'Collected', 870, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2627', '2026-09-19', 'shippnex', 'CUS-05', 'SEL-312', 'Delivered', 430, 'Collected', 430, 'Refund Failed', 0, true, 'Paid', 4, 'no'],
  ['ORD-2628', '2026-09-27', 'shippnex', 'CUS-01', 'SEL-310', 'Cancelled', 690, 'Failed', 0, '', 0, false, '', '', ''],
  ['ORD-2629', '2026-10-01', 'shippnex', 'CUS-06', 'SEL-311', 'Delivered', 1560, 'Collected', 1560, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2630', '2026-10-05', 'shippnex', 'CUS-07', 'SEL-312', 'Delivered', 980, 'Collected', 980, 'Refunded', 980, true, 'Pending', 2, 'yes'],
  ['ORD-2631', '2026-10-10', 'shippnex', 'CUS-08', 'SEL-310', 'Delivered', 740, 'Collected', 740, '', 0, false, 'Pending', 1, 'yes'],
  ['ORD-2632', '2026-10-15', 'shippnex', 'CUS-09', 'SEL-311', 'Processing', 610, 'Collected', 610, '', 0, false, '', '', ''],
  ['ORD-2633', '2026-10-18', 'shippnex', 'CUS-10', 'SEL-312', 'Delivered', 1320, 'Collected', 1320, '', 0, false, 'Pending', 1, 'yes'],
  ['ORD-2634', '2026-10-20', 'shippnex', 'CUS-11', 'SEL-310', 'Cancelled', 250, 'Pending', 0, '', 0, false, '', '', ''],
  ['ORD-2635', '2026-10-04', 'shippnex', 'CUS-04', 'SEL-311', 'Failed', 540, 'Failed', 0, '', 0, false, '', '', ''],
  ['ORD-2636', '2026-09-09', 'medcred', 'CUS-05', 'SEL-410', 'Delivered', 640, 'Collected', 640, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2637', '2026-09-16', 'medcred', 'CUS-06', 'SEL-411', 'Delivered', 1280, 'Collected', 1280, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2638', '2026-09-25', 'medcred', 'CUS-07', 'SEL-412', 'Delivered', 450, 'Collected', 450, 'Refunded', 150, true, 'Paid', 2, 'no'],
  ['ORD-2639', '2026-10-02', 'medcred', 'CUS-08', 'SEL-410', 'Delivered', 890, 'Collected', 890, '', 0, false, 'Paid', 1, 'yes'],
  ['ORD-2640', '2026-10-08', 'medcred', 'CUS-09', 'SEL-411', 'Delivered', 210, 'Pending', 0, '', 0, false, '', 1, 'yes'],
  ['ORD-2641', '2026-10-12', 'medcred', 'CUS-10', 'SEL-412', 'Delivered', 760, 'Collected', 760, 'Pending Review', 0, true, 'Pending', 1, 'yes'],
  ['ORD-2642', '2026-10-16', 'medcred', 'CUS-01', 'SEL-410', 'Cancelled', 330, 'Failed', 0, '', 0, false, '', '', ''],
  ['ORD-2643', '2026-10-19', 'medcred', 'CUS-12', 'SEL-411', 'Delivered', 1540, 'Collected', 1540, '', 0, false, 'Pending', 1, 'yes'],
  ['ORD-2644', '2026-10-21', 'medcred', 'CUS-13', 'SEL-412', 'Delivered', 480, 'Collected', 480, '', 0, false, 'Pending', 0, 'yes'],
  ['ORD-2645', '2026-10-11', 'medcred', 'CUS-03', 'SEL-410', 'Processing', 275, 'Pending', 0, '', 0, false, '', '', ''],
  ['ORD-2646', '2026-09-03', 'medcred', 'CUS-02', 'SEL-412', 'Delivered', 990, 'Collected', 990, '', 0, false, 'Paid', 2, 'yes'],
];

export const REPORT_ORDERS = ORDER_ROWS.map((row) => ({
  id: row[0],
  date: row[1],
  brandSlug: row[2],
  customerId: row[3],
  sellerId: row[4],
  status: row[5],
  orderAmount: row[6],
  paymentStatus: row[7],
  collectedAmount: row[8],
  refundStatus: row[9] || null,
  refundedAmount: row[10],
  returnRequested: row[11],
  payoutStatus: row[12] || null,
  deliveryDays: row[13] === '' ? null : row[13],
  onTime: row[14] === 'yes' ? true : row[14] === 'no' ? false : null,
}));

export const REPORT_PURCHASES = [
  { id: 'PUR-01', date: '2026-10-04', brandSlug: 'auriva-bites', sellerId: 'SEL-118', product: 'Cooking Oil', qty: 40, unit: 'L', available: 22, value: 4800 },
  { id: 'PUR-02', date: '2026-10-04', brandSlug: 'auriva-bites', sellerId: 'SEL-119', product: 'Wheat Flour', qty: 80, unit: 'kg', available: 51, value: 3200 },
  { id: 'PUR-03', date: '2026-09-18', brandSlug: 'quick-commerce', sellerId: 'SEL-210', product: 'Rice', qty: 100, unit: 'kg', available: 64, value: 5500 },
  { id: 'PUR-04', date: '2026-10-09', brandSlug: 'quick-commerce', sellerId: 'SEL-211', product: 'Milk', qty: 60, unit: 'L', available: 18, value: 3600 },
  { id: 'PUR-05', date: '2026-10-12', brandSlug: 'shippnex', sellerId: 'SEL-310', product: 'Snack Packs', qty: 200, unit: 'units', available: 140, value: 8000 },
  { id: 'PUR-06', date: '2026-10-15', brandSlug: 'medcred', sellerId: 'SEL-410', product: 'Syrup', qty: 30, unit: 'units', available: 19, value: 2700 },
  { id: 'PUR-07', date: '2026-09-22', brandSlug: 'medcred', sellerId: 'SEL-411', product: 'Cotton Rolls', qty: 25, unit: 'kg', available: 11, value: 1500 },
];

export const UNAVAILABLE_OPS_METRICS = [
  'Live rider location',
  'Proof-of-delivery photos',
  'Warehouse pick-and-pack time',
];
