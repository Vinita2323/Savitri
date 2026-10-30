import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLatLng,
  evaluateBrandEligibility,
  rankEligibleBrands,
} from '../src/utils/brandEligibility.js';
import { haversineDistanceRaw } from '../src/utils/haversine.js';

const mk = (over = {}) => ({
  _id: over._id || 'id1',
  brandId: 'brand_x',
  name: 'Natural Agro Farm',
  city: 'Indore',
  state: 'Madhya Pradesh',
  status: 'Active',
  allowSellerRegistration: true,
  complianceStatus: 'Verified',
  gst: '23AABCF1234A1Z5',
  pan: 'AABCF1234A',
  contact: '9876543210',
  location: { type: 'Point', coordinates: [75.8937, 22.7533] }, // Vijay Nagar [lng, lat]
  operatingRadiusKm: 10,
  ...over,
});

const VIJAY_NAGAR = { lat: 22.7533, lng: 75.8937 };
// Point due north of the centre at an exact distance (1 deg lat = R*pi/180 km)
const northOf = (km) => ({ lat: VIJAY_NAGAR.lat + (km / 6371) * (180 / Math.PI), lng: VIJAY_NAGAR.lng });

test('inside radius is eligible with distance', () => {
  const p = northOf(3);
  const r = evaluateBrandEligibility(mk(), p.lat, p.lng, 'Indore');
  assert.equal(r.eligible, true);
  assert.ok(Math.abs(r.distanceKm - 3) < 0.01);
  assert.equal(r.radiusKm, 10);
});

test('outside radius is not eligible', () => {
  const p = northOf(10.5);
  const r = evaluateBrandEligibility(mk(), p.lat, p.lng, 'Indore');
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'OUTSIDE_RADIUS');
});

test('exactly on the radius boundary is eligible', () => {
  const p = northOf(10);
  const d = haversineDistanceRaw(p.lat, p.lng, VIJAY_NAGAR.lat, VIJAY_NAGAR.lng);
  // Use a radius equal to the computed distance to avoid float noise in the setup
  const r = evaluateBrandEligibility(mk({ operatingRadiusKm: d }), p.lat, p.lng, 'Indore');
  assert.equal(r.eligible, true);
});

test('multiple/overlapping brands are all returned, nearest first', () => {
  const p = northOf(2);
  const brands = [
    mk({ _id: 'far', name: 'Far', location: { type: 'Point', coordinates: [75.8937, 22.7533 - 0.05] }, operatingRadiusKm: 20 }),
    mk({ _id: 'near', name: 'Near' }),
    mk({ _id: 'out', name: 'Out', operatingRadiusKm: 1, location: { type: 'Point', coordinates: [75.95, 22.8] } }),
  ];
  const ranked = rankEligibleBrands(brands, p.lat, p.lng, 'Indore');
  assert.deepEqual(ranked.map((b) => b.name), ['Near', 'Far']);
  assert.ok(ranked[0].distanceKm <= ranked[1].distanceKm);
});

test('brands in a different city are excluded (independent coverage)', () => {
  const bhopal = mk({ _id: 'b', city: 'Bhopal' });
  const ranked = rankEligibleBrands([bhopal], VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, 'Indore');
  assert.equal(ranked.length, 0);
  assert.equal(rankEligibleBrands([bhopal], VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, ' bhopal ').length, 1);
});

test('inactive, draft, registration-disabled and non-verified brands are excluded', () => {
  for (const over of [
    { status: 'Inactive' },
    { status: 'Draft' },
    { allowSellerRegistration: false },
    { complianceStatus: 'Pending' },
    { complianceStatus: 'Rejected' },
  ]) {
    const r = evaluateBrandEligibility(mk(over), VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, 'Indore');
    assert.equal(r.eligible, false, JSON.stringify(over));
    assert.equal(r.reason, 'BRAND_NOT_ACCEPTING');
  }
});

test('brands without valid coordinates or radius are excluded', () => {
  for (const over of [
    { location: { type: 'Point', coordinates: [0, 0] } },
    { location: { type: 'Point', coordinates: [] } },
    { location: undefined },
    { location: { type: 'Point', coordinates: [999, 22] } },
    { operatingRadiusKm: 0 },
    { operatingRadiusKm: undefined },
  ]) {
    const r = evaluateBrandEligibility(mk(over), VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, 'Indore');
    assert.equal(r.eligible, false, JSON.stringify(over));
  }
});

test('invalid seller coordinates are rejected', () => {
  for (const [la, lo] of [['abc', 75], [91, 75], [22, 181], [null, null], ['', ''], [0, 0], [NaN, 1]]) {
    assert.equal(parseLatLng(la, lo), null, `${la},${lo}`);
    assert.equal(evaluateBrandEligibility(mk(), la, lo, 'Indore').reason, 'INVALID_LOCATION');
  }
  assert.deepEqual(parseLatLng('22.7', '75.8'), { lat: 22.7, lng: 75.8 });
});

test('radius change or status change is enforced on re-evaluation (stale selection)', () => {
  const p = northOf(8);
  assert.equal(evaluateBrandEligibility(mk(), p.lat, p.lng, 'Indore').eligible, true);
  assert.equal(evaluateBrandEligibility(mk({ operatingRadiusKm: 5 }), p.lat, p.lng, 'Indore').eligible, false);
  assert.equal(evaluateBrandEligibility(mk({ status: 'Inactive' }), p.lat, p.lng, 'Indore').eligible, false);
});

test('location/city changed after selection is rejected', () => {
  const far = northOf(50);
  assert.equal(evaluateBrandEligibility(mk(), far.lat, far.lng, 'Indore').reason, 'OUTSIDE_RADIUS');
  assert.equal(evaluateBrandEligibility(mk(), VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, 'Bhopal').reason, 'CITY_MISMATCH');
});

test('public projection never exposes sensitive fields', () => {
  const [pub] = rankEligibleBrands([mk()], VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, 'Indore');
  for (const k of ['gst', 'pan', 'contact', 'email', 'supportPhone', 'registeredOfficeAddress', 'location', 'coordinates']) {
    assert.equal(k in pub, false, k);
  }
  assert.equal(pub.name, 'Natural Agro Farm');
  assert.equal(pub.operatingRadiusKm, 10);
});

test('empty list when nothing eligible', () => {
  assert.deepEqual(rankEligibleBrands([], VIJAY_NAGAR.lat, VIJAY_NAGAR.lng, 'Indore'), []);
});
