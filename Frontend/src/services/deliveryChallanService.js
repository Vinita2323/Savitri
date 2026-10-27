import API from './api';

export const deliveryChallanService = {
  /**
   * Get next sequential unique Challan Number (e.g. DC-2026-0001)
   */
  async getNextChallanNumber() {
    const res = await API.get('/delivery-challans/next-number');
    return res.data;
  },

  /**
   * Fetch registered clients / customers
   * @param {string} search
   * @param {number} limit
   */
  async getClients(search = '', limit = 100) {
    const res = await API.get('/delivery-challans/clients', {
      params: { search, limit },
    });
    return res.data;
  },

  /**
   * Fetch orders for a client that are eligible for dispatch
   * @param {string} clientId
   */
  async getEligibleOrders(clientId) {
    const res = await API.get(`/delivery-challans/clients/${clientId}/eligible-orders`);
    return res.data;
  },

  /**
   * Fetch item-level dispatch balances and summary for an order
   * @param {string} orderId
   */
  async getOrderDispatchSummary(orderId) {
    const res = await API.get(`/delivery-challans/orders/${orderId}/dispatch-summary`);
    return res.data;
  },

  /**
   * Fetch paginated delivery challan list with filters
   * @param {Object} params
   */
  async getChallans(params = {}) {
    const res = await API.get('/delivery-challans', { params });
    return res.data;
  },

  /**
   * Get full details of a single challan
   * @param {string} id
   */
  async getChallanById(id) {
    const res = await API.get(`/delivery-challans/${id}`);
    return res.data;
  },

  /**
   * Create a new delivery challan (Draft or Dispatched)
   * @param {Object} data
   */
  async createChallan(data) {
    const res = await API.post('/delivery-challans', data);
    return res.data;
  },

  /**
   * Update a draft delivery challan
   * @param {string} id
   * @param {Object} data
   */
  async updateChallan(id, data) {
    const res = await API.put(`/delivery-challans/${id}`, data);
    return res.data;
  },

  /**
   * Finalize a draft to Dispatched
   * @param {string} id
   */
  async finalizeChallan(id) {
    const res = await API.post(`/delivery-challans/${id}/finalize`);
    return res.data;
  },

  /**
   * Update delivery confirmation status (Partially Delivered, Delivered)
   * @param {string} id
   * @param {Object} data
   */
  async updateStatus(id, data) {
    const res = await API.post(`/delivery-challans/${id}/status`, data);
    return res.data;
  },

  /**
   * Cancel a delivery challan
   * @param {string} id
   * @param {string} reason
   */
  async cancelChallan(id, reason) {
    const res = await API.post(`/delivery-challans/${id}/cancel`, { reason });
    return res.data;
  },
};

export default deliveryChallanService;
