/**
 * Which brands an Admin document covers.
 *  - "Strict" admins (managed in Admin Configuration, and every City Admin): ONLY the brands listed. An empty list means NO
 *    brand at all, and '*' is ignored. Access can therefore never widen by accident (for example when a brand is deleted).
 *  - Older admin accounts keep the original rule: no list (or '*') = every brand.
 */
export const isStrictAdmin = (a) => a?.brandAccess === 'ASSIGNED' || a?.adminType === 'CITY_ADMIN';

export const assignedBrandIds = (a) => (Array.isArray(a?.authorizedBrands) ? a.authorizedBrands.filter((x) => x && x !== '*') : []);

export const adminCoversBrand = (a, brandId) => {
  if (isStrictAdmin(a)) return assignedBrandIds(a).includes(brandId);
  const list = a?.authorizedBrands;
  return !list?.length || list.includes('*') || list.includes(brandId);
};
