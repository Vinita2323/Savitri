/**
 * The suppliers someone has bought from before, built from their own past purchases (no separate list to keep in sync).
 * Purchases must be sorted newest first. For each supplier (name compared without case and extra spaces) every detail
 * is the most recent non-empty one, so an older purchase can fill a phone number the latest one left out.
 */
const key = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();

export const buildSupplierBook = (purchases, fields = ['supplierPhone', 'supplierEmail', 'supplierAddress']) => {
  const book = new Map();
  for (const p of purchases) {
    const k = key(p.supplierName);
    if (!k) continue;
    let s = book.get(k);
    if (!s) {
      s = { name: String(p.supplierName).trim().replace(/\s+/g, ' '), lastPurchaseAt: p.purchaseDate || p.createdAt || null, purchases: 0 };
      for (const f of fields) s[f] = '';
      book.set(k, s);
    }
    s.purchases += 1;
    for (const f of fields) if (!s[f] && p[f]) s[f] = String(p[f]).trim();
  }
  return [...book.values()];
};

export const SUPPLIER_BOOK_SCAN = 3000; // newest purchases looked at; plenty for a supplier list
