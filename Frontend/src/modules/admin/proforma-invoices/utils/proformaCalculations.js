/**
 * Financial & Commercial Calculation Utilities for Proforma Invoices
 */

/**
 * Format currency in Indian Rupees (INR)
 * @param {number} amount
 * @returns {string} e.g. "₹1,24,500"
 */
export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format a Date value to Indian standard DD-MM-YYYY format
 * @param {Date|string} val
 * @returns {string} e.g. "28-10-2026"
 */
export const formatDate = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Convert number to words in Indian Rupee format
 * @param {number} amount
 * @returns {string} e.g. "Rupees Forty-Five Thousand Two Hundred Only"
 */
export const numberToWordsINR = (amount) => {
  const num = Math.round(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Rupees Zero Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000)
      return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    return '';
  };

  let str = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  if (crore > 0) str += inWords(crore) + 'Crore ';
  if (lakh > 0) str += inWords(lakh) + 'Lakh ';
  if (thousand > 0) str += inWords(thousand) + 'Thousand ';
  if (hundred > 0) str += inWords(hundred);

  return `Rupees ${str.trim()} Only`;
};

/**
 * Calculate totals for a single line item
 * @param {Object} item
 * @returns {Object} item with calculated taxableAmount, taxAmount, and lineTotal
 */
export const calculateLineItem = (item) => {
  const qty = Math.max(1, parseFloat(item.quantity) || 1);
  const price = Math.max(0, parseFloat(item.unitPrice) || 0);
  const baseAmount = qty * price;

  let discountAmount = 0;
  const discountVal = Math.max(0, parseFloat(item.discountValue) || 0);
  if (item.discountType === 'amount') {
    discountAmount = Math.min(baseAmount, discountVal);
  } else {
    // Percentage
    discountAmount = (baseAmount * Math.min(100, discountVal)) / 100;
  }

  const taxableAmount = Math.max(0, baseAmount - discountAmount);
  const gstRate = parseFloat(item.gstRate) || 0;
  const taxAmount = (taxableAmount * gstRate) / 100;
  const lineTotal = taxableAmount + taxAmount;

  return {
    ...item,
    quantity: qty,
    unitPrice: price,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
  };
};

/**
 * Calculate overall financial summary for Proforma Invoice
 * @param {Array} items
 * @param {number} overallDiscount
 * @param {number} shippingCharges
 * @param {number} additionalCharges
 * @param {number} advancePercentage
 * @param {number|null} manualAdvanceAmount
 * @param {string} buyerState
 * @param {number} totalPaid
 * @returns {Object} full summary breakdown
 */
export const calculateProformaSummary = (
  items = [],
  overallDiscount = 0,
  shippingCharges = 0,
  additionalCharges = 0,
  advancePercentage = 50,
  manualAdvanceAmount = null,
  buyerState = 'Madhya Pradesh',
  totalPaid = 0
) => {
  let subtotal = 0;
  let lineDiscountTotal = 0;
  let taxableTotal = 0;
  let totalTax = 0;
  const gstBreakdown = {};

  items.forEach((it) => {
    const calc = calculateLineItem(it);
    const base = calc.quantity * calc.unitPrice;
    subtotal += base;
    lineDiscountTotal += calc.discountAmount;
    taxableTotal += calc.taxableAmount;
    totalTax += calc.taxAmount;

    const rateKey = `${calc.gstRate}%`;
    if (!gstBreakdown[rateKey]) {
      gstBreakdown[rateKey] = { rate: calc.gstRate, taxable: 0, tax: 0 };
    }
    gstBreakdown[rateKey].taxable += calc.taxableAmount;
    gstBreakdown[rateKey].tax += calc.taxAmount;
  });

  const parsedOverallDiscount = Math.max(0, parseFloat(overallDiscount) || 0);
  const parsedShipping = Math.max(0, parseFloat(shippingCharges) || 0);
  const parsedAdditional = Math.max(0, parseFloat(additionalCharges) || 0);

  const totalDiscount = Math.round((lineDiscountTotal + parsedOverallDiscount) * 100) / 100;
  const netTaxable = Math.max(0, taxableTotal - parsedOverallDiscount);

  // Intra-state MP vs Inter-state IGST
  const isIntraState =
    !buyerState ||
    buyerState.toLowerCase().trim() === 'madhya pradesh' ||
    buyerState.toLowerCase().trim() === 'mp';

  const cgstAmount = isIntraState ? Math.round((totalTax / 2) * 100) / 100 : 0;
  const sgstAmount = isIntraState ? Math.round((totalTax / 2) * 100) / 100 : 0;
  const igstAmount = isIntraState ? 0 : Math.round(totalTax * 100) / 100;

  const rawGrandTotal = netTaxable + totalTax + parsedShipping + parsedAdditional;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  // Advance calculation
  let computedAdvance = 0;
  const advPct = Math.min(100, Math.max(0, parseFloat(advancePercentage) || 0));
  if (manualAdvanceAmount !== null && manualAdvanceAmount !== undefined && manualAdvanceAmount > 0) {
    computedAdvance = Math.min(grandTotal, parseFloat(manualAdvanceAmount));
  } else if (advPct > 0) {
    computedAdvance = Math.round((grandTotal * advPct) / 100);
  }

  const roundedTotalPaid = Math.round(Math.max(0, parseFloat(totalPaid) || 0) * 100) / 100;
  const balanceDue = Math.max(0, Math.round((grandTotal - roundedTotalPaid) * 100) / 100);

  let paymentStatus = 'Unpaid';
  if (roundedTotalPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (roundedTotalPaid > 0) {
    paymentStatus = 'Partially Paid';
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    lineDiscountTotal: Math.round(lineDiscountTotal * 100) / 100,
    overallDiscount: parsedOverallDiscount,
    totalDiscount,
    taxableAmount: Math.round(taxableTotal * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    cgstAmount,
    sgstAmount,
    igstAmount,
    shippingCharges: parsedShipping,
    additionalCharges: parsedAdditional,
    roundOff,
    grandTotal,
    advancePercentage: advPct,
    advanceAmount: computedAdvance,
    totalPaid: roundedTotalPaid,
    balanceDue,
    paymentStatus,
    gstBreakdown,
    isIntraState,
  };
};

/**
 * Generate a next unique mock Proforma Invoice Number if offline
 * @param {Array} existingInvoices
 * @returns {string} e.g. "PI-2026-0001"
 */
export const generateNextProformaNumberLocal = (existingInvoices = []) => {
  const year = new Date().getFullYear();
  let maxSeq = existingInvoices.length;

  existingInvoices.forEach((inv) => {
    if (inv.proformaNumber && inv.proformaNumber.startsWith(`PI-${year}-`)) {
      const parts = inv.proformaNumber.split('-');
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `PI-${year}-${nextSeq}`;
};
