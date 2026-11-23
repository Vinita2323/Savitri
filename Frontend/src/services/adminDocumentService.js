import API from './api';

const unwrap = (promise, fallback) =>
  promise.then((res) => res.data).catch((err) => {
    throw new Error(err.response?.data?.message || fallback || err.message || 'Request failed');
  });

const form = (fields, file) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
  if (file) fd.append('file', file);
  return fd;
};

/** The signed-in admin's own documents. The server only ever answers with the caller's documents. */
export const adminDocumentService = {
  list: () => unwrap(API.get('/admin/documents'), 'Could not load your documents'),
  create: (fields, file, onProgress) =>
    unwrap(API.post('/admin/documents', form(fields, file), { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000, onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0) }), 'Could not save the document'),
  update: (id, fields, file, onProgress) =>
    unwrap(API.put(`/admin/documents/${id}`, form(fields, file), { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000, onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0) }), 'Could not update the document'),
  remove: (id) => unwrap(API.delete(`/admin/documents/${id}`), 'Could not delete the document'),
  /** The file is fetched with the login token and shown from a temporary in-memory URL (no token ever appears in a link). */
  blob: async (id, download = false) => {
    try {
      const res = await API.get(`/admin/documents/${id}/file`, { params: download ? { download: 1 } : {}, responseType: 'blob' });
      return res.data;
    } catch (err) {
      let msg = 'Could not open the document';
      try { msg = JSON.parse(await err.response.data.text()).message || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
  },
};

export default adminDocumentService;
