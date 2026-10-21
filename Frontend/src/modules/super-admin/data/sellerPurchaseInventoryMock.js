/**
 * Demo stock for each purchase. Available quantity is what remains,
 * not the quantity originally purchased.
 */

export const PURCHASE_INVENTORY = [
  { purchaseId: 'PUR-2026-001', purchasedQty: 50, availableQty: 32, deductedQty: 18 },
  { purchaseId: 'PUR-2026-002', purchasedQty: 30, availableQty: 11, deductedQty: 19 },
  { purchaseId: 'PUR-2026-003', purchasedQty: 100, availableQty: 74, deductedQty: 26 },
  { purchaseId: 'PUR-2026-004', purchasedQty: 80, availableQty: 55, deductedQty: 25 },
  { purchaseId: 'PUR-2026-005', purchasedQty: 40, availableQty: 27, deductedQty: 13 },
  { purchaseId: 'PUR-2026-006', purchasedQty: 25, availableQty: 16, deductedQty: 9 },
  { purchaseId: 'PUR-2026-007', purchasedQty: 120, availableQty: 40, deductedQty: 80 },
  { purchaseId: 'PUR-2026-008', purchasedQty: 60, availableQty: 48, deductedQty: 12 },
  { purchaseId: 'PUR-2026-009', purchasedQty: 90, availableQty: 61, deductedQty: 29 },
  { purchaseId: 'PUR-2026-010', purchasedQty: 48, availableQty: 20, deductedQty: 28 },
  { purchaseId: 'PUR-2026-011', purchasedQty: 36, availableQty: 14, deductedQty: 22 },
  { purchaseId: 'PUR-2026-012', purchasedQty: 200, availableQty: 140, deductedQty: 60 },
  { purchaseId: 'PUR-2026-013', purchasedQty: 24, availableQty: 9, deductedQty: 15 },
  { purchaseId: 'PUR-2026-014', purchasedQty: 80, availableQty: 54, deductedQty: 26 },
  { purchaseId: 'PUR-2026-015', purchasedQty: 20, availableQty: 13, deductedQty: 7 },
  { purchaseId: 'PUR-2026-016', purchasedQty: 150, availableQty: 96, deductedQty: 54 },
  { purchaseId: 'PUR-2026-017', purchasedQty: 40, availableQty: 28, deductedQty: 12 },
  { purchaseId: 'PUR-2026-018', purchasedQty: 25, availableQty: 18, deductedQty: 7 },
];

export const inventoryByPurchaseId = Object.fromEntries(
  PURCHASE_INVENTORY.map((row) => [row.purchaseId, row])
);
