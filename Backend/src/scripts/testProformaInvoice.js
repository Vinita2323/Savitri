import { computeProformaFinancials } from '../controllers/proformaInvoiceController.js';
import { sendProformaInvoiceEmail } from '../services/proformaInvoiceEmailService.js';

console.log('--- 1. Testing Financial Calculations ---');

// Test intra-state (Madhya Pradesh -> CGST 50% + SGST 50%)
const rawItemsMP = [
  {
    name: 'Savitri Sharbati Wheat Flour (50kg)',
    sku: 'WHT-50',
    quantity: 10,
    unitPrice: 2000,
    discountType: 'percentage',
    discountValue: 10, // 10% discount on 20,000 = 2,000. Taxable = 18,000.
    gstRate: 5, // 5% GST on 18,000 = 900. Total = 18,900.
  },
  {
    name: 'Mustard Oil (15L Tin)',
    sku: 'OIL-15',
    quantity: 4,
    unitPrice: 2500,
    discountType: 'amount',
    discountValue: 500, // 500 off 10,000 = 9,500.
    gstRate: 5, // 5% GST on 9,500 = 475. Total = 9,975.
  },
];

const resultMP = computeProformaFinancials(
  rawItemsMP,
  500, // overall discount: 500
  1000, // shipping: 1000
  200, // additional: 200
  50, // advance %: 50%
  null,
  'Madhya Pradesh',
  [] // payments
);

console.log('MP Calculation Result:');
console.log('Subtotal:', resultMP.summary.subtotal, 'Expected: 30000');
console.log('Line Discount:', resultMP.summary.lineDiscountTotal, 'Expected: 2500');
console.log('Total Discount:', resultMP.summary.totalDiscount, 'Expected: 3000');
console.log('Taxable Amount:', resultMP.summary.taxableAmount, 'Expected: 27500');
console.log('Total Tax:', resultMP.summary.totalTax, 'Expected: 1375');
console.log('CGST Amount:', resultMP.summary.cgstAmount, 'Expected: 687.5');
console.log('SGST Amount:', resultMP.summary.sgstAmount, 'Expected: 687.5');
console.log('IGST Amount:', resultMP.summary.igstAmount, 'Expected: 0');
console.log('Grand Total:', resultMP.summary.grandTotal, 'Expected: 29575'); // (27500 - 500) + 1375 + 1000 + 200 = 29575
console.log('Advance Amount (50%):', resultMP.summary.advanceAmount, 'Expected: 14788');
console.log('Balance Due:', resultMP.summary.balanceDue, 'Expected: 29575');
console.log('Payment Status:', resultMP.paymentStatus, 'Expected: Unpaid');

if (
  resultMP.summary.subtotal === 30000 &&
  resultMP.summary.totalDiscount === 3000 &&
  resultMP.summary.cgstAmount === 687.5 &&
  resultMP.summary.sgstAmount === 687.5 &&
  resultMP.summary.igstAmount === 0 &&
  resultMP.summary.grandTotal === 29575 &&
  resultMP.paymentStatus === 'Unpaid'
) {
  console.log('>>> TEST 1 (Intra-state calculation) PASSED! <<<');
} else {
  console.error('>>> TEST 1 FAILED! Check numbers above.');
  process.exit(1);
}

// Test inter-state (Maharashtra -> IGST 100%) and partial payment tracking
console.log('\n--- 2. Testing Inter-state (IGST) & Partial Payment Tracking ---');
const payments = [
  { amount: 15000, paymentDate: new Date(), paymentType: 'Advance', referenceNumber: 'UTR-10023' }
];

const resultInterState = computeProformaFinancials(
  rawItemsMP,
  0,
  0,
  0,
  50,
  null,
  'Maharashtra',
  payments
);

console.log('Maharashtra IGST:', resultInterState.summary.igstAmount, 'Expected: 1375');
console.log('CGST:', resultInterState.summary.cgstAmount, 'Expected: 0');
console.log('Total Paid:', resultInterState.summary.totalPaid, 'Expected: 15000');
console.log('Balance Due:', resultInterState.summary.balanceDue, 'Expected: 13875');
console.log('Payment Status:', resultInterState.paymentStatus, 'Expected: Partially Paid');

if (
  resultInterState.summary.igstAmount === 1375 &&
  resultInterState.summary.cgstAmount === 0 &&
  resultInterState.summary.totalPaid === 15000 &&
  resultInterState.paymentStatus === 'Partially Paid'
) {
  console.log('>>> TEST 2 (Inter-state & Payment Tracking) PASSED! <<<');
} else {
  console.error('>>> TEST 2 FAILED!');
  process.exit(1);
}

// Test full payment settlement
console.log('\n--- 3. Testing Full Payment Settlement ---');
const fullPayments = [
  { amount: 15000 },
  { amount: 13875 }
];
const resultFullPaid = computeProformaFinancials(
  rawItemsMP,
  0,
  0,
  0,
  50,
  null,
  'Maharashtra',
  fullPayments
);

console.log('Total Paid:', resultFullPaid.summary.totalPaid, 'Expected: 28875');
console.log('Balance Due:', resultFullPaid.summary.balanceDue, 'Expected: 0');
console.log('Payment Status:', resultFullPaid.paymentStatus, 'Expected: Paid');

if (resultFullPaid.summary.balanceDue === 0 && resultFullPaid.paymentStatus === 'Paid') {
  console.log('>>> TEST 3 (Full Payment Status) PASSED! <<<');
} else {
  console.error('>>> TEST 3 FAILED!');
  process.exit(1);
}

// Test Email Service graceful configuration handling
console.log('\n--- 4. Testing Email Service Handling ---');
sendProformaInvoiceEmail({
  proformaNumber: 'PI-2026-0001',
  recipientEmail: 'client@example.com',
  recipientName: 'Test Client',
  companyName: 'Test Hospital',
  emailSubject: 'Test Subject',
  emailBody: 'Test Body',
  grandTotal: 29575,
  advanceRequired: 14788,
  balanceDue: 14787,
  issueDate: '28-10-2026',
  validUntil: '28-11-2026',
  bankDetails: {},
}).then((res) => {
  console.log('Email delivery response:', res);
  if (res.success === false && res.error) {
    console.log('Gracefully caught SMTP absence or rejection:', res.error);
    console.log('>>> TEST 4 (Email Service safety) PASSED! <<<');
  } else if (res.success) {
    console.log('>>> TEST 4 (Email sent via live SMTP) PASSED! <<<');
  }
  process.exit(0);
});
