import API from './api';

/**
 * Cash & Bank treasury API client. Brand scope and the Bearer token are attached by the shared API client;
 * brandId / createdBy are never sent - the server derives them from the session.
 */
const unwrap = (p) => p.then((r) => r.data);

export const treasuryService = {
  getDashboard: (params = {}) => unwrap(API.get('/treasury/dashboard', { params })),
  getAccounts: () => unwrap(API.get('/treasury/accounts')),
  createAccount: (data) => unwrap(API.post('/treasury/accounts', data)),
  updateAccount: (id, data) => unwrap(API.put(`/treasury/accounts/${id}`, data)),
  setAccountStatus: (id, isActive) => unwrap(API.patch(`/treasury/accounts/${id}/status`, { isActive })),
  getAccountTransactions: (id, params = {}) => unwrap(API.get(`/treasury/accounts/${id}/transactions`, { params })),

  addReduceMoney: (data) => unwrap(API.post('/treasury/journal/manual', data)),
  transfer: (data) => unwrap(API.post('/treasury/journal/transfer', data)),
  reverseEntry: (id, reason) => unwrap(API.post(`/treasury/journal/${id}/reverse`, { reason })),

  getUnlinked: (params = {}) => unwrap(API.get('/treasury/unlinked', { params })),
  addStatementLine: (data) => unwrap(API.post('/treasury/unlinked', data)),
  importStatementLines: (data) => unwrap(API.post('/treasury/unlinked/import', data)),
  linkUnlinked: (id, data) => unwrap(API.post(`/treasury/unlinked/${id}/link`, data)),
  ignoreUnlinked: (id, reason) => unwrap(API.post(`/treasury/unlinked/${id}/ignore`, { reason })),

  getGatewayPayments: (params = {}) => unwrap(API.get('/treasury/razorpay/payments', { params })),
  getSettlements: (params = {}) => unwrap(API.get('/treasury/razorpay/settlements', { params })),
  syncSettlements: (data = {}) => unwrap(API.post('/treasury/razorpay/settlements/sync', data)),
  postSettlement: (id, destinationAccountId) => unwrap(API.post(`/treasury/razorpay/settlements/${id}/post`, { destinationAccountId })),
  matchSettlement: (id, statementId) => unwrap(API.post(`/treasury/razorpay/settlements/${id}/match`, { statementId })),
  unmatchSettlement: (id) => unwrap(API.post(`/treasury/razorpay/settlements/${id}/unmatch`)),
  getReconciliation: () => unwrap(API.get('/treasury/razorpay/reconciliation')),
  autoReconcile: () => unwrap(API.post('/treasury/razorpay/reconciliation/auto')),
  syncRefund: (id) => unwrap(API.post(`/treasury/razorpay/refunds/${id}/sync`)),

  // Server-generated CSV / Excel downloads (authenticated)
  download: async (path, params, filename) => {
    const res = await API.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default treasuryService;
