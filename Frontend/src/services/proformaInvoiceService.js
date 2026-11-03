import API from './api';

/**
 * Proforma Invoice API client.
 * Every call goes to the backend (brand scope + auth headers are attached by the shared API client).
 * There is deliberately NO browser/offline fallback: a failed request surfaces the server's error
 * (error.response.data.message) instead of silently saving data that only exists in this browser.
 */
export const proformaInvoiceService = {
  /** Preview of the next Proforma number (the real number is allocated by the server on save). */
  async getNextProformaNumber() {
    const res = await API.get('/proforma-invoices/next-number');
    return res.data;
  },

  /** Registered clients / customers. */
  async getClients(search = '', limit = 100) {
    const res = await API.get('/proforma-invoices/clients', { params: { search, limit } });
    return res.data;
  },

  /** Products for the line-item selector. */
  async getProducts(search = '', limit = 100) {
    const res = await API.get('/proforma-invoices/products', { params: { search, limit } });
    return res.data;
  },

  async getProformaInvoices(params = {}) {
    const res = await API.get('/proforma-invoices', { params });
    return res.data;
  },

  async getProformaInvoiceById(id) {
    const res = await API.get(`/proforma-invoices/${encodeURIComponent(id)}`);
    return res.data;
  },

  async createProformaInvoice(data) {
    const res = await API.post('/proforma-invoices', data);
    return res.data;
  },

  async updateProformaInvoice(id, data) {
    const res = await API.put(`/proforma-invoices/${encodeURIComponent(id)}`, data);
    return res.data;
  },

  async sendEmail(id, data) {
    const res = await API.post(`/proforma-invoices/${encodeURIComponent(id)}/send-email`, data);
    return res.data;
  },

  async recordConfirmation(id, data) {
    const res = await API.post(`/proforma-invoices/${encodeURIComponent(id)}/record-confirmation`, data);
    return res.data;
  },

  async recordPayment(id, data) {
    const res = await API.post(`/proforma-invoices/${encodeURIComponent(id)}/record-payment`, data);
    return res.data;
  },

  async cancelProformaInvoice(id, reason) {
    const res = await API.post(`/proforma-invoices/${encodeURIComponent(id)}/cancel`, { reason });
    return res.data;
  },

  async duplicateProformaInvoice(id) {
    const res = await API.post(`/proforma-invoices/${encodeURIComponent(id)}/duplicate`);
    return res.data;
  },

  async convertToInvoice(id) {
    const res = await API.post(`/proforma-invoices/${encodeURIComponent(id)}/convert-to-invoice`);
    return res.data;
  },
};

export default proformaInvoiceService;
