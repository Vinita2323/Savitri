import {
  DEMO_AS_OF,
  REPORT_BRANDS,
  REPORT_CUSTOMERS,
  REPORT_ORDERS,
  REPORT_PURCHASES,
  REPORT_SELLERS,
} from './reportsAnalyticsMock';

const brandBySlug = Object.fromEntries(REPORT_BRANDS.map((brand) => [brand.slug, brand]));
const customerById = Object.fromEntries(REPORT_CUSTOMERS.map((customer) => [customer.id, customer]));
const sellerById = Object.fromEntries(REPORT_SELLERS.map((seller) => [seller.id, seller]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7', label: 'Last 7 Days' },
  { id: '30', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

export const CATEGORIES = [
  { id: 'all', label: 'All Reports' },
  { id: 'business', label: 'Business' },
  { id: 'financial', label: 'Financial' },
  { id: 'people', label: 'Customers & Sellers' },
  { id: 'operations', label: 'Operations' },
];

export const REPORT_TABS = [
  { id: 'sales', label: 'Sales Report' },
  { id: 'financial', label: 'Financial Report' },
  { id: 'customers', label: 'Customer Report' },
  { id: 'sellers', label: 'Seller Performance Report' },
  { id: 'orders', label: 'Order Report' },
  { id: 'refunds', label: 'Refund & Returns Report' },
  { id: 'delivery', label: 'Delivery Report' },
];

const TAB_FOR_CATEGORY = {
  all: 'sales',
  business: 'sales',
  financial: 'financial',
  people: 'customers',
  operations: 'orders',
};

export const tabForCategory = (category) => TAB_FOR_CATEGORY[category] || 'sales';

export const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDay = (iso) => {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

const shortDay = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

const utcDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const addDays = (iso, days) => {
  const date = utcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const diffDays = (start, end) => Math.round((utcDate(end) - utcDate(start)) / 86400000);

const eachDay = (start, end) => {
  const days = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
};

export const deriveOrder = (order) => {
  const brand = brandBySlug[order.brandSlug];
  const customer = customerById[order.customerId];
  const seller = sellerById[order.sellerId];
  const delivered = order.status === 'Delivered';
  const collected = order.paymentStatus === 'Collected' ? Number(order.collectedAmount) || 0 : 0;
  const refunded = order.refundStatus === 'Refunded' ? Number(order.refundedAmount) || 0 : 0;
  const netCollected = Math.max(0, collected - refunded);
  const commission = delivered && collected > 0 ? Math.round(netCollected * brand.commissionRate) : 0;
  const sellerPayable = delivered && collected > 0 ? netCollected - commission : 0;
  const sellerPayout = order.payoutStatus === 'Paid' ? sellerPayable : 0;
  const pendingSettlement = order.payoutStatus === 'Pending' ? sellerPayable : 0;
  return {
    ...order,
    brand: brand.name,
    city: brand.city,
    customerName: customer?.name || order.customerId,
    customerSince: customer?.since || '',
    sellerName: seller?.name || order.sellerId,
    store: seller?.store || '',
    collected,
    refunded,
    commission,
    sellerPayable,
    sellerPayout,
    pendingSettlement,
    completedSale: delivered ? Number(order.orderAmount) || 0 : 0,
  };
};

const ENRICHED = REPORT_ORDERS.map(deriveOrder);

export const metricsOf = (orders) => {
  const delivered = orders.filter((order) => order.status === 'Delivered');
  const completedSales = delivered.reduce((sum, order) => sum + order.completedSale, 0);
  return {
    totalOrders: orders.length,
    completedSales,
    collections: orders.reduce((sum, order) => sum + order.collected, 0),
    commission: orders.reduce((sum, order) => sum + order.commission, 0),
    refunds: orders.reduce((sum, order) => sum + order.refunded, 0),
    sellerPayouts: orders.reduce((sum, order) => sum + order.sellerPayout, 0),
    pendingSettlement: orders.reduce((sum, order) => sum + order.pendingSettlement, 0),
    activeCustomers: new Set(delivered.map((order) => order.customerId)).size,
    deliveredCount: delivered.length,
    aov: delivered.length ? completedSales / delivered.length : null,
  };
};

export const growthLabel = (current, previous) => {
  if (!previous && !current) return { text: '0.0%', tone: 'flat' };
  if (!previous) return { text: 'No earlier sample', tone: 'flat' };
  const pct = ((current - previous) / previous) * 100;
  const tone = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, tone };
};

export const describeRange = (preset, customStart, customEnd) => {
  let current = null;
  if (preset === 'today') current = { start: DEMO_AS_OF, end: DEMO_AS_OF };
  if (preset === '7') current = { start: addDays(DEMO_AS_OF, -6), end: DEMO_AS_OF };
  if (preset === '30') current = { start: addDays(DEMO_AS_OF, -29), end: DEMO_AS_OF };
  if (preset === 'month') current = { start: `${DEMO_AS_OF.slice(0, 8)}01`, end: DEMO_AS_OF };
  if (preset === 'custom') {
    if (customStart && customEnd) {
      const start = customStart <= customEnd ? customStart : customEnd;
      const end = customStart <= customEnd ? customEnd : customStart;
      current = { start, end };
    }
  }
  if (!current) {
    return { current: null, previous: null, periodLabel: 'Custom range not set', previousLabel: '' };
  }

  let previous;
  if (preset === 'month') {
    const [year, month, day] = current.end.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 2, 1));
    const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
    const endDate = new Date(Date.UTC(year, month - 2, Math.min(day, lastDay)));
    previous = { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
  } else {
    const length = diffDays(current.start, current.end) + 1;
    const end = addDays(current.start, -1);
    previous = { start: addDays(end, -(length - 1)), end };
  }

  const periodLabel = current.start === current.end ? formatDay(current.start) : `${formatDay(current.start)} – ${formatDay(current.end)}`;
  const previousLabel = previous.start === previous.end ? formatDay(previous.start) : `${formatDay(previous.start)} – ${formatDay(previous.end)}`;
  return { current, previous, periodLabel, previousLabel };
};

export const ordersInRange = (range, brandSlug = 'ALL') => {
  if (!range) return [];
  return ENRICHED.filter((order) => {
    if (order.date < range.start || order.date > range.end) return false;
    if (brandSlug !== 'ALL' && order.brandSlug !== brandSlug) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
};

export const buildSummary = (currentOrders, previousOrders) => {
  const current = metricsOf(currentOrders);
  const previous = metricsOf(previousOrders);
  const fields = [
    ['totalOrders', 'Total Orders', 'All orders placed in the period, including cancelled and failed.', 'count'],
    ['completedSales', 'Completed Sales', 'Order value of delivered orders only.', 'inr'],
    ['collections', 'Customer Collections', 'Successful payments received. Pending and failed payments are excluded. Refunds are not subtracted.', 'inr'],
    ['commission', 'Platform Commission', 'Earned on delivered orders after confirmed refunds. Kept separate from sales and collections.', 'inr'],
    ['refunds', 'Total Refunds', 'Confirmed refunded amounts only. Pending refunds are excluded.', 'inr'],
    ['activeCustomers', 'Active Customers', 'Customers with at least one delivered order in the period.', 'count'],
  ];
  return fields.map(([key, label, definition, format]) => ({
    key,
    label,
    definition,
    value: format === 'inr' ? formatINR(current[key]) : String(current[key]),
    comparison: growthLabel(current[key], previous[key]),
  }));
};

export const salesTrend = (orders, range) => {
  if (!range) return [];
  const byDay = Object.fromEntries(eachDay(range.start, range.end).map((day) => [day, 0]));
  orders.forEach((order) => {
    if (byDay[order.date] !== undefined) byDay[order.date] += order.completedSale;
  });
  return Object.entries(byDay).map(([date, value]) => ({ date, label: shortDay(date), value }));
};

export const ordersByStatus = (orders) =>
  ['Delivered', 'Processing', 'Cancelled', 'Failed'].map((status) => ({
    label: status,
    value: orders.filter((order) => order.status === status).length,
    color: { Delivered: '#79B433', Processing: '#F7941D', Cancelled: '#94a3b8', Failed: '#e11d48' }[status],
  }));

export const brandComparison = (orders) =>
  REPORT_BRANDS.map((brand) => ({
    label: brand.name,
    value: orders.filter((order) => order.brandSlug === brand.slug).reduce((sum, order) => sum + order.completedSale, 0),
    color: '#1A2E0A',
  }));

export const aovByBrand = (orders) => {
  const overall = metricsOf(orders);
  const brands = REPORT_BRANDS.map((brand) => {
    const metrics = metricsOf(orders.filter((order) => order.brandSlug === brand.slug));
    return { name: brand.name, delivered: metrics.deliveredCount, aov: metrics.aov };
  });
  return { overall, brands };
};

export const brandRows = (orders, previousOrders, brandSlug) => {
  const brands = brandSlug === 'ALL' ? REPORT_BRANDS : REPORT_BRANDS.filter((brand) => brand.slug === brandSlug);
  return brands.map((brand) => {
    const current = metricsOf(orders.filter((order) => order.brandSlug === brand.slug));
    const previous = metricsOf(previousOrders.filter((order) => order.brandSlug === brand.slug));
    return {
      ...brand,
      totalOrders: current.totalOrders,
      completedOrders: current.deliveredCount,
      cancelledOrders: orders.filter((order) => order.brandSlug === brand.slug && order.status === 'Cancelled').length,
      completedSales: current.completedSales,
      collections: current.collections,
      refunds: current.refunds,
      commission: current.commission,
      activeCustomers: current.activeCustomers,
      growth: growthLabel(current.completedSales, previous.completedSales),
    };
  });
};

const purchasesInRange = (range, brandSlug) => {
  if (!range) return [];
  return REPORT_PURCHASES.filter((row) => {
    if (row.date < range.start || row.date > range.end) return false;
    if (brandSlug !== 'ALL' && row.brandSlug !== brandSlug) return false;
    return true;
  });
};

const sumByUnit = (rows, key) => {
  const totals = {};
  rows.forEach((row) => {
    totals[row.unit] = (totals[row.unit] || 0) + Number(row[key] || 0);
  });
  const parts = Object.entries(totals);
  if (!parts.length) return '—';
  return parts.map(([unit, qty]) => `${qty} ${unit}`).join(' · ');
};

export const peopleOverview = (orders, range, brandSlug) => {
  const sellers = REPORT_SELLERS.filter((seller) => brandSlug === 'ALL' || seller.brandSlug === brandSlug);
  const sellerStats = sellers.map((seller) => {
    const rows = orders.filter((order) => order.sellerId === seller.id && order.status === 'Delivered');
    const completedSales = rows.reduce((sum, order) => sum + order.completedSale, 0);
    const paid = orders.filter((order) => order.sellerId === seller.id).reduce((sum, order) => sum + order.sellerPayout, 0);
    const pending = orders.filter((order) => order.sellerId === seller.id).reduce((sum, order) => sum + order.pendingSettlement, 0);
    return {
      ...seller,
      brand: brandBySlug[seller.brandSlug].name,
      delivered: rows.length,
      completedSales,
      aov: rows.length ? completedSales / rows.length : null,
      paid,
      pending,
    };
  });
  const activeIds = new Set(orders.filter((order) => order.status === 'Delivered').map((order) => order.customerId));
  const customersInPeriod = REPORT_CUSTOMERS.filter((customer) => orders.some((order) => order.customerId === customer.id));
  const newCustomers = customersInPeriod.filter((customer) => range && customer.since >= range.start && customer.since <= range.end);
  const purchases = purchasesInRange(range, brandSlug).map((row) => ({
    ...row,
    brand: brandBySlug[row.brandSlug].name,
    sellerName: sellerById[row.sellerId]?.name || row.sellerId,
  }));
  return {
    newCustomers: newCustomers.length,
    activeCustomers: activeIds.size,
    registeredSellers: sellers.length,
    sellersWithSales: sellerStats.filter((seller) => seller.delivered > 0).length,
    topSellers: [...sellerStats].sort((a, b) => b.completedSales - a.completedSales).slice(0, 5),
    sellerStats,
    recentPurchases: orders.filter((order) => order.status === 'Delivered').slice(0, 6),
    purchases,
    purchasedQty: sumByUnit(purchases, 'qty'),
    availableQty: sumByUnit(purchases, 'available'),
    purchaseValue: purchases.reduce((sum, row) => sum + row.value, 0),
  };
};

export const operationsOverview = (orders) => {
  const delivered = orders.filter((order) => order.status === 'Delivered');
  const timed = delivered.filter((order) => order.deliveryDays !== null && order.deliveryDays !== undefined);
  const onTime = delivered.filter((order) => order.onTime === true).length;
  const late = delivered.filter((order) => order.onTime === false).length;
  const returnRequests = orders.filter((order) => order.returnRequested).length;
  const refundStatuses = ['Pending Review', 'Approved', 'Refunded', 'Refund Failed'].map((status) => ({
    status,
    count: orders.filter((order) => order.refundStatus === status).length,
  }));
  const avgDeliveryDays = timed.length ? timed.reduce((sum, order) => sum + order.deliveryDays, 0) / timed.length : null;
  return {
    delivered: delivered.length,
    processing: orders.filter((order) => order.status === 'Processing').length,
    cancelled: orders.filter((order) => order.status === 'Cancelled').length,
    failed: orders.filter((order) => order.status === 'Failed').length,
    onTime,
    late,
    timingKnown: onTime + late,
    avgDeliveryDays,
    returnRequests,
    refundStatuses,
    cancellationRate: orders.length ? (orders.filter((order) => order.status === 'Cancelled').length / orders.length) * 100 : null,
    returnRate: delivered.length ? (returnRequests / delivered.length) * 100 : null,
    pendingPayments: orders.filter((order) => order.paymentStatus === 'Pending').length,
    failedPayments: orders.filter((order) => order.paymentStatus === 'Failed').length,
  };
};

const queryMatch = (row, query) => {
  if (!query) return true;
  return Object.values(row).join(' ').toLowerCase().includes(query);
};

const deliveryNote = (order) => {
  if (order.status === 'Failed') return 'Delivery failed. Rider tracking is not in this dataset.';
  if (order.status === 'Cancelled') return 'Cancelled before delivery.';
  if (order.status === 'Processing') return order.paymentStatus === 'Collected' ? 'Prepaid and still processing. Not a completed sale.' : 'Still in progress. Delivery time is not recorded.';
  if (order.onTime === true) return order.deliveryDays === 0 ? 'Delivered the same day.' : 'Delivered on time.';
  if (order.onTime === false) return 'Delivered late.';
  return 'Delivery timing was not recorded.';
};

const deliveryTime = (order) => {
  if (order.deliveryDays === null || order.deliveryDays === undefined || order.status !== 'Delivered') return 'Not recorded';
  if (order.deliveryDays === 0) return 'Same day';
  if (order.deliveryDays === 1) return '1 day';
  return `${order.deliveryDays} days`;
};

export const buildReport = ({ tab, orders, range, brandSlug, local, query }) => {
  const needle = query.trim().toLowerCase();
  const people = peopleOverview(orders, range, brandSlug);

  if (tab === 'sales') {
    let rows = orders;
    if (local !== 'ALL') rows = rows.filter((order) => order.status === local);
    const table = rows.map((order) => ({
      Order: order.id,
      Date: formatDay(order.date),
      Brand: order.brand,
      Seller: order.sellerName,
      Customer: order.customerName,
      Status: order.status,
      'Order Value': formatINR(order.orderAmount),
      'Completed Sale': formatINR(order.completedSale),
    }));
    return pack(table, needle, 'Order status', ['ALL', 'Delivered', 'Processing', 'Cancelled', 'Failed'], 'Order, seller, or customer');
  }

  if (tab === 'financial') {
    let rows = orders;
    if (local === 'collection') rows = rows.filter((order) => order.collected > 0);
    if (local === 'commission') rows = rows.filter((order) => order.commission > 0);
    if (local === 'payout') rows = rows.filter((order) => order.sellerPayout > 0);
    if (local === 'pending') rows = rows.filter((order) => order.pendingSettlement > 0);
    if (local === 'refund') rows = rows.filter((order) => order.refunded > 0);
    const table = rows.map((order) => ({
      Order: order.id,
      Date: formatDay(order.date),
      Brand: order.brand,
      Payment: order.paymentStatus,
      Collected: formatINR(order.collected),
      Commission: formatINR(order.commission),
      'Seller Payout': formatINR(order.sellerPayout),
      'Pending Settlement': formatINR(order.pendingSettlement),
      Refunded: formatINR(order.refunded),
    }));
    return pack(
      table,
      needle,
      'Show rows with',
      [
        ['ALL', 'All orders'],
        ['collection', 'A collection'],
        ['commission', 'Earned commission'],
        ['payout', 'A seller payout'],
        ['pending', 'A pending settlement'],
        ['refund', 'A confirmed refund'],
      ],
      'Order, brand, or payment status'
    );
  }

  if (tab === 'customers') {
    let customers = REPORT_CUSTOMERS.filter((customer) => orders.some((order) => order.customerId === customer.id));
    if (local === 'new') customers = customers.filter((customer) => range && customer.since >= range.start && customer.since <= range.end);
    if (local === 'returning') customers = customers.filter((customer) => range && customer.since < range.start);
    const table = customers.map((customer) => {
      const rows = orders.filter((order) => order.customerId === customer.id);
      const delivered = rows.filter((order) => order.status === 'Delivered');
      const brands = [...new Set(rows.map((order) => order.brand))].join(', ');
      const isNew = range && customer.since >= range.start && customer.since <= range.end;
      return {
        Customer: customer.name,
        Since: formatDay(customer.since),
        Type: isNew ? 'New in period' : 'Returning',
        Orders: String(rows.length),
        Delivered: String(delivered.length),
        'Completed Sales': formatINR(delivered.reduce((sum, order) => sum + order.completedSale, 0)),
        Collections: formatINR(rows.reduce((sum, order) => sum + order.collected, 0)),
        Brands: brands,
      };
    });
    return pack(table, needle, 'Customer type', [['ALL', 'All customers'], ['new', 'New in period'], ['returning', 'Returning']], 'Customer or brand');
  }

  if (tab === 'sellers') {
    let sellers = people.sellerStats;
    if (local === 'with') sellers = sellers.filter((seller) => seller.delivered > 0);
    if (local === 'without') sellers = sellers.filter((seller) => seller.delivered === 0);
    const table = [...sellers]
      .sort((a, b) => b.completedSales - a.completedSales || a.name.localeCompare(b.name))
      .map((seller) => ({
        Seller: seller.name,
        Store: seller.store,
        Brand: seller.brand,
        'Delivered Orders': String(seller.delivered),
        'Completed Sales': formatINR(seller.completedSales),
        'Average Order Value': seller.aov === null ? '—' : formatINR(seller.aov),
        'Payout Paid': formatINR(seller.paid),
        'Pending Settlement': formatINR(seller.pending),
      }));
    return pack(table, needle, 'Completed sales', [['ALL', 'All sellers'], ['with', 'With completed sales'], ['without', 'No completed sales']], 'Seller, store, or brand');
  }

  if (tab === 'orders') {
    let rows = orders;
    if (local !== 'ALL') rows = rows.filter((order) => order.status === local);
    const table = rows.map((order) => ({
      Order: order.id,
      Date: formatDay(order.date),
      Brand: order.brand,
      Customer: order.customerName,
      Seller: order.sellerName,
      Status: order.status,
      Payment: order.paymentStatus,
      'Order Value': formatINR(order.orderAmount),
      Collected: formatINR(order.collected),
    }));
    return pack(table, needle, 'Order status', ['ALL', 'Delivered', 'Processing', 'Cancelled', 'Failed'], 'Order, customer, or seller');
  }

  if (tab === 'refunds') {
    let rows = orders.filter((order) => order.refundStatus || order.returnRequested);
    if (local === 'return') rows = rows.filter((order) => order.returnRequested);
    if (local !== 'ALL' && local !== 'return') rows = rows.filter((order) => order.refundStatus === local);
    const table = rows.map((order) => ({
      Order: order.id,
      Date: formatDay(order.date),
      Brand: order.brand,
      Customer: order.customerName,
      'Return Requested': order.returnRequested ? 'Yes' : 'No',
      'Refund Status': order.refundStatus || '—',
      Refunded: formatINR(order.refunded),
    }));
    return pack(
      table,
      needle,
      'Refund status',
      ['ALL', 'Refunded', 'Pending Review', 'Approved', 'Refund Failed', ['return', 'Return requested']],
      'Order, customer, or brand'
    );
  }

  let rows = orders;
  if (local === 'ontime') rows = rows.filter((order) => order.onTime === true);
  if (local === 'late') rows = rows.filter((order) => order.onTime === false);
  if (local === 'failed') rows = rows.filter((order) => order.status === 'Failed');
  if (local === 'progress') rows = rows.filter((order) => order.status === 'Processing');
  const table = rows.map((order) => ({
    Order: order.id,
    Date: formatDay(order.date),
    Brand: order.brand,
    Status: order.status,
    'Delivery Time': deliveryTime(order),
    'On Time': order.onTime === true ? 'Yes' : order.onTime === false ? 'No' : 'Not recorded',
    Notes: deliveryNote(order),
  }));
  return pack(
    table,
    needle,
    'Delivery result',
    [
      ['ALL', 'All orders'],
      ['ontime', 'On time'],
      ['late', 'Late'],
      ['failed', 'Failed'],
      ['progress', 'In progress'],
    ],
    'Order or brand'
  );
};

const pack = (table, needle, localLabel, localOptions, searchPlaceholder) => {
  const options = localOptions.map((option) => (Array.isArray(option) ? { id: option[0], label: option[1] } : { id: option, label: option === 'ALL' ? 'All' : option }));
  const rows = table.filter((row) => queryMatch(row, needle));
  return {
    columns: table[0] ? Object.keys(table[0]) : Object.keys(rows[0] || {}),
    rows,
    localLabel,
    localOptions: options,
    searchPlaceholder,
  };
};

export const rowsToCsv = (columns, rows) => {
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [columns.map(cell).join(','), ...rows.map((row) => columns.map((column) => cell(row[column])).join(','))].join('\n');
};

export const downloadCsv = (filename, columns, rows) => {
  const blob = new Blob([`\uFEFF${rowsToCsv(columns, rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
