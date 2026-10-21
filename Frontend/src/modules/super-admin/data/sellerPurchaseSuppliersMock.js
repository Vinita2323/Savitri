/**
 * Fictional suppliers for Super Admin → Seller Purchases.
 */

export const PURCHASE_SUPPLIERS = [
  { id: 'SUP-01', name: 'ABC Wholesale', business: 'ABC Wholesale Traders', phone: '+91 90XXX XX201', email: 'orders@abc-wholesale.example', address: 'Plot 12, Sanwer Road, Indore' },
  { id: 'SUP-02', name: 'XYZ Traders', business: 'XYZ Personal Care Traders', phone: '+91 89XXX XX214', email: 'desk@xyz-traders.example', address: 'Warehouse 4, Lasudia Mori, Indore' },
  { id: 'SUP-03', name: 'Local Supplier', business: 'Local Grain & Spice Supply', phone: '+91 88XXX XX230', email: 'hello@local-supply.example', address: 'Mandi Yard, Gate 2, Indore' },
  { id: 'SUP-04', name: 'GreenLeaf Distributors', business: 'GreenLeaf Home Care Distributors', phone: '+91 87XXX XX244', email: 'supply@greenleaf.example', address: '18 Govindpura Industrial Area, Bhopal' },
  { id: 'SUP-05', name: 'Metro FMCG', business: 'Metro FMCG Distributors', phone: '+91 86XXX XX258', email: 'sales@metro-fmcg.example', address: 'Sector C, Industrial Estate, Bhopal' },
  { id: 'SUP-06', name: 'MedSupply Co', business: 'MedSupply Pharmacy Distributors', phone: '+91 85XXX XX271', email: 'care@medsupply.example', address: '7 Adhartal, Jabalpur' },
];

export const purchaseSupplierById = (id) => PURCHASE_SUPPLIERS.find((supplier) => supplier.id === id) || null;
