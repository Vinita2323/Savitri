/** Demo brands for Super Admin customer payments. Not live payment data. */

export const PAYMENT_BRANDS = [
  { slug: 'auriva-bites', name: 'Auriva Bites', city: 'Indore' },
  { slug: 'quick-commerce', name: 'Quick Commerce', city: 'Bhopal' },
  { slug: 'shippnex', name: 'Shippnex', city: 'Indore' },
  { slug: 'medcred', name: 'MedCred', city: 'Ujjain' },
];

export const paymentBrandFromSlug = (slug) => PAYMENT_BRANDS.find((brand) => brand.slug === slug) || null;
