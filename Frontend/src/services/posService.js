import API from './api';

/**
 * POS billing. Everything comes from and goes to the server: there is no demo catalogue and no "offline" sale.
 * When the server cannot be reached or refuses a request, the call throws with a message the screen shows, so a bill can
 * never look completed (or a product look available) when it is not.
 */

// Earlier versions kept demo customers, held bills and "offline" sales in this browser. They were never real records.
try {
  ['savitri_pos_sales', 'savitri_pos_held_bills', 'savitri_pos_customers'].forEach((k) => localStorage.removeItem(k));
} catch { /* storage unavailable */ }

const failure = (err, fallback) => {
  if (err?.response) return new Error(err.response.data?.message || fallback);
  return new Error(`${fallback} The server could not be reached. Check the connection and try again.`);
};

/** Calls the API and returns the response body; throws a readable error when the call fails or reports no success. */
const call = async (request, fallback) => {
  let res;
  try {
    res = await request();
  } catch (err) {
    throw failure(err, fallback);
  }
  if (!res.data?.success) throw new Error(res.data?.message || fallback);
  return res.data;
};

export const posService = {
  /** Stores (sellers) of the selected brand. An empty list means the brand has no store yet. */
  async getStores() {
    const data = await call(() => API.get('/pos/stores'), 'Could not load the stores.');
    return data.stores || [];
  },

  /** Products of one store. An empty list means nothing matches: no demo products are ever shown. */
  async getProducts({ search = '', category = 'All', storeId = '' } = {}) {
    const data = await call(() => API.get('/pos/products', { params: { search, category, storeId, limit: 100 } }), 'Could not load the products.');
    return { products: Array.isArray(data.products) ? data.products : [], categories: data.categories || [] };
  },

  async searchCustomers(query = '') {
    const data = await call(() => API.get('/pos/customers', { params: { query } }), 'Could not search customers.');
    return Array.isArray(data.customers) ? data.customers : [];
  },

  async createCustomer(body) {
    const data = await call(() => API.post('/pos/customers', body), 'Could not save the customer.');
    return data.customer;
  },

  async calculateBill(payload) {
    const data = await call(() => API.post('/pos/calculate', payload), 'Could not calculate the bill.');
    return data.breakdown;
  },

  async completeCounterSale(saleData) {
    return call(() => API.post('/pos/counter-sale', saleData), 'The sale was not completed.');
  },

  async createPosDeliveryOrder(orderData) {
    return call(() => API.post('/pos/delivery-order', orderData), 'The delivery order was not created.');
  },

  async holdBill(payload) {
    return call(() => API.post('/pos/hold', payload), 'The bill was not put on hold.');
  },

  async getHeldBills() {
    const data = await call(() => API.get('/pos/hold'), 'Could not load held bills.');
    return Array.isArray(data.bills) ? data.bills : [];
  },

  async deleteHeldBill(id) {
    await call(() => API.delete(`/pos/hold/${id}`), 'The held bill was not removed.');
    return { success: true };
  },

  async getPosHistory(params = {}) {
    return call(() => API.get('/pos/history', { params }), 'Could not load the POS history.');
  },

  async getDashboardSummary() {
    const data = await call(() => API.get('/pos/dashboard-summary'), 'Could not load the POS summary.');
    return data.metrics || {};
  },
};

export default posService;
