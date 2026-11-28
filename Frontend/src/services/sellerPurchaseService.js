import API from './api';

// A seller's own stock purchases (restocks). The seller token is picked up from the /seller page path.
export const sellerPurchaseService = {
  list: async (params = {}) => (await API.get('/seller-purchases', { params })).data,
  suppliers: async () => (await API.get('/seller-purchases/suppliers')).data,
  create: async (payload) => (await API.post('/seller-purchases', payload)).data,
  cancel: async (id, reason = '') => (await API.put(`/seller-purchases/${id}/cancel`, { reason })).data,
  // Uploads an invoice file and returns { invoiceFile } to send with a purchase (or to attach later).
  uploadInvoice: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return (await API.post('/seller-purchases/invoice', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })).data;
  },
  setInvoice: async (id, invoiceFile) => (await API.put(`/seller-purchases/${id}/invoice`, { invoiceFile })).data,
};

export default sellerPurchaseService;
