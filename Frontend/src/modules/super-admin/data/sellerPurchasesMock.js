/**
 * Static seller purchase records. Amounts are quantity × unit price.
 * Stock on hand is tracked separately and is not the purchased quantity.
 */

export const SELLER_PURCHASES = [
  { id: 'PUR-2026-001', date: '2026-10-02', sellerId: 'SEL-118', supplierId: 'SUP-01', product: 'Cooking Oil', category: 'Grocery', quantity: 50, unit: 'litre', unitPrice: 150, invoice: 'INV-FG-1001', notes: 'Sample drum delivery for the demo grocery aisle.' },
  { id: 'PUR-2026-002', date: '2026-10-04', sellerId: 'SEL-121', supplierId: 'SUP-02', product: 'Shampoo', category: 'Personal Care', quantity: 30, unit: 'unit', unitPrice: 150, invoice: 'INV-FG-1008', notes: 'Carton of 30 bottles. Demo record only.' },
  { id: 'PUR-2026-003', date: '2026-09-28', sellerId: 'SEL-124', supplierId: 'SUP-03', product: 'Rice', category: 'Staples', quantity: 100, unit: 'kg', unitPrice: 60, invoice: 'INV-FG-0988', notes: 'Bagged rice received at the store godown.' },
  { id: 'PUR-2026-004', date: '2026-10-08', sellerId: 'SEL-118', supplierId: 'SUP-03', product: 'Wheat Flour', category: 'Staples', quantity: 80, unit: 'kg', unitPrice: 42, invoice: 'INV-FG-1044', notes: 'Second staple purchase for this seller in the sample month.' },
  { id: 'PUR-2026-005', date: '2026-10-11', sellerId: 'SEL-121', supplierId: 'SUP-01', product: 'Dishwash Liquid', category: 'Household', quantity: 40, unit: 'litre', unitPrice: 85, invoice: 'INV-FG-1060', notes: 'Household refill cans. No live invoice was issued.' },
  { id: 'PUR-2026-006', date: '2026-09-18', sellerId: 'SEL-130', supplierId: 'SUP-04', product: 'Turmeric Powder', category: 'Spices', quantity: 25, unit: 'kg', unitPrice: 180, invoice: 'INV-FG-0912', notes: 'Spice lot kept in a dry rack.' },
  { id: 'PUR-2026-007', date: '2026-10-15', sellerId: 'SEL-136', supplierId: 'SUP-05', product: 'Milk', category: 'Beverages', quantity: 120, unit: 'litre', unitPrice: 52, invoice: 'INV-FG-1102', notes: 'Chilled delivery. Part of the lot is already marked sold in the demo stock file.' },
  { id: 'PUR-2026-008', date: '2026-10-01', sellerId: 'SEL-142', supplierId: 'SUP-03', product: 'Toor Dal', category: 'Staples', quantity: 60, unit: 'kg', unitPrice: 110, invoice: 'INV-FG-1019', notes: 'Pulse bags counted at inward.' },
  { id: 'PUR-2026-009', date: '2026-10-06', sellerId: 'SEL-204', supplierId: 'SUP-05', product: 'Sugar', category: 'Staples', quantity: 90, unit: 'kg', unitPrice: 44, invoice: 'INV-FH-2201', notes: 'Hub-city staple purchase for the Bhopal demo brand.' },
  { id: 'PUR-2026-010', date: '2026-10-12', sellerId: 'SEL-210', supplierId: 'SUP-02', product: 'Handwash', category: 'Personal Care', quantity: 48, unit: 'unit', unitPrice: 75, invoice: 'INV-FH-2240', notes: 'Pump bottles, one carton.' },
  { id: 'PUR-2026-011', date: '2026-09-22', sellerId: 'SEL-218', supplierId: 'SUP-01', product: 'Sunflower Oil', category: 'Grocery', quantity: 36, unit: 'litre', unitPrice: 145, invoice: 'INV-FH-2104', notes: 'Smaller oil lot than the Indore cooking-oil record.' },
  { id: 'PUR-2026-012', date: '2026-10-16', sellerId: 'SEL-226', supplierId: 'SUP-05', product: 'Biscuits Pack', category: 'Grocery', quantity: 200, unit: 'unit', unitPrice: 20, invoice: 'INV-FH-2288', notes: 'Retail packs. Stock on hand is lower than the inward quantity.' },
  { id: 'PUR-2026-013', date: '2026-10-03', sellerId: 'SEL-204', supplierId: 'SUP-04', product: 'Detergent', category: 'Household', quantity: 24, unit: 'kg', unitPrice: 95, invoice: 'INV-FH-2188', notes: 'Powder cartons. A portion is marked deducted in demo stock.' },
  { id: 'PUR-2026-014', date: '2026-10-09', sellerId: 'SEL-410', supplierId: 'SUP-06', product: 'Cotton Roll', category: 'Pharmacy', quantity: 80, unit: 'unit', unitPrice: 35, invoice: 'INV-FA-3301', notes: 'Clinic consumable. Fictional supplier only.' },
  { id: 'PUR-2026-015', date: '2026-09-30', sellerId: 'SEL-418', supplierId: 'SUP-06', product: 'Antiseptic Liquid', category: 'Pharmacy', quantity: 20, unit: 'litre', unitPrice: 90, invoice: 'INV-FA-3180', notes: 'Pharmacy liquid. Current stock is below the purchased litres.' },
  { id: 'PUR-2026-016', date: '2026-10-14', sellerId: 'SEL-424', supplierId: 'SUP-02', product: 'Face Mask', category: 'Personal Care', quantity: 150, unit: 'unit', unitPrice: 8, invoice: 'INV-FA-3412', notes: 'Box count at inward was 150 pieces.' },
  { id: 'PUR-2026-017', date: '2026-10-07', sellerId: 'SEL-410', supplierId: 'SUP-03', product: 'Glucose Powder', category: 'Staples', quantity: 40, unit: 'kg', unitPrice: 70, invoice: 'INV-FA-3277', notes: 'Jar stock for the pharmacy counter.' },
  { id: 'PUR-2026-018', date: '2026-10-18', sellerId: 'SEL-418', supplierId: 'SUP-01', product: 'Sanitizer', category: 'Personal Care', quantity: 25, unit: 'litre', unitPrice: 120, invoice: 'INV-FA-3502', notes: 'Latest sample purchase in this demo set.' },
];

export const purchaseTotal = (row) => row.quantity * row.unitPrice;
