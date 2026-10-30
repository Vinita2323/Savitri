import API from './api';

export const superAdminService = {
  // Authentication
  login: async (credentials) => {
    const response = await API.post('/auth/super-admin/login', credentials);
    if (response.data?.success && response.data.token) {
      localStorage.setItem('shippnex_super_admin_token', response.data.token);
      localStorage.setItem('shippnex_admin_token', response.data.token);
      if (response.data.superAdmin) {
        localStorage.setItem('shippnex_super_admin_data', JSON.stringify(response.data.superAdmin));
        localStorage.setItem('shippnex_admin_data', JSON.stringify(response.data.superAdmin));
      }
      localStorage.setItem('shippnex_super_admin_session', '1');
      localStorage.setItem('shippnex_admin_session', '1');
    }
    return response.data;
  },
  getProfile: async () => {
    const response = await API.get('/auth/super-admin/me');
    return response.data;
  },

  // Financial Dashboard Live Metrics
  getDashboardMetrics: async (params = {}) => {
    const response = await API.get('/super-admin/dashboard/metrics', { params });
    return response.data;
  },

  // Central Ledger Transactions
  getTransactions: async (params = {}) => {
    const response = await API.get('/super-admin/transactions', { params });
    return response.data;
  },

  // Payout Management
  getPayouts: async (params = {}) => {
    const response = await API.get('/super-admin/payouts', { params });
    return response.data;
  },
  getPayoutById: async (id) => {
    const response = await API.get(`/super-admin/payouts/${id}`);
    return response.data;
  },
  approvePayout: async (id, payload = {}) => {
    const response = await API.put(`/super-admin/payouts/${id}/approve`, payload);
    return response.data;
  },
  rejectPayout: async (id, payload) => {
    const response = await API.put(`/super-admin/payouts/${id}/reject`, payload);
    return response.data;
  },
  processPayout: async (id, payload) => {
    const response = await API.put(`/super-admin/payouts/${id}/process`, payload);
    return response.data;
  },

  // Settlements
  getSellerSettlements: async (params = {}) => {
    const response = await API.get('/super-admin/settlements/sellers', { params });
    return response.data;
  },
  getCaptainSettlements: async (params = {}) => {
    const response = await API.get('/super-admin/settlements/captains', { params });
    return response.data;
  },

  // Brands & Multi-Region Management
  getBrands: async () => {
    const response = await API.get('/super-admin/brands');
    return response.data;
  },
  getBrandById: async (id) => {
    const response = await API.get(`/super-admin/brands/${id}`);
    return response.data;
  },
  createBrand: async (payload) => {
    const response = await API.post('/super-admin/brands', payload);
    return response.data;
  },
  updateBrand: async (id, payload) => {
    const response = await API.put(`/super-admin/brands/${id}`, payload);
    return response.data;
  },

  // Commission Management
  getCommissions: async (params = {}) => {
    const response = await API.get('/super-admin/commissions', { params });
    return response.data;
  },
  updateSellerCommission: async (sellerId, payload) => {
    const response = await API.put(`/super-admin/sellers/${sellerId}/commission`, payload);
    return response.data;
  },

  // Financial Adjustments
  getFinancialAdjustments: async (params = {}) => {
    const response = await API.get('/super-admin/financial-adjustments', { params });
    return response.data;
  },
  createFinancialAdjustment: async (payload) => {
    const response = await API.post('/super-admin/financial-adjustments', payload);
    return response.data;
  },

  // Refunds
  getRefunds: async (params = {}) => {
    const response = await API.get('/super-admin/refunds', { params });
    return response.data;
  },
  processRefund: async (id, payload) => {
    const response = await API.put(`/super-admin/refunds/${id}/process`, payload);
    return response.data;
  },

  // Reports
  getReports: async (params = {}) => {
    const response = await API.get('/super-admin/reports', { params });
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    const response = await API.get('/super-admin/audit-logs', { params });
    return response.data;
  },

  // Stores & Sellers (Scoped)
  getStores: async (params = {}) => {
    const response = await API.get('/super-admin/stores', { params });
    return response.data;
  },
  getStoreById: async (id, params = {}) => {
    const response = await API.get(`/super-admin/stores/${id}`, { params });
    return response.data;
  },

  // Inventory Control (Scoped)
  getInventory: async (params = {}) => {
    const response = await API.get('/super-admin/inventory', { params });
    return response.data;
  },
  adjustInventoryStock: async (payload) => {
    const response = await API.post('/super-admin/inventory/adjust', payload);
    return response.data;
  },

  // Delivery Partners & Captains (Scoped)
  getDeliveryPartners: async (params = {}) => {
    const response = await API.get('/super-admin/delivery-partners', { params });
    return response.data;
  },

  // Business Brands Management
  getBrands: async (params = {}) => {
    const response = await API.get('/super-admin/brands', { params });
    return response.data;
  },
  getBrandById: async (id) => {
    const response = await API.get(`/super-admin/brands/${id}`);
    return response.data;
  },
  createBrand: async (payload) => {
    const response = await API.post('/super-admin/brands', payload);
    return response.data;
  },
  updateBrand: async (id, payload) => {
    const response = await API.put(`/super-admin/brands/${id}`, payload);
    return response.data;
  },
  toggleBrandStatus: async (id, status) => {
    const response = await API.patch(`/super-admin/brands/${id}/status`, { status });
    return response.data;
  },
  deleteBrand: async (id) => {
    const response = await API.delete(`/super-admin/brands/${id}`);
    return response.data;
  },
};
