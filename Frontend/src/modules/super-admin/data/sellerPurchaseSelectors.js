import { inventoryByPurchaseId } from './sellerPurchaseInventoryMock';
import { purchaseSellerById } from './sellerPurchaseSellersMock';
import { purchaseSupplierById } from './sellerPurchaseSuppliersMock';
import { SELLER_PURCHASES, purchaseTotal } from './sellerPurchasesMock';

const UNIT_ORDER = ['kg', 'litre', 'unit'];
const UNIT_LABEL = { kg: 'kg', litre: 'L', unit: 'units' };

export const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatDay = (isoDate) => {
  if (!isoDate) return '—';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const unitLabel = (unit) => UNIT_LABEL[unit] || unit;

export const formatQty = (quantity, unit) => `${quantity} ${unitLabel(unit)}`;

export const sumByUnit = (rows, key) => {
  const totals = {};
  rows.forEach((row) => {
    totals[row.unit] = (totals[row.unit] || 0) + Number(row[key] || 0);
  });
  const text = UNIT_ORDER.filter((unit) => totals[unit]).map((unit) => `${totals[unit]} ${UNIT_LABEL[unit]}`).join(' · ');
  return text || '—';
};

export const enrichPurchase = (row) => {
  const seller = purchaseSellerById(row.sellerId);
  const supplier = purchaseSupplierById(row.supplierId);
  const stock = inventoryByPurchaseId[row.id] || { purchasedQty: row.quantity, availableQty: 0, deductedQty: row.quantity };
  return {
    ...row,
    total: purchaseTotal(row),
    seller,
    supplier,
    brand: seller?.brand || '',
    store: seller?.store || '',
    sellerName: seller?.name || '',
    supplierName: supplier?.name || '',
    purchasedQty: stock.purchasedQty,
    availableQty: stock.availableQty,
    deductedQty: stock.deductedQty,
  };
};

export const ALL_PURCHASES = SELLER_PURCHASES.map(enrichPurchase);

export const purchaseById = (id) => ALL_PURCHASES.find((row) => row.id === id) || null;

export const purchasesForSeller = (sellerId) => ALL_PURCHASES.filter((row) => row.sellerId === sellerId);

export const purchasesForSupplier = (supplierId) => ALL_PURCHASES.filter((row) => row.supplierId === supplierId);
