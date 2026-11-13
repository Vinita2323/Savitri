import Brand from '../models/Brand.model.js';
import { haversineDistanceRaw } from './haversine.js';
import { normalizeCity, sameCity } from './cityNormalization.js';

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

/** City comparison after normalisation (Delhi / New Delhi / North West Delhi ... are the same city). */
export const cityMatches = (a, b) => sameCity(a, b);

/** Brand's operating centre as { lat, lng, radiusKm }, or null if not configured validly. */
export const getBrandCoverage = (brand) => {
  const coords = brand?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const centre = parseLatLng(coords[1], coords[0]); // GeoJSON order: [lng, lat]
  if (!centre) return null;
  // The Indore default (22.7196, 75.8577) on a non-Indore brand is a placeholder copied by the old Create Brand form,
  // not a real operating centre: treat it as NOT configured so the problem is reported, not hidden behind a wrong distance.
  if (Math.abs(centre.lat - 22.7196) < 0.0005 && Math.abs(centre.lng - 75.8577) < 0.0005 && normalizeCity(brand.city).toLowerCase() !== 'indore') return null;
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
  // An explicitly configured whole-city brand serves every seller in its city. Nothing else gets this treatment:
  // a brand with missing / invalid coordinates is a CONFIGURATION ERROR, never an implicit "serves everyone".
  if (brand.serviceCoverage === 'WHOLE_CITY') {
    const centre = getBrandCoverage(brand);
    const distanceKm = centre ? haversineDistanceRaw(seller.lat, seller.lng, centre.lat, centre.lng) : null;
    return { eligible: true, wholeCity: true, distanceKm, radiusKm: centre ? centre.radiusKm : null };
  }
  const coverage = getBrandCoverage(brand);
  if (!coverage) return { eligible: false, reason: 'BRAND_COVERAGE_NOT_CONFIGURED' };
  const distanceKm = haversineDistanceRaw(seller.lat, seller.lng, coverage.lat, coverage.lng);
  if (distanceKm > coverage.radiusKm) {
    return { eligible: false, reason: 'OUTSIDE_RADIUS', distanceKm, radiusKm: coverage.radiusKm };
  }
  return { eligible: true, distanceKm, radiusKm: coverage.radiusKm };
};

/** Public-safe projection. Never includes GST/PAN/contact/financial fields. */
const toPublicBrand = (brand, distanceKm, radiusKm, wholeCity = false) => ({
  id: String(brand._id),
  brandId: brand.brandId,
  name: brand.name,
  logo: brand.logo || '/LogoSavitri.png',
  city: brand.city,
  state: brand.state,
  locality: brand.locality || '',
  // Only a finite number is ever sent; the UI shows no distance otherwise (never "null km" / "NaN km").
  distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 100) / 100 : null,
  operatingRadiusKm: Number.isFinite(radiusKm) ? radiusKm : null,
  serviceCoverage: wholeCity ? 'WHOLE_CITY' : 'RADIUS',
  eligible: true,
});

/** Pure ranking step (no DB): filter to eligible brands and sort nearest first. */
export const rankEligibleBrands = (brands, lat, lng, city) =>
  brands
    .map((b) => ({ b, r: evaluateBrandEligibility(b, lat, lng, city) }))
    .filter(({ r }) => r.eligible)
    .sort((x, y) => (x.r.distanceKm ?? Infinity) - (y.r.distanceKm ?? Infinity))
    .map(({ b, r }) => toPublicBrand(b, r.distanceKm, r.radiusKm, Boolean(r.wholeCity)));

/** DB lookup of candidate brands in a city that accept registrations. */
/** Active, verified brands accepting registrations whose city equals the (normalised) requested city. */
const findCandidateBrands = async (city) => {
  const wanted = normalizeCity(city);
  if (!wanted) return [];
  const all = await Brand.find({ status: 'Active', allowSellerRegistration: { $ne: false }, complianceStatus: 'Verified' }).lean();
  return all.filter((br) => sameCity(br.city, wanted));
};

export const findEligibleBrands = async (city, lat, lng) => rankEligibleBrands(await findCandidateBrands(city), lat, lng, city);

/**
 * Brands in the city that accept registrations but cannot be matched because their coverage is not configured
 * (RADIUS mode without valid coordinates / radius). Lets the UI say "contact support" instead of "no brands".
 */
export const countMisconfiguredBrands = async (city) => {
  const candidates = await findCandidateBrands(city);
  return candidates.filter((br) => br.serviceCoverage !== 'WHOLE_CITY' && !getBrandCoverage(br)).length;
};

/** Cities that currently have at least one brand accepting registrations. */
export const listRegistrationCities = async () => {
  const rows = await Brand.aggregate([
    { $match: { status: 'Active', allowSellerRegistration: { $ne: false }, complianceStatus: 'Verified' } },
    { $group: { _id: { $toLower: '$city' }, city: { $first: '$city' }, state: { $first: '$state' } } },
    { $sort: { city: 1 } },
  ]);
  const seen = new Map();
  rows.forEach((r) => {
    const canonical = normalizeCity(r.city);
    if (canonical && !seen.has(canonical.toLowerCase())) seen.set(canonical.toLowerCase(), { city: canonical, state: r.state });
  });
  return [...seen.values()].sort((x, y) => x.city.localeCompare(y.city));
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
    BRAND_COVERAGE_NOT_CONFIGURED: 'This brand\'s service area (map location / radius) is not configured yet, so registrations cannot be matched. Please contact support.',
    OUTSIDE_RADIUS: 'Your business location is outside this brand\'s operating area. Please choose another brand.',
    INVALID_LOCATION: 'A valid, confirmed business location is required to select a brand.',
  };
  return { ok: false, status: 400, message: messages[result.reason] || 'Selected brand is not eligible.' };
};
