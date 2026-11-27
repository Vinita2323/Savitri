/**
 * The brand a brand-restricted Admin is currently working in (Admin panel only). It is just a selection: the server checks on
 * every request that the signed-in admin really has this brand.
 */
const KEY = 'savitri_admin_brand';

export const getAdminBrand = () => {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
};

export const setAdminBrand = (brandId) => {
  try {
    if (brandId) sessionStorage.setItem(KEY, brandId);
    else sessionStorage.removeItem(KEY);
  } catch { /* storage blocked: the server will ask for a brand */ }
};

export const ADMIN_BRAND_CHECK_EVENT = 'savitri-admin-brand-check';
