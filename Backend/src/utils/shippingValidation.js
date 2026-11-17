// Phase 1 shipping helpers: validation of product shipping details and seller pickup address.
// Pure functions (no DB access) so controllers and tests can share them.

export const FULFILLMENT_TYPES = ['INSTANT', 'STANDARD', 'BOTH'];
export const PICKUP_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

/** Fields a client may send for product shipping. Everything else (e.g. shippingReady) is server-owned. */
export const PRODUCT_SHIPPING_FIELDS = [
  'shippingEnabled', 'fulfillmentType', 'weightKg', 'length', 'breadth', 'height',
  'countryOfOrigin', 'isFragile', 'requiresSpecialHandling',
];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

const MAX_WEIGHT_KG = 1000;
const MAX_DIM_CM = 500;

/**
 * Does a product (plain object / document) have everything a courier shipment needs?
 * Returns the list of missing/invalid items; empty list = shipping-ready.
 */
export const shippingReadinessProblems = (p = {}) => {
  const problems = [];
  const pos = (n) => Number.isFinite(Number(n)) && Number(n) > 0;
  if (!pos(p.weightKg)) problems.push('weight (kg) must be greater than 0');
  if (!pos(p.length)) problems.push('length (cm) must be greater than 0');
  if (!pos(p.breadth)) problems.push('breadth (cm) must be greater than 0');
  if (!pos(p.height)) problems.push('height (cm) must be greater than 0');
  return problems;
};

/**
 * Validate and normalise the shipping fields of a create/update body.
 * `existing` is the stored product on update (so a partial update is validated against the merged result).
 * Returns { errors: string[], set: object } where `set` holds only fields the client actually sent, plus the
 * server-computed `shippingReady`.
 */
export const normalizeProductShipping = (body = {}, existing = null) => {
  const errors = [];
  const set = {};
  const sent = (k) => Object.prototype.hasOwnProperty.call(body, k);
  if (!PRODUCT_SHIPPING_FIELDS.some(sent)) return { errors, set, touched: false };

  if (sent('shippingEnabled')) set.shippingEnabled = toBool(body.shippingEnabled);
  if (sent('isFragile')) set.isFragile = toBool(body.isFragile);
  if (sent('requiresSpecialHandling')) set.requiresSpecialHandling = toBool(body.requiresSpecialHandling);

  if (sent('fulfillmentType')) {
    const t = String(body.fulfillmentType || '').trim().toUpperCase();
    if (!FULFILLMENT_TYPES.includes(t)) errors.push(`fulfillmentType must be one of ${FULFILLMENT_TYPES.join(', ')}`);
    else set.fulfillmentType = t;
  }

  const numField = (key, label, max) => {
    if (!sent(key)) return;
    if (isBlank(body[key])) { set[key] = null; return; }
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n <= 0) errors.push(`${label} must be a positive number`);
    else if (n > max) errors.push(`${label} must not exceed ${max}`);
    else set[key] = Math.round(n * 1000) / 1000;
  };
  numField('weightKg', 'weight (kg)', MAX_WEIGHT_KG);
  numField('length', 'length (cm)', MAX_DIM_CM);
  numField('breadth', 'breadth (cm)', MAX_DIM_CM);
  numField('height', 'height (cm)', MAX_DIM_CM);

  // hsnCode is an existing field written by the existing create/update code; it is only format-checked below
  // when courier shipping is being enabled, so current free-text values keep working.
  if (sent('countryOfOrigin')) {
    const c = String(body.countryOfOrigin ?? '').trim();
    if (c.length > 60) errors.push('countryOfOrigin is too long');
    else set.countryOfOrigin = c;
  }

  // Merge with stored values to judge readiness
  const merged = { ...(existing && typeof existing.toObject === 'function' ? existing.toObject() : existing || {}), ...set };
  if (sent('hsnCode')) merged.hsnCode = String(body.hsnCode ?? '').trim();
  const type = merged.fulfillmentType || 'INSTANT';
  const wantsCourier = type === 'STANDARD' || type === 'BOTH';
  if (merged.shippingEnabled && wantsCourier) {
    const problems = shippingReadinessProblems(merged);
    if (problems.length) errors.push(`Cannot enable standard shipping: ${problems.join('; ')}`);
    if (merged.hsnCode && !/^\d{4,8}$/.test(merged.hsnCode)) errors.push('HSN code must be 4 to 8 digits');
  }
  set.shippingReady = Boolean(merged.shippingEnabled) && wantsCourier && shippingReadinessProblems(merged).length === 0;
  return { errors, set, touched: true };
};

/** Validate a seller pickup address. Returns { errors: string[], value: object } (value is the cleaned address). */
export const validatePickupAddress = (input = {}) => {
  const errors = [];
  const s = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
  const value = {
    contactPerson: s(input.contactPerson),
    phone: s(input.phone).replace(/\D/g, '').slice(-10),
    addressLine1: s(input.addressLine1),
    addressLine2: s(input.addressLine2),
    landmark: s(input.landmark),
    city: s(input.city),
    state: s(input.state),
    pincode: s(input.pincode),
    country: s(input.country) || 'India',
  };
  if (value.contactPerson.length < 2) errors.push('Contact person name is required');
  if (!/^[6-9]\d{9}$/.test(value.phone)) errors.push('A valid 10-digit Indian mobile number is required');
  if (value.addressLine1.length < 5) errors.push('Address line 1 is required (at least 5 characters)');
  if (!value.city) errors.push('City is required');
  if (!value.state) errors.push('State is required');
  if (!/^[1-9]\d{5}$/.test(value.pincode)) errors.push('PIN code must be a valid 6-digit Indian PIN code');
  if (value.country.toLowerCase() !== 'india') errors.push('Only addresses in India are supported');
  for (const k of ['contactPerson', 'addressLine1', 'addressLine2', 'landmark', 'city', 'state']) {
    if (value[k] && value[k].length > 200) errors.push(`${k} is too long`);
  }

  const hasLat = !isBlank(input.latitude);
  const hasLng = !isBlank(input.longitude);
  if (hasLat !== hasLng) errors.push('Provide both latitude and longitude, or neither');
  else if (hasLat) {
    const lat = Number(input.latitude); const lng = Number(input.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('Latitude is invalid');
    else if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.push('Longitude is invalid');
    else { value.latitude = lat; value.longitude = lng; }
  }
  return { errors, value };
};
