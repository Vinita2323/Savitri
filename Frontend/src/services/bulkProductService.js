import API from './api';

const unwrap = (promise, fallback) =>
  promise.then((r) => r.data).catch((err) => {
    const e = new Error(err.response?.data?.message || fallback || err.message || 'Request failed');
    e.status = err.response?.status;
    e.data = err.response?.data;
    throw e;
  });

/** Download a file from an authenticated endpoint (the browser cannot attach the login token to a plain link). */
const download = async (url, params, fallbackName) => {
  try {
    const res = await API.get(url, { params, responseType: 'blob', timeout: 120000 });
    const cd = res.headers?.['content-disposition'] || '';
    const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] || fallbackName;
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch (err) {
    let message = 'Download failed';
    try { message = JSON.parse(await err.response.data.text()).message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
};

const P = '/bulk-products';

/** Seller bulk upload. The seller is always the logged-in user; nothing about the seller is sent. */
export const bulkProductService = {
  downloadTemplate: (format = 'xlsx') => download(`${P}/template`, { format }, `product-bulk-upload-template.${format}`),
  upload: ({ file, images, mode }, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    if (images) fd.append('images', images);
    fd.append('mode', mode);
    return unwrap(
      API.post(P, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15 * 60 * 1000,
        onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
      }),
      'Upload failed'
    );
  },
  status: (id) => unwrap(API.get(`${P}/${id}`), 'Could not load the upload').then((d) => d.import),
  rows: (id, params = {}) => unwrap(API.get(`${P}/${id}/rows`, { params }), 'Could not load rows'),
  startImport: (id) => unwrap(API.post(`${P}/${id}/import`), 'Could not start the import'),
  discard: (id) => unwrap(API.delete(`${P}/${id}`), 'Could not discard the upload'),
  history: (params = {}) => unwrap(API.get(P, { params }), 'Could not load the history'),
  downloadFailed: (id, format = 'csv') => download(`${P}/${id}/failed`, { format }, `failed-rows.${format}`),
  bulkUpdate: (ids, updates) => unwrap(API.post('/products/bulk-update', { ids, updates }), 'Bulk update failed'),
};

/** Admin / Super Admin side: history of every seller's uploads, reports and product moderation. */
export const catalogAdminService = {
  imports: (params = {}) => unwrap(API.get(`${P}/admin/list`, { params }), 'Could not load uploads'),
  importDetail: (id) => unwrap(API.get(`${P}/admin/${id}`), 'Could not load the upload'),
  downloadReport: (id, format = 'csv') => download(`${P}/admin/${id}/report`, { format }, `import-report.${format}`),
  products: (params = {}) => unwrap(API.get('/products', { params: { admin: 'true', ...params } }), 'Could not load products'),
  moderate: (id, action, reason) => unwrap(API.patch(`/products/${id}/moderation`, { action, reason }), 'Could not update the product'),
  sellers: () => unwrap(API.get('/sellers', { params: { limit: 500 } }), 'Could not load sellers'),
};

export default bulkProductService;
