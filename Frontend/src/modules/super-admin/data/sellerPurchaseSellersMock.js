/**
 * Fictional sellers for Super Admin → Seller Purchases.
 * Not live seller accounts.
 */

export const PURCHASE_SELLERS = [
  { id: 'SEL-118', name: 'Demo Seller One', store: 'Fresh Foods Store', brand: 'Fashion Gallary', phone: '+91 98XXX XX118', email: 'demo.seller.one@example.com', address: '14 Palasia Square, Indore' },
  { id: 'SEL-121', name: 'Demo Seller Two', store: 'Daily Needs Store', brand: 'Fashion Gallary', phone: '+91 97XXX XX121', email: 'demo.seller.two@example.com', address: '8 Sapna Sangeeta Road, Indore' },
  { id: 'SEL-124', name: 'Demo Seller Three', store: 'Organic Foods Store', brand: 'Fashion Gallary', phone: '+91 96XXX XX124', email: 'demo.seller.three@example.com', address: '22 Vijay Nagar, Indore' },
  { id: 'SEL-130', name: 'Demo Seller Four', store: 'City Spice Mart', brand: 'Fashion Gallary', phone: '+91 95XXX XX130', email: 'demo.seller.four@example.com', address: '3 Rajwada Lane, Indore' },
  { id: 'SEL-136', name: 'Demo Seller Five', store: 'Morning Basket', brand: 'Fashion Gallary', phone: '+91 94XXX XX136', email: 'demo.seller.five@example.com', address: '51 Bhawarkua, Indore' },
  { id: 'SEL-142', name: 'Demo Seller Six', store: 'Green Leaf Grocers', brand: 'Fashion Gallary', phone: '+91 93XXX XX142', email: 'demo.seller.six@example.com', address: '19 Sudama Nagar, Indore' },
  { id: 'SEL-204', name: 'Demo Seller QC One', store: 'Quick Basket', brand: 'Fashion Hub', phone: '+91 86XXX XX204', email: 'demo.qc.one@example.com', address: '11 New Market, Bhopal' },
  { id: 'SEL-210', name: 'Demo Seller QC Two', store: 'Minute Mart', brand: 'Fashion Hub', phone: '+91 85XXX XX210', email: 'demo.qc.two@example.com', address: '6 MP Nagar Zone 1, Bhopal' },
  { id: 'SEL-218', name: 'Demo Seller QC Three', store: 'City Rush Store', brand: 'Fashion Hub', phone: '+91 84XXX XX218', email: 'demo.qc.three@example.com', address: '27 Arera Colony, Bhopal' },
  { id: 'SEL-226', name: 'Demo Seller QC Four', store: 'Express Pantry', brand: 'Fashion Hub', phone: '+91 83XXX XX226', email: 'demo.qc.four@example.com', address: '4 TT Nagar, Bhopal' },
  { id: 'SEL-410', name: 'Demo Seller MC One', store: 'Care Pharmacy', brand: 'Fashion Adda', phone: '+91 79XXX XX410', email: 'demo.mc.one@example.com', address: '15 Napier Town, Jabalpur' },
  { id: 'SEL-418', name: 'Demo Seller MC Two', store: 'Wellness Counter', brand: 'Fashion Adda', phone: '+91 78XXX XX418', email: 'demo.mc.two@example.com', address: '9 Civil Lines, Jabalpur' },
  { id: 'SEL-424', name: 'Demo Seller MC Three', store: 'Neighbour Clinic Store', brand: 'Fashion Adda', phone: '+91 77XXX XX424', email: 'demo.mc.three@example.com', address: '31 Wright Town, Jabalpur' },
];

export const purchaseSellerById = (id) => PURCHASE_SELLERS.find((seller) => seller.id === id) || null;
