import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sellerScopeFilter,
  sellerInScope,
  getCityRegex,
  isBrandAuthorizedForUser,
} from '../src/middleware/scopeMiddleware.js';

const brandA = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', brandId: 'brand_a' };
const scopeA = { isAll: false, brandId: 'brand_a', brand: brandA, city: 'Indore', legacyCityFallback: false };
const scopeAlegacy = { ...scopeA, legacyCityFallback: true };
const ALL = { isAll: true, brandId: 'ALL' };

test('consolidated scope imposes no seller filter and includes everyone', () => {
  assert.deepEqual(sellerScopeFilter(ALL), {});
  assert.equal(sellerInScope(ALL, { brandId: 'x' }), true);
});

test('seller with a brandId belongs only to that brand, regardless of city', () => {
  const inA = { brandId: 'brand_a', warehouseLocation: { city: 'Bhopal' } };
  const inB = { brandId: 'brand_b', warehouseLocation: { city: 'Indore' } };
  assert.equal(sellerInScope(scopeAlegacy, inA), true);
  assert.equal(sellerInScope(scopeAlegacy, inB), false);
});

test('legacy sellers (no brand) match by city only when the city has a single brand', () => {
  const legacy = { warehouseLocation: { city: 'indore' } };
  assert.equal(sellerInScope(scopeAlegacy, legacy), true);
  assert.equal(sellerInScope(scopeA, legacy), false); // ambiguous city => excluded
});

test('seller without city or brand fails closed', () => {
  assert.equal(sellerInScope(scopeAlegacy, { warehouseLocation: {} }), false);
  assert.equal(sellerInScope(scopeAlegacy, null), false);
});

test('seller matched by brand ObjectId reference', () => {
  assert.equal(sellerInScope(scopeA, { brand: 'aaaaaaaaaaaaaaaaaaaaaaaa' }), true);
  assert.equal(sellerInScope(scopeA, { brand: 'bbbbbbbbbbbbbbbbbbbbbbbb' }), false);
});

test('mongo filter: strict by default, city fallback only for legacy-unassigned sellers', () => {
  const strict = sellerScopeFilter(scopeA);
  assert.equal(strict.$or.length, 2); // brandId + brand ref
  const withLegacy = sellerScopeFilter(scopeAlegacy);
  assert.equal(withLegacy.$or.length, 3);
  assert.ok(withLegacy.$or[2].$and[0].$or.some((c) => c.brandId === ''));
});

test('getCityRegex escapes regex metacharacters', () => {
  const re = getCityRegex('In.*dore');
  assert.equal(re.test('Indore'), false);
  assert.equal(re.test('In.*dore'), true);
});

test('authorization: super_admin all; admin restricted by authorizedBrands; others denied', async () => {
  assert.equal(await isBrandAuthorizedForUser(null, 'brand_a'), false);
  assert.equal(await isBrandAuthorizedForUser({ role: 'super_admin' }, 'brand_a'), true);
  assert.equal(await isBrandAuthorizedForUser({ role: 'super-admin' }, 'ALL'), true);
  assert.equal(await isBrandAuthorizedForUser({ role: 'user' }, 'brand_a'), false);
  assert.equal(await isBrandAuthorizedForUser({ role: 'seller' }, 'ALL'), false);
  const admin = (list) => ({ role: 'admin', authorizedBrands: list });
  assert.equal(await isBrandAuthorizedForUser(admin(['brand_a']), 'brand_a'), true);
  assert.equal(await isBrandAuthorizedForUser(admin(['brand_a']), 'brand_b'), false);
  assert.equal(await isBrandAuthorizedForUser(admin(['brand_a']), 'ALL'), false);
  assert.equal(await isBrandAuthorizedForUser(admin(['*']), 'ALL'), true);
  assert.equal(await isBrandAuthorizedForUser(admin([]), 'brand_b'), true); // unrestricted admin (existing behaviour)
});
