import API from './api';
import { SAMPLE_PRODUCTS_CATALOG } from '../modules/admin/quotations/data/mockQuotations';

const POS_SALES_STORAGE_KEY = 'savitri_pos_sales';
const POS_HELD_BILLS_STORAGE_KEY = 'savitri_pos_held_bills';
const POS_CUSTOMERS_STORAGE_KEY = 'savitri_pos_customers';

// Local storage helper utilities
const getStoredSales = () => {
  try {
    const raw = localStorage.getItem(POS_SALES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredSales = (sales) => {
  try {
    localStorage.setItem(POS_SALES_STORAGE_KEY, JSON.stringify(sales));
  } catch (e) {
    console.error('Failed to persist POS sales in localStorage', e);
  }
};

const getStoredHeldBills = () => {
  try {
    const raw = localStorage.getItem(POS_HELD_BILLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredHeldBills = (bills) => {
  try {
    localStorage.setItem(POS_HELD_BILLS_STORAGE_KEY, JSON.stringify(bills));
  } catch (e) {
    console.error('Failed to persist held bills in localStorage', e);
  }
};

const getStoredCustomers = () => {
  try {
    const raw = localStorage.getItem(POS_CUSTOMERS_STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : [
          {
            id: 'cust_01',
            name: 'Sunil Verma',
            phone: '9826012345',
            email: 'sunil.verma@example.com',
            addresses: [
              {
                fullName: 'Sunil Verma',
                phone: '9826012345',
                addressLine1: 'Flat 402, Royal Palms, Vijay Nagar',
                city: 'Indore',
                state: 'Madhya Pradesh',
                pincode: '452010',
              },
            ],
          },
          {
            id: 'cust_02',
            name: 'Pooja Agarwal',
            phone: '9425098765',
            email: 'pooja.agarwal@example.com',
            addresses: [
              {
                fullName: 'Pooja Agarwal',
                phone: '9425098765',
                addressLine1: 'B-12, Saket Nagar, Near Square',
                city: 'Indore',
                state: 'Madhya Pradesh',
                pincode: '452018',
              },
            ],
          },
          {
            id: 'cust_03',
            name: 'Rajesh Mehra (Hotel Pearl)',
            phone: '9893044122',
            email: 'procurement@hotelpearl.com',
            addresses: [
              {
                fullName: 'Rajesh Mehra',
                phone: '9893044122',
                addressLine1: '45, RNT Marg, South Tukoganj',
                city: 'Indore',
                state: 'Madhya Pradesh',
                pincode: '452001',
              },
            ],
          },
        ];
  } catch {
    return [];
  }
};

// Fallback stores
const FALLBACK_STORES = [
  {
    id: 'store_central',
    storeName: 'ShippNex Central Fulfillment Hub',
    phone: '0731-4099881',
    city: 'Indore',
    address: 'Plot 42, Logistics Park, Ring Road',
    pincode: '452001',
    gstin: '23AAECS9124K1ZX',
    type: 'Central Warehouse',
  },
  {
    id: 'store_south',
    storeName: 'Vijay Nagar Quick Retail Store #03',
    phone: '0731-2559123',
    city: 'Indore',
    address: 'Shop 14-16, Orbit Mall Commercial Arcade',
    pincode: '452010',
    gstin: '23AAECS9124K1ZX',
    type: 'Retail Counter Store',
  },
  {
    id: 'store_west',
    storeName: 'Bhawarkua Dark Store #07',
    phone: '0731-2490182',
    city: 'Indore',
    address: 'Survey 88, Near Tower Square',
    pincode: '452001',
    gstin: '23AAECS9124K1ZX',
    type: 'Quick Commerce Dark Store',
  },
];

// Fallback products catalog
const FALLBACK_PRODUCTS = [
  {
    id: 'prod_1',
    name: 'Savitri Premium Sharbati Atta (10kg)',
    sku: 'SAV-ATT-10KG',
    barcode: '8901030010012',
    category: 'Groceries & Staples',
    mrp: 520,
    salePrice: 465,
    stock: 45,
    unit: '10 kg Pack',
    taxRate: 5,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80',
  },
  {
    id: 'prod_2',
    name: 'Aashirvaad Organic Pure Cow Desi Ghee (1L Pet Jar)',
    sku: 'AAS-GHEE-1L',
    barcode: '8901030020029',
    category: 'Dairy & Breakfast',
    mrp: 699,
    salePrice: 620,
    stock: 30,
    unit: '1 Litre',
    taxRate: 12,
    image: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=200&q=80',
  },
  {
    id: 'prod_3',
    name: 'Tata Sampann Unpolished Toor Dal (1kg)',
    sku: 'TAT-TOOR-1KG',
    barcode: '8901030030036',
    category: 'Groceries & Staples',
    mrp: 185,
    salePrice: 162,
    stock: 80,
    unit: '1 kg',
    taxRate: 5,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80',
  },
  {
    id: 'prod_4',
    name: 'Fortune Sunlite Refined Sunflower Oil (5L Can)',
    sku: 'FOR-OIL-5L',
    barcode: '8901030040043',
    category: 'Oil & Masalas',
    mrp: 810,
    salePrice: 725,
    stock: 22,
    unit: '5 Ltr',
    taxRate: 5,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&q=80',
  },
  {
    id: 'prod_5',
    name: 'Amul Taaza Homogenised Toned Milk (1L Tetra)',
    sku: 'AMU-MILK-1L',
    barcode: '8901030050050',
    category: 'Dairy & Breakfast',
    mrp: 75,
    salePrice: 72,
    stock: 60,
    unit: '1 Litre',
    taxRate: 5,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&q=80',
  },
  {
    id: 'prod_6',
    name: 'Cadbury Celebrations Rich Chocolate Gift Pack (286g)',
    sku: 'CAD-CEL-286G',
    barcode: '8901030060067',
    category: 'Snacks & Confectionery',
    mrp: 275,
    salePrice: 245,
    stock: 18,
    unit: 'Pack',
    taxRate: 18,
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&q=80',
  },
  {
    id: 'prod_7',
    name: 'India Gate Basmati Rice Classic (5kg)',
    sku: 'ING-BAS-5KG',
    barcode: '8901030070074',
    category: 'Groceries & Staples',
    mrp: 580,
    salePrice: 510,
    stock: 35,
    unit: '5 kg',
    taxRate: 5,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&q=80',
  },
  {
    id: 'prod_8',
    name: 'Surf Excel Matic Top Load Detergent Liquid (2L Refill)',
    sku: 'SURF-LIQ-2L',
    barcode: '8901030080081',
    category: 'Household & Cleaning',
    mrp: 460,
    salePrice: 410,
    stock: 25,
    unit: '2 Litre',
    taxRate: 18,
    image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=200&q=80',
  },
  {
    id: 'prod_9',
    name: 'Nescafe Classic Instant Coffee Jar (100g Glass Jar)',
    sku: 'NES-COF-100G',
    barcode: '8901030090098',
    category: 'Beverages',
    mrp: 290,
    salePrice: 265,
    stock: 40,
    unit: '100g Jar',
    taxRate: 18,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&q=80',
  },
  {
    id: 'prod_10',
    name: 'Dettol Original Germ Protection Liquid Handwash (750ml Refill)',
    sku: 'DET-HW-750ML',
    barcode: '8901030100103',
    category: 'Personal Care & Hygiene',
    mrp: 149,
    salePrice: 129,
    stock: 50,
    unit: '750ml Refill',
    taxRate: 18,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80',
  },
  {
    id: 'prod_11',
    name: 'Haldiram Nagpur Alu Bhujia Spicy Namkeen (400g Pouch)',
    sku: 'HAL-ALU-400G',
    barcode: '8901030110110',
    category: 'Snacks & Confectionery',
    mrp: 120,
    salePrice: 105,
    stock: 65,
    unit: '400g',
    taxRate: 12,
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&q=80',
  },
  {
    id: 'prod_12',
    name: 'Real Mixed Fruit Juice 100% Nectar (1L Tetra Pack)',
    sku: 'REA-JUC-1L',
    barcode: '8901030120127',
    category: 'Beverages',
    mrp: 135,
    salePrice: 119,
    stock: 42,
    unit: '1 Litre',
    taxRate: 12,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200&q=80',
  },
];

export const posService = {
  /**
   * 1. Get Stores / Warehouses
   */
  async getStores() {
    try {
      const res = await API.get('/pos/stores');
      if (res.data?.success && res.data.stores?.length > 0) {
        return res.data.stores;
      }
    } catch {
      // Backend unavailable - use fallbacks
    }
    return FALLBACK_STORES;
  },

  /**
   * 2. Search Products
   */
  async getProducts({ search = '', category = 'All', storeId = '' } = {}) {
    try {
      const res = await API.get('/pos/products', {
        params: { search, category, storeId, limit: 100 },
      });
      if (res.data?.success && Array.isArray(res.data.products) && res.data.products.length > 0) {
        return {
          products: res.data.products,
          categories: res.data.categories || [],
        };
      }
    } catch {
      // Backend unavailable - search fallbacks
    }

    let filtered = [...FALLBACK_PRODUCTS];
    if (category && category !== 'All') {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }

    const categories = ['All', ...new Set(FALLBACK_PRODUCTS.map((p) => p.category))];
    return { products: filtered, categories };
  },

  /**
   * 3. Search Customers
   */
  async searchCustomers(query = '') {
    try {
      const res = await API.get('/pos/customers', { params: { query } });
      if (res.data?.success && Array.isArray(res.data.customers)) {
        return res.data.customers;
      }
    } catch {
      // Backend unavailable - use local customers
    }

    const stored = getStoredCustomers();
    if (!query || !query.trim()) return stored;
    const q = query.trim().toLowerCase();
    return stored.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  },

  /**
   * 4. Quick-Create Customer
   */
  async createCustomer(data) {
    try {
      const res = await API.post('/pos/customers', data);
      if (res.data?.success && res.data.customer) {
        return res.data.customer;
      }
    } catch {
      // Fallback
    }

    const customers = getStoredCustomers();
    const newCust = {
      id: `cust_${Date.now()}`,
      name: data.name || 'Walk-in Customer',
      phone: data.phone,
      email: data.email || '',
      addresses: data.address?.addressLine1
        ? [
            {
              fullName: data.name || 'Customer',
              phone: data.phone,
              addressLine1: data.address.addressLine1,
              addressLine2: data.address.addressLine2 || '',
              city: data.address.city || 'Indore',
              state: data.address.state || 'Madhya Pradesh',
              pincode: data.address.pincode || '452001',
            },
          ]
        : [],
    };
    customers.push(newCust);
    try {
      localStorage.setItem(POS_CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error(e);
    }
    return newCust;
  },

  /**
   * 5. Server-Side Bill Calculation
   */
  async calculateBill(payload) {
    try {
      const res = await API.post('/pos/calculate', payload);
      if (res.data?.success && res.data.breakdown) {
        return res.data.breakdown;
      }
    } catch {
      // Fallback local calculation
    }

    const { items = [], billDiscountPercent = 0, saleType = 'COUNTER_SALE' } = payload;
    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let taxableAmount = 0;
    let totalTax = 0;

    const calculatedItems = items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.salePrice) || 0;
      const discPct = Number(it.discountPercent) || 0;
      const taxPct = Number(it.taxRate) || 5;

      const gross = qty * unitPrice;
      const discVal = (gross * discPct) / 100;
      const netTaxable = gross - discVal;
      const taxVal = (netTaxable * taxPct) / 100;
      const lineTotal = netTaxable + taxVal;

      subtotal += gross;
      itemDiscountsTotal += discVal;
      taxableAmount += netTaxable;
      totalTax += taxVal;

      return {
        ...it,
        quantity: qty,
        salePrice: unitPrice,
        discountPercent: discPct,
        discountAmount: discVal,
        taxRate: taxPct,
        taxAmount: taxVal,
        lineTotal,
      };
    });

    const billDiscVal = (taxableAmount * (Number(billDiscountPercent) || 0)) / 100;
    const netTaxableTotal = Math.max(0, taxableAmount - billDiscVal);
    const deliveryCharge = saleType === 'DELIVERY_ORDER' ? 35 : 0;
    const grandTotal = Math.round((netTaxableTotal + totalTax + deliveryCharge) * 100) / 100;

    return {
      items: calculatedItems,
      subtotal,
      itemDiscountsTotal,
      billDiscountPercent: Number(billDiscountPercent) || 0,
      billDiscountAmount: billDiscVal,
      taxableAmount: netTaxableTotal,
      totalTax,
      deliveryCharge,
      grandTotal,
    };
  },

  /**
   * 6. Complete Counter Sale
   */
  async completeCounterSale(saleData) {
    try {
      const res = await API.post('/pos/counter-sale', saleData);
      if (res.data?.success) {
        // Also keep a copy in local storage for offline view
        const stored = getStoredSales();
        stored.unshift(res.data.sale);
        saveStoredSales(stored.slice(0, 100));
        return res.data;
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        throw new Error(err.response?.data?.message || 'Transaction validation failed.');
      }
      // If server is not reachable, record locally as emergency offline POS sale
    }

    const year = new Date().getFullYear();
    const stored = getStoredSales();
    const invoiceNumber = `POS-${year}-${String(stored.length + 1).padStart(5, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const localSale = {
      _id: `pos_${Date.now()}`,
      invoiceNumber,
      saleType: 'COUNTER_SALE',
      status: 'COMPLETED',
      store: saleData.store,
      customer: saleData.customer,
      items: saleData.items,
      subtotal: saleData.subtotal,
      itemDiscountsTotal: saleData.itemDiscountsTotal,
      billDiscountPercent: saleData.billDiscountPercent,
      billDiscountAmount: saleData.billDiscountAmount,
      taxableAmount: saleData.taxableAmount,
      gstTotal: saleData.gstTotal,
      cgstAmount: saleData.cgstAmount,
      sgstAmount: saleData.sgstAmount,
      igstAmount: saleData.igstAmount,
      deliveryCharge: 0,
      grandTotal: saleData.grandTotal,
      payment: saleData.payment,
      createdBy: { name: 'Super Admin (Offline Cache)' },
      createdAt: new Date().toISOString(),
    };

    stored.unshift(localSale);
    saveStoredSales(stored);

    return {
      success: true,
      message: 'Counter Sale completed successfully.',
      invoiceNumber,
      sale: localSale,
    };
  },

  /**
   * 7. Create Delivery Order via POS
   */
  async createPosDeliveryOrder(orderData) {
    try {
      const res = await API.post('/pos/delivery-order', orderData);
      if (res.data?.success) {
        const stored = getStoredSales();
        stored.unshift(res.data.sale);
        saveStoredSales(stored.slice(0, 100));
        return res.data;
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        throw new Error(err.response?.data?.message || 'Delivery order validation failed.');
      }
    }

    const timestamp = Date.now().toString().slice(-6);
    const orderId = `ORD-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    const year = new Date().getFullYear();
    const stored = getStoredSales();
    const invoiceNumber = `POS-${year}-${String(stored.length + 1).padStart(5, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const localSale = {
      _id: `pos_${Date.now()}`,
      invoiceNumber,
      saleType: 'DELIVERY_ORDER',
      status: 'COMPLETED',
      orderId,
      store: orderData.store,
      customer: orderData.customer,
      items: orderData.items,
      subtotal: orderData.subtotal,
      itemDiscountsTotal: orderData.itemDiscountsTotal,
      billDiscountPercent: orderData.billDiscountPercent,
      billDiscountAmount: orderData.billDiscountAmount,
      taxableAmount: orderData.taxableAmount,
      gstTotal: orderData.gstTotal,
      cgstAmount: orderData.cgstAmount,
      sgstAmount: orderData.sgstAmount,
      igstAmount: orderData.igstAmount,
      deliveryCharge: orderData.deliveryCharge || 35,
      grandTotal: orderData.grandTotal,
      payment: orderData.payment,
      deliverySlot: orderData.deliverySlot || 'Standard Delivery (20-30 mins)',
      createdBy: { name: 'Super Admin (Offline Cache)' },
      createdAt: new Date().toISOString(),
    };

    stored.unshift(localSale);
    saveStoredSales(stored);

    return {
      success: true,
      message: 'Delivery Order placed successfully via POS.',
      orderId,
      invoiceNumber,
      sale: localSale,
    };
  },

  /**
   * 8. Hold Bill
   */
  async holdBill(payload) {
    try {
      const res = await API.post('/pos/hold', payload);
      if (res.data?.success) {
        return res.data;
      }
    } catch {
      // Local fallback
    }

    const bills = getStoredHeldBills();
    const id = payload.id || `held_${Date.now()}`;
    const newBill = {
      _id: id,
      heldLabel: payload.heldLabel || `Held Bill #${Date.now().toString().slice(-4)}`,
      heldAt: new Date().toISOString(),
      store: payload.store,
      customer: payload.customer,
      items: payload.items,
      subtotal: payload.subtotal,
      billDiscountPercent: payload.billDiscountPercent,
      grandTotal: payload.grandTotal,
      saleType: payload.saleType || 'COUNTER_SALE',
    };

    const idx = bills.findIndex((b) => b._id === id);
    if (idx >= 0) {
      bills[idx] = newBill;
    } else {
      bills.unshift(newBill);
    }
    saveStoredHeldBills(bills);

    return {
      success: true,
      message: 'Bill successfully held in local queue.',
      heldBill: newBill,
    };
  },

  /**
   * 9. Get Held Bills
   */
  async getHeldBills() {
    try {
      const res = await API.get('/pos/hold');
      if (res.data?.success && Array.isArray(res.data.bills)) {
        return res.data.bills;
      }
    } catch {
      // Local fallback
    }
    return getStoredHeldBills();
  },

  /**
   * 10. Delete Held Bill
   */
  async deleteHeldBill(id) {
    try {
      await API.delete(`/pos/hold/${id}`);
    } catch {
      // Ignore network errors
    }
    const bills = getStoredHeldBills().filter((b) => b._id !== id);
    saveStoredHeldBills(bills);
    return { success: true };
  },

  /**
   * 11. POS History with Filters
   */
  async getPosHistory(params = {}) {
    try {
      const res = await API.get('/pos/history', { params });
      if (res.data?.success) {
        return res.data;
      }
    } catch {
      // Local fallback
    }

    let sales = getStoredSales();
    const { saleType, paymentStatus, paymentMethod, search } = params;

    if (saleType && saleType !== 'ALL') {
      sales = sales.filter((s) => s.saleType === saleType);
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      sales = sales.filter((s) => s.payment?.status === paymentStatus);
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      sales = sales.filter((s) => s.payment?.method === paymentMethod);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      sales = sales.filter(
        (s) =>
          s.invoiceNumber?.toLowerCase().includes(q) ||
          s.orderId?.toLowerCase().includes(q) ||
          s.customer?.name?.toLowerCase().includes(q) ||
          s.customer?.phone?.includes(q)
      );
    }

    return {
      success: true,
      total: sales.length,
      page: 1,
      pages: 1,
      sales,
    };
  },

  /**
   * 12. POS Dashboard Summary
   */
  async getDashboardSummary() {
    try {
      const res = await API.get('/pos/dashboard-summary');
      if (res.data?.success && res.data.metrics) {
        return res.data.metrics;
      }
    } catch {
      // Compute from stored sales
    }

    const sales = getStoredSales();
    const held = getStoredHeldBills();

    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.createdAt?.startsWith(todayStr));

    const todayTotal = todaySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
    const counterSales = sales.filter((s) => s.saleType === 'COUNTER_SALE');
    const counterTotal = counterSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

    const deliverySales = sales.filter((s) => s.saleType === 'DELIVERY_ORDER');
    const deliveryTotal = deliverySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

    const pendingBalance = sales.reduce(
      (acc, s) => (s.payment?.status !== 'PAID' ? acc + (s.payment?.balanceDue || 0) : acc),
      0
    );

    return {
      todaySales: todayTotal,
      todayTransactionsCount: todaySales.length,
      counterSalesTotal: counterTotal,
      counterSalesCount: counterSales.length,
      deliveryOrdersTotal: deliveryTotal,
      deliveryOrdersCount: deliverySales.length,
      pendingBalanceDue: pendingBalance,
      pendingPaymentsCount: sales.filter((s) => s.payment?.status !== 'PAID').length,
      heldBillsCount: held.length,
    };
  },
};

export default posService;
