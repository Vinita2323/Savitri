import API from './api';

/**
 * Admin / Super Admin payroll API. Every amount is an integer number of PAISE on the wire (never a float);
 * amounts typed by the user travel as text ("1234.50") and are parsed exactly by the server.
 * The brand scope travels as ?brandId= (the server validates it against what the user may access).
 */
const unwrap = (promise, fallback) =>
  promise.then((res) => res.data).catch((err) => {
    throw Object.assign(new Error(err.response?.data?.message || fallback || err.message || 'Request failed'), { status: err.response?.status });
  });

const scope = (brandId, extra = {}) => {
  const params = { ...extra };
  if (brandId && brandId !== 'ALL') params.brandId = brandId;
  Object.keys(params).forEach((k) => (params[k] === '' || params[k] === undefined || params[k] === null) && delete params[k]);
  return { params };
};

const P = '/payroll';

/** Save a binary response (PDF / Excel) through the browser. The authenticated request is made by axios, so no token is ever put in a URL. */
export const saveBlob = (res, fallbackName) => {
  const cd = res.headers?.['content-disposition'] || '';
  const m = /filename="?([^";]+)"?/i.exec(cd);
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = m ? m[1] : fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const blobError = async (err) => {
  // an error answered to a blob request arrives as a Blob: read the message out of it
  try {
    const t = await err.response?.data?.text?.();
    const j = t ? JSON.parse(t) : null;
    return new Error(j?.message || 'Download failed');
  } catch { return new Error('Download failed'); }
};

export const payrollService = {
  policy: (b) => unwrap(API.get(`${P}/policy`, scope(b)), 'Could not load the payroll policy'),
  savePolicy: (b, body) => unwrap(API.put(`${P}/policy`, body, scope(b)), 'Could not save the payroll policy'),
  dashboard: (b, params) => unwrap(API.get(`${P}/dashboard`, scope(b, params)), 'Could not load the payroll dashboard'),
  nextPeriod: (b, params) => unwrap(API.get(`${P}/next-period`, scope(b, params)), 'Could not suggest a period'),

  salaryList: (b, params) => unwrap(API.get(`${P}/salary`, scope(b, params)), 'Could not load salary setup'),
  getSalary: (b, id) => unwrap(API.get(`${P}/salary/${id}`, scope(b)), 'Could not load the salary'),
  saveSalary: (b, id, body) => unwrap(API.put(`${P}/salary/${id}`, body, scope(b)), 'Could not save the salary'),

  adjustments: (b, params) => unwrap(API.get(`${P}/adjustments`, scope(b, params)), 'Could not load adjustments'),
  createAdjustment: (b, body) => unwrap(API.post(`${P}/adjustments`, body, scope(b)), 'Could not save the entry'),
  cancelAdjustment: (b, id, reason) => unwrap(API.post(`${P}/adjustments/${id}/cancel`, { reason }, scope(b)), 'Could not cancel the entry'),

  preview: (b, body) => unwrap(API.post(`${P}/payrolls/preview`, body, scope(b)), 'Could not calculate'),
  generate: (b, body) => unwrap(API.post(`${P}/payrolls/generate`, body, scope(b)), 'Could not generate payroll'),
  payrolls: (b, params) => unwrap(API.get(`${P}/payrolls`, scope(b, params)), 'Could not load payrolls'),
  payroll: (b, id) => unwrap(API.get(`${P}/payrolls/${id}`, scope(b)), 'Could not load the payroll'),
  recalculate: (b, id) => unwrap(API.post(`${P}/payrolls/${id}/recalculate`, {}, scope(b)), 'Could not recalculate'),
  setOvertime: (b, id, minutes) => unwrap(API.put(`${P}/payrolls/${id}/overtime`, { minutes }, scope(b)), 'Could not save overtime'),
  addAdjustment: (b, id, body) => unwrap(API.post(`${P}/payrolls/${id}/adjustments`, body, scope(b)), 'Could not add the entry'),
  removeAdjustment: (b, id, adjId) => unwrap(API.delete(`${P}/payrolls/${id}/adjustments/${adjId}`, scope(b)), 'Could not remove the entry'),
  submit: (b, id) => unwrap(API.post(`${P}/payrolls/${id}/submit`, {}, scope(b)), 'Could not submit'),
  approve: (b, id) => unwrap(API.post(`${P}/payrolls/${id}/approve`, {}, scope(b)), 'Could not approve'),
  reject: (b, id, reason) => unwrap(API.post(`${P}/payrolls/${id}/reject`, { reason }, scope(b)), 'Could not send back'),
  cancel: (b, id, reason) => unwrap(API.post(`${P}/payrolls/${id}/cancel`, { reason }, scope(b)), 'Could not cancel'),
  pay: (b, id, body) => unwrap(API.post(`${P}/payrolls/${id}/payments`, body, scope(b)), 'Could not record the payment'),
  reversePayment: (b, paymentId, reason) => unwrap(API.post(`${P}/payments/${paymentId}/reverse`, { reason }, scope(b)), 'Could not reverse the payment'),
  payments: (b, params) => unwrap(API.get(`${P}/payments`, scope(b, params)), 'Could not load payments'),

  report: (b, type, params) => unwrap(API.get(`${P}/reports/${type}`, scope(b, params)), 'Could not load the report'),
  audit: (b, params) => unwrap(API.get(`${P}/audit`, scope(b, params)), 'Could not load the audit trail'),

  downloadSlip: async (b, id) => {
    try { saveBlob(await API.get(`${P}/payrolls/${id}/slip`, { ...scope(b), responseType: 'blob' }), 'salary-slip.pdf'); } catch (e) { throw await blobError(e); }
  },
  downloadReport: async (b, type, params, format) => {
    try { saveBlob(await API.get(`${P}/reports/${type}`, { ...scope(b, { ...params, format }), responseType: 'blob' }), `${type}-report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`); } catch (e) { throw await blobError(e); }
  },
};

export default payrollService;
