// POS Billing Constants and Types
export const SALE_TYPES = {
  COUNTER_SALE: 'COUNTER_SALE',
  DELIVERY_ORDER: 'DELIVERY_ORDER',
};

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: 'Banknote', color: 'emerald' },
  { id: 'UPI', label: 'UPI / QR Code', icon: 'QrCode', color: 'blue' },
  { id: 'CARD', label: 'Debit / Credit Card', icon: 'CreditCard', color: 'indigo' },
  { id: 'NETBANKING', label: 'Net Banking', icon: 'Landmark', color: 'purple' },
  { id: 'COD', label: 'Cash on Delivery (COD)', icon: 'Truck', color: 'amber' },
];

export const PAYMENT_STATUSES = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  PENDING: 'PENDING',
};

export const CASH_DENOMINATIONS = [100, 200, 500, 1000, 2000];
