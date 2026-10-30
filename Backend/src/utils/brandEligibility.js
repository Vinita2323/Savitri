import Brand from '../models/Brand.model.js';
import { haversineDistanceRaw } from './haversine.js';

/**
 * Brand eligibility for seller registration.
 * A seller is eligible for a brand when the straight-line (great-circle) distance between
 * the seller's business location and the brand's operating centre is <= brand.operatingRadiusKm.
 * This is geographic coverage, not driving distance.
 */

export const parseCoordinate = (value, min, max) => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
};

/** Returns { lat, lng } or null. Rejects NaN, out-of-range and the [0,0] "null island". */
export const parseLatLng = (lat, lng) => {
  const la = parseCoordinate(lat, -90, 90);
  const lo = parseCoordinate(lng, -180, 180);
  if (la === null || lo === null) return null;
  if (la === 0 && lo === 0) return null;
  return { lat: la, lng: lo };
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const cityMatches = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** Brand's operating centre as { lat, lng, radiusKm }, or null if not configured validly. */
export const getBrandCoverage = (brand) => {
  const coords = brand?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const centre = parseLatLng(coords[1], coords[0]); // GeoJSON order: [lng, lat]
  if (!centre) return null;
  const radiusKm = Number(brand.operatingRadiusKm);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return null;
  return { ...centre, radiusKm };
};

/** True when the brand itself currently accepts new seller registrations. */
export const brandAcceptsRegistrations = (brand) =>
  Boolean(brand) &&
  brand.status === 'Active' &&
  brand.allowSellerRegistration !== false &&
  (brand.complianceStatus || 'Verified') === 'Verified';

/**
 * Evaluates one brand against a seller location.
 * Boundary rule: distance exactly equal to the radius is eligible.
 * @returns {{eligible: boolean, reason?: string, distanceKm?: number, radiusKm?: number}}
 */
export const evaluateBrandEligibility = (brand, lat, lng, city) => {
  if (!brandAcceptsRegistrations(brand)) return { eligible: false, reason: 'BRAND_NOT_ACCEPTING' };
  if (city !== undefined && !cityMatches(brand.city, city)) return { eligible: false, reason: 'CITY_MISMATCH' };
  const seller = parseLatLng(lat, lng);
  if (!seller) return { eligible: false, reason: 'INVALID_LOCATION' };
  const coverage = getBrandCoverage(brand);
  if (!coverage) return { eligible: false, reason: 'BRAND_COVERAGE_NOT_CONFIGURED' };
  const distanceKm = haversineDistanceRaw(seller.lat, seller.lng, coverage.lat, coverage.lng);
  if (distanceKm > coverage.radiusKm) {
    return { eligible: false, reason: 'OUTSIDE_RADIUS', distanceKm, radiusKm: coverage.radiusKm };
  }
  return { eligible: true, distanceKm, radiusKm: coverage.radiusKm };
};

/** Public-safe projection. Never includes GST/PAN/contact/financial fields. */
const toPublicBrand = (brand, distanceKm, radiusKm) => ({
  id: String(brand._id),
  brandId: brand.brandId,
  name: brand.name,
  logo: brand.logo || '/LogoSavitri.png',
  city: brand.city,
  state: brand.state,
  locality: brand.locality || '',
  distanceKm: Math.round(distanceKm * 100) / 100,
  operatingRadiusKm: radiusKm,
  eligible: true,
});

/** Pure ranking step (no DB): filter to eligible brands and sort nearest first. */
export const rankEligibleBrands = (brands, lat, lng, city) =>
  brands
    .map((b) => ({ b, r: evaluateBrandEligibility(b, lat, lng, city) }))
    .filter(({ r }) => r.eligible)
    .sort((x, y) => x.r.distanceKm - y.r.distanceKm)
    .map(({ b, r }) => toPublicBrand(b, r.distanceKm, r.radiusKm));

/** DB lookup of candidate brands in a city that accept registrations. */
export const findEligibleBrands = async (city, lat, lng) => {
  const candidates = await Brand.find({
    city: new RegExp(`^${escapeRegex(city.trim())}$`, 'i'),
    status: 'Active',
    allowSellerRegistration: { $ne: false },
    complianceStatus: 'Verified',
  }).lean();
  return rankEligibleBrands(candidates, lat, lng, city);
};

/** Cities that currently have at least one brand accepting registrations. */
export const listRegistrationCities = async () => {
  const rows = await Brand.aggregate([
    { $match: { status: 'Active', allowSellerRegistration: { $ne: false }, complianceStatus: 'Verified' } },
    { $group: { _id: { $toLower: '$city' }, city: { $first: '$city' }, state: { $first: '$state' } } },
    { $sort: { city: 1 } },
  ]);
  return rows.map((r) => ({ city: r.city, state: r.state }));
};

/**
 * Authoritative server-side check used at registration time.
 * Loads the brand fresh from MongoDB and re-evaluates everything.
 * @returns {{ok: true, brand, distanceKm} | {ok: false, status: number, message: string}}
 */
export const validateBrandForRegistration = async ({ brandId, city, lat, lng }) => {
  const id = typeof brandId === 'string' ? brandId.trim() : '';
  if (!id) return { ok: false, status: 400, message: 'Please select a brand for your business location.' };
  const loc = parseLatLng(lat, lng);
  if (!loc) {
    return { ok: false, status: 400, message: 'A valid, confirmed business location is required to select a brand.' };
  }
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  const brand = await Brand.findOne(isObjectId ? { $or: [{ _id: id }, { brandId: id }] } : { brandId: id }).lean();
  if (!brand) return { ok: false, status: 400, message: 'The selected brand was not found. Please choose again.' };

  const result = evaluateBrandEligibility(brand, loc.lat, loc.lng, city);
  if (result.eligible) return { ok: true, brand, distanceKm: result.distanceKm };

  const messages = {
    BRAND_NOT_ACCEPTING: 'This brand is no longer accepting seller registrations. Please choose another brand.',
    CITY_MISMATCH: 'The selected brand does not operate in the selected city.',
    BRAND_COVERAGE_NOT_CONFIGURED: 'This brand is not available for registration right now.',
    OUTSIDE_RADIUS: 'Your business location is outside this brand\'s operating area. Please choose another brand.',
    INVALID_LOCATION: 'A valid, confirmed business location is required to select a brand.',
  };
  return { ok: false, status: 400, message: messages[result.reason] || 'Selected brand is not eligible.' };
};
