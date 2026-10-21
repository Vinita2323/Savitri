/**
 * Static demo sellers for Super Admin brand payout pages.
 * Fictional records only — not real people or payouts.
 */

export const PAYOUT_BRANDS = [
  { slug: 'auriva-bites', name: 'Auriva Bites' },
  { slug: 'quick-commerce', name: 'Quick Commerce' },
  { slug: 'shippnex', name: 'Shippnex' },
  { slug: 'medcred', name: 'MedCred' },
];

export const brandFromSlug = (slug) => PAYOUT_BRANDS.find((brand) => brand.slug === slug) || null;

export const brandSlugFromName = (name) => {
  const match = PAYOUT_BRANDS.find((brand) => brand.name === name);
  if (match) return match.slug;
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const seller = (row) => row;

export const BRAND_SELLERS = [
  seller({ id: 'SEL-118', brandSlug: 'auriva-bites', name: 'Demo Seller One', store: 'Fresh Foods Store', phone: '+91 98XXX XX118', email: 'demo.seller.one@example.com', orders: 186, totalPaid: 42000, pendingAmount: 4200, failedAmount: 0, lastPayoutDate: '2026-10-21', registeredAt: '2025-04-12', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-121', brandSlug: 'auriva-bites', name: 'Demo Seller Two', store: 'Daily Needs Store', phone: '+91 97XXX XX121', email: 'demo.seller.two@example.com', orders: 164, totalPaid: 38500, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-18', registeredAt: '2025-05-03', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-124', brandSlug: 'auriva-bites', name: 'Demo Seller Three', store: 'Organic Foods Store', phone: '+91 96XXX XX124', email: 'demo.seller.three@example.com', orders: 121, totalPaid: 27800, pendingAmount: 2500, failedAmount: 0, lastPayoutDate: '2026-10-19', registeredAt: '2025-06-18', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-130', brandSlug: 'auriva-bites', name: 'Demo Seller Four', store: 'City Spice Mart', phone: '+91 95XXX XX130', email: 'demo.seller.four@example.com', orders: 210, totalPaid: 51000, pendingAmount: 8000, failedAmount: 3500, lastPayoutDate: '2026-10-17', registeredAt: '2025-02-09', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-136', brandSlug: 'auriva-bites', name: 'Demo Seller Five', store: 'Morning Basket', phone: '+91 94XXX XX136', email: 'demo.seller.five@example.com', orders: 142, totalPaid: 44000, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-15', registeredAt: '2025-07-21', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-142', brandSlug: 'auriva-bites', name: 'Demo Seller Six', store: 'Green Leaf Grocers', phone: '+91 93XXX XX142', email: 'demo.seller.six@example.com', orders: 98, totalPaid: 36000, pendingAmount: 12000, failedAmount: 4500, lastPayoutDate: '2026-10-16', registeredAt: '2025-08-02', verification: 'Pending', accountStatus: 'Active' }),
  seller({ id: 'SEL-148', brandSlug: 'auriva-bites', name: 'Demo Seller Seven', store: 'Family Kirana Hub', phone: '+91 92XXX XX148', email: 'demo.seller.seven@example.com', orders: 256, totalPaid: 62000, pendingAmount: 15000, failedAmount: 0, lastPayoutDate: '2026-10-14', registeredAt: '2024-11-19', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-155', brandSlug: 'auriva-bites', name: 'Demo Seller Eight', store: 'Spice Route Store', phone: '+91 91XXX XX155', email: 'demo.seller.eight@example.com', orders: 88, totalPaid: 29500, pendingAmount: 5600, failedAmount: 2000, lastPayoutDate: '2026-10-12', registeredAt: '2025-09-14', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-161', brandSlug: 'auriva-bites', name: 'Demo Seller Nine', store: 'Harvest Corner', phone: '+91 90XXX XX161', email: 'demo.seller.nine@example.com', orders: 133, totalPaid: 41000, pendingAmount: 0, failedAmount: 6000, lastPayoutDate: '2026-10-11', registeredAt: '2025-03-28', verification: 'Verified', accountStatus: 'Inactive' }),
  seller({ id: 'SEL-170', brandSlug: 'auriva-bites', name: 'Demo Seller Ten', store: 'Neighbourhood Mart', phone: '+91 89XXX XX170', email: 'demo.seller.ten@example.com', orders: 109, totalPaid: 33400, pendingAmount: 9000, failedAmount: 0, lastPayoutDate: '2026-10-10', registeredAt: '2025-01-16', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-178', brandSlug: 'auriva-bites', name: 'Demo Seller Eleven', store: 'Farm Basket Co', phone: '+91 88XXX XX178', email: 'demo.seller.eleven@example.com', orders: 117, totalPaid: 38700, pendingAmount: 8000, failedAmount: 4000, lastPayoutDate: '2026-10-09', registeredAt: '2025-10-01', verification: 'Pending', accountStatus: 'Active' }),
  seller({ id: 'SEL-185', brandSlug: 'auriva-bites', name: 'Demo Seller Twelve', store: 'Local Grains Store', phone: '+91 87XXX XX185', email: 'demo.seller.twelve@example.com', orders: 96, totalPaid: 36100, pendingAmount: 8000, failedAmount: 0, lastPayoutDate: '2026-10-08', registeredAt: '2025-05-30', verification: 'Verified', accountStatus: 'Active' }),

  seller({ id: 'SEL-204', brandSlug: 'quick-commerce', name: 'Demo Seller QC One', store: 'Quick Basket', phone: '+91 86XXX XX204', email: 'demo.qc.one@example.com', orders: 240, totalPaid: 56000, pendingAmount: 6400, failedAmount: 1200, lastPayoutDate: '2026-10-18', registeredAt: '2025-03-11', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-210', brandSlug: 'quick-commerce', name: 'Demo Seller QC Two', store: 'Minute Mart', phone: '+91 85XXX XX210', email: 'demo.qc.two@example.com', orders: 188, totalPaid: 41200, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-13', registeredAt: '2025-04-22', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-218', brandSlug: 'quick-commerce', name: 'Demo Seller QC Three', store: 'City Rush Store', phone: '+91 84XXX XX218', email: 'demo.qc.three@example.com', orders: 154, totalPaid: 33800, pendingAmount: 4100, failedAmount: 900, lastPayoutDate: '2026-10-09', registeredAt: '2025-06-07', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-226', brandSlug: 'quick-commerce', name: 'Demo Seller QC Four', store: 'Express Pantry', phone: '+91 83XXX XX226', email: 'demo.qc.four@example.com', orders: 121, totalPaid: 27400, pendingAmount: 2500, failedAmount: 0, lastPayoutDate: '2026-10-06', registeredAt: '2025-08-19', verification: 'Pending', accountStatus: 'Active' }),

  seller({ id: 'SEL-305', brandSlug: 'shippnex', name: 'Demo Seller SX One', store: 'Shippnex Hub', phone: '+91 82XXX XX305', email: 'demo.sx.one@example.com', orders: 96, totalPaid: 22000, pendingAmount: 3000, failedAmount: 800, lastPayoutDate: '2026-10-12', registeredAt: '2025-02-14', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-312', brandSlug: 'shippnex', name: 'Demo Seller SX Two', store: 'Parcel Point', phone: '+91 81XXX XX312', email: 'demo.sx.two@example.com', orders: 74, totalPaid: 18600, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-08', registeredAt: '2025-05-09', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-320', brandSlug: 'shippnex', name: 'Demo Seller SX Three', store: 'Lane Dispatch', phone: '+91 80XXX XX320', email: 'demo.sx.three@example.com', orders: 61, totalPaid: 14200, pendingAmount: 1800, failedAmount: 500, lastPayoutDate: '2026-10-04', registeredAt: '2025-07-27', verification: 'Verified', accountStatus: 'Active' }),

  seller({ id: 'SEL-410', brandSlug: 'medcred', name: 'Demo Seller MC One', store: 'Care Pharmacy', phone: '+91 79XXX XX410', email: 'demo.mc.one@example.com', orders: 132, totalPaid: 48000, pendingAmount: 5200, failedAmount: 1500, lastPayoutDate: '2026-10-14', registeredAt: '2025-01-08', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-418', brandSlug: 'medcred', name: 'Demo Seller MC Two', store: 'Wellness Counter', phone: '+91 78XXX XX418', email: 'demo.mc.two@example.com', orders: 101, totalPaid: 36500, pendingAmount: 0, failedAmount: 0, lastPayoutDate: '2026-10-11', registeredAt: '2025-03-03', verification: 'Verified', accountStatus: 'Active' }),
  seller({ id: 'SEL-424', brandSlug: 'medcred', name: 'Demo Seller MC Three', store: 'Neighbour Clinic Store', phone: '+91 77XXX XX424', email: 'demo.mc.three@example.com', orders: 88, totalPaid: 24100, pendingAmount: 2600, failedAmount: 700, lastPayoutDate: '2026-10-07', registeredAt: '2025-06-16', verification: 'Pending', accountStatus: 'Active' }),
];
