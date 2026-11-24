import API from './api';

/**
 * Admin purchases (stock bought for the admin's own store) and the READ-ONLY view of associated sellers' purchases.
 * Amounts are integer paise on the wire. The server decides who the admin is and which sellers are theirs.
 */
const unwrap = (promise, fallback) =>
  promise.then((res) => res.data).catch((err) => {
    const e = new Error(err.response?.data?.message || fallback || err.message || 'Request failed');
    e.status = err.response?.status;
    e.code = err.response?.data?.code;
    throw e;
  });
const clean = (p = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));
const B = '/admin-purchases';

const openBlob = async (url, download, fallbackName) => {
  try {
    const res = await API.get(url, { params: download ? { download: 1 } : {}, responseType: 'blob' });
    return res.data;
  } catch (err) {
    let msg = 'Could not open the file';
    try { msg = JSON.parse(await err.response.data.text()).message || msg; } catch { /* default */ }
    throw new Error(msg || fallbackName);
  }
};

export const adminPurchaseService = {
  dashboard: (params) => unwrap(API.get(`${B}/dashboard`, { params: clean(params) }), 'Could not load the dashboard'),
  products: (search) => unwrap(API.get(`${B}/products`, { params: clean({ search }) }), 'Could not load products'),
  quickAddProduct: (body) => unwrap(API.post(`${B}/products`, body), 'Could not add the product'),
  create: (body) => unwrap(API.post(B, body), 'Could not save the purchase'),
  list: (params) => unwrap(API.get(B, { params: clean(params) }), 'Could not load purchases'),
  get: (id) => unwrap(API.get(`${B}/${id}`), 'Could not load the purchase'),
  cancel: (id, reason) => unwrap(API.put(`${B}/${id}/cancel`, { reason }), 'Could not cancel the purchase'),
  stockUpdates: (params) => unwrap(API.get(`${B}/stock-updates`, { params: clean(params) }), 'Could not load stock updates'),
  uploadInvoice: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return unwrap(API.post(`${B}/invoice`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }), 'Could not upload the invoice');
  },
  invoiceBlob: (id, download = false) => openBlob(`${B}/${id}/invoice`, download),

  // read only
  sellers: () => unwrap(API.get(`${B}/sellers`), 'Could not load sellers'),
  sellerPurchases: (params) => unwrap(API.get(`${B}/sellers/purchases`, { params: clean(params) }), 'Could not load seller purchases'),
  sellerPurchase: (id) => unwrap(API.get(`${B}/sellers/purchases/${id}`), 'Could not load the purchase'),
  sellerSummary: (params) => unwrap(API.get(`${B}/sellers/summary`, { params: clean(params) }), 'Could not load the summary'),

  // Super Admin
  allAdminPurchases: (params) => unwrap(API.get(`${B}/all`, { params: clean(params) }), 'Could not load admin purchases'),
  adminPurchaseDetail: (id) => unwrap(API.get(`${B}/all/${id}`), 'Could not load the purchase'),
};

export default adminPurchaseService;
