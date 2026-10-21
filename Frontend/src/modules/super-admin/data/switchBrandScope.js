/**
 * Maps demo catalog brands onto the sidebar switcher
 * (Fashion Gallary, Fashion Hub, Fashion Adda).
 * A newly created switcher brand has no demo records.
 */

export const CATALOG_BRAND_OWNER = {
  'auriva-bites': 'brand_fg',
  'quick-commerce': 'brand_fh',
  shippnex: 'brand_fh',
  medcred: 'brand_fa',
};

export const CAPTAIN_BRAND_OWNER = {
  'CAP-014': 'brand_fg',
  'CAP-019': 'brand_fh',
  'CAP-031': 'brand_fg',
  'CAP-044': 'brand_fa',
  'CAP-052': 'brand_fa',
  'CAP-061': 'brand_fg',
  'CAP-073': 'brand_fh',
  'CAP-088': 'brand_fg',
};

export const catalogSlugsFor = (switchBrandId) =>
  Object.entries(CATALOG_BRAND_OWNER)
    .filter(([, ownerId]) => ownerId === switchBrandId)
    .map(([slug]) => slug);

export const catalogOwns = (slug, switchBrandId) => {
  if (!switchBrandId) return true;
  return CATALOG_BRAND_OWNER[slug] === switchBrandId;
};

export const captainBelongsTo = (captainId, switchBrandId) => {
  if (!switchBrandId) return true;
  return CAPTAIN_BRAND_OWNER[captainId] === switchBrandId;
};
