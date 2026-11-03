/**
 * Thin server-side client for the Razorpay REST API calls the treasury needs
 * (refunds, settlements, settlement reconciliation). API secrets are read from the environment and
 * are only ever used here - they are never returned to a client or logged.
 *
 * The base URL defaults to https://api.razorpay.com. RAZORPAY_API_BASE_URL may point at a local test
 * double in development / automated tests; it is IGNORED in production so a stray variable can never
 * redirect real money calls.
 */
const baseUrl = () => {
  const override = process.env.RAZORPAY_API_BASE_URL;
  if (override && process.env.NODE_ENV !== 'production') return override.replace(/\/+$/, '');
  return 'https://api.razorpay.com';
};

export class GatewayError extends Error {
  constructor(message, { status = 502, code = '', retryable = false } = {}) {
    super(message);
    this.name = 'GatewayError';
    this.statusCode = status;
    this.gatewayCode = code;
    this.retryable = retryable;
  }
}

const credentials = () => {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new GatewayError('Razorpay is not configured on the server.', { status: 500 });
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
};

const call = async (method, path, { query, body, timeoutMs = 15000 } = {}) => {
  const url = new URL(baseUrl() + '/v1' + path);
  if (query) Object.entries(query).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, String(v)));
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: credentials(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    // Network failure / timeout: the outcome is UNKNOWN, so callers must not assume the call failed
    throw new GatewayError(`Could not reach Razorpay: ${e.message}`, { status: 504, code: 'NETWORK', retryable: true });
  }
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = json?.error || {};
    throw new GatewayError(err.description || `Razorpay returned HTTP ${res.status}`, {
      status: res.status >= 500 ? 502 : res.status,
      code: err.code || '',
      retryable: res.status >= 500,
    });
  }
  return json;
};

export const fetchPayment = (paymentId) => call('GET', `/payments/${encodeURIComponent(paymentId)}`);

export const listPaymentRefunds = (paymentId) => call('GET', `/payments/${encodeURIComponent(paymentId)}/refunds`, { query: { count: 100 } });

/** Initiates a (full or partial) refund. `notes.refund_request_id` lets us find it again if the response is lost. */
export const createRefund = (paymentId, { amountPaise, refundRequestId, speed = 'normal' }) =>
  call('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, {
    body: { amount: amountPaise, speed, receipt: refundRequestId, notes: { refund_request_id: refundRequestId } },
  });

export const fetchRefund = (refundId) => call('GET', `/refunds/${encodeURIComponent(refundId)}`);

export const listSettlements = ({ from, to, count = 100, skip = 0 } = {}) =>
  call('GET', '/settlements', { query: { from, to, count, skip } });

export const fetchSettlement = (settlementId) => call('GET', `/settlements/${encodeURIComponent(settlementId)}`);

/** Per-transaction settlement report for one day (payments, refunds and adjustments with fee and tax). */
export const fetchReconCombined = ({ year, month, day, count = 1000, skip = 0 }) =>
  call('GET', '/settlements/recon/combined', { query: { year, month, day, count, skip } });
