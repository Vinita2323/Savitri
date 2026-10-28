import API from './api';
import { SAMPLE_PRODUCTS_CATALOG } from '../modules/admin/quotations/data/mockQuotations';

const PROFORMA_STORAGE_KEY = 'savitri_proforma_invoices';
const QUOTATION_STORAGE_KEY = 'savitri_mock_quotations';

const getStoredProformaInvoices = () => {
  try {
    const raw = localStorage.getItem(PROFORMA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getStoredQuotations = () => {
  try {
    const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const proformaInvoiceService = {
  /**
   * Get next sequential unique Proforma Number (e.g. PI-2026-0001)
   */
  async getNextProformaNumber() {
    try {
      const res = await API.get('/proforma-invoices/next-number');
      if (res.data?.proformaNumber) return res.data;
    } catch {
      // Backend unavailable - compute next number from localStorage
    }

    const currentYear = new Date().getFullYear();
    const prefix = `PI-${currentYear}-`;
    const invoices = getStoredProformaInvoices();
    const numbers = invoices
      .map((i) => i.proformaNumber || '')
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));

    const nextSeq = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return {
      success: true,
      proformaNumber: `${prefix}${String(nextSeq).padStart(4, '0')}`,
    };
  },

  /**
   * Fetch registered clients / customers
   */
  async getClients(search = '', limit = 100) {
    try {
      const res = await API.get('/proforma-invoices/clients', {
        params: { search, limit },
      });
      if (res.data?.clients) return res.data;
    } catch {
      // Fallback: derive actual clients from existing saved quotations
    }

    const quotes = getStoredQuotations();
    const clientMap = new Map();

    quotes.forEach((q) => {
      const b = q.buyer;
      if (!b) return;
      const key = b.organizationName || b.companyName || b.contactPerson;
      if (key && !clientMap.has(key)) {
        clientMap.set(key, {
          _id: `cli_${clientMap.size + 1}`,
          companyName: b.organizationName || b.companyName || '',
          name: b.contactPerson || '',
          phone: b.phone || '',
          email: b.email || '',
          gstin: b.gstin || '',
          pan: b.pan || '',
          billingAddress: b.billingAddress,
          shippingAddress: b.shippingAddress,
        });
      }
    });

    let clients = Array.from(clientMap.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      clients = clients.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    return {
      success: true,
      clients: clients.slice(0, limit),
    };
  },

  /**
   * Fetch products for line item selector
   */
  async getProducts(search = '', limit = 100) {
    try {
      const res = await API.get('/proforma-invoices/products', {
        params: { search, limit },
      });
      if (res.data?.products) return res.data;
    } catch {
      // Fallback: use actual product catalog
    }

    let products = SAMPLE_PRODUCTS_CATALOG.map((p, idx) => ({
      _id: `prod_${idx + 1}`,
      ...p,
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.hsn?.includes(q)
      );
    }

    return {
      success: true,
      products: products.slice(0, limit),
    };
  },

  /**
   * Fetch paginated Proforma Invoices with filters
   */
  async getProformaInvoices(params = {}) {
    try {
      const res = await API.get('/proforma-invoices', { params });
      return res.data;
    } catch {
      // Offline fallback will be handled by ProformaInvoiceContext directly
      throw new Error('Offline fallback');
    }
  },

  /**
   * Get single Proforma Invoice by ID or document number
   */
  async getProformaInvoiceById(id) {
    try {
      const res = await API.get(`/proforma-invoices/${id}`);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Create a new Proforma Invoice (Draft or Issued)
   */
  async createProformaInvoice(data) {
    try {
      const res = await API.post('/proforma-invoices', data);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Update an existing Draft Proforma Invoice
   */
  async updateProformaInvoice(id, data) {
    try {
      const res = await API.put(`/proforma-invoices/${id}`, data);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Send Proforma Invoice via Email with PDF attachment
   */
  async sendEmail(id, data) {
    try {
      const res = await API.post(`/proforma-invoices/${id}/send-email`, data);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Record client purchase order / commercial confirmation
   */
  async recordConfirmation(id, data) {
    try {
      const res = await API.post(`/proforma-invoices/${id}/record-confirmation`, data);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Record verified manual payment transaction
   */
  async recordPayment(id, data) {
    try {
      const res = await API.post(`/proforma-invoices/${id}/record-payment`, data);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Cancel a Proforma Invoice with reason
   */
  async cancelProformaInvoice(id, reason) {
    try {
      const res = await API.post(`/proforma-invoices/${id}/cancel`, { reason });
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Duplicate a Proforma Invoice into a new Draft
   */
  async duplicateProformaInvoice(id) {
    try {
      const res = await API.post(`/proforma-invoices/${id}/duplicate`);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },

  /**
   * Convert Proforma Invoice to Tax Invoice
   */
  async convertToInvoice(id) {
    try {
      const res = await API.post(`/proforma-invoices/${id}/convert-to-invoice`);
      return res.data;
    } catch {
      throw new Error('Offline fallback');
    }
  },
};

export default proformaInvoiceService;
