/**
 * Financial & Commercial Calculation Utilities for Quotations
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
 * Calculate totals for a single line item
 * @param {Object} item
 * @returns {Object} item with calculated taxableAmount, taxAmount, and lineTotal
 */
export const calculateLineItem = (item) => {
  const qty = Math.max(0, parseFloat(item.quantity) || 0);
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
 * Calculate overall quotation summary
 * @param {Array} items
 * @param {number} overallDiscount
 * @param {number} shippingCharges
 * @param {number} additionalCharges
 * @param {string} buyerState
 * @returns {Object} full financial summary
 */
export const calculateQuotationSummary = (
  items = [],
  overallDiscount = 0,
  shippingCharges = 0,
  additionalCharges = 0,
  buyerState = 'Madhya Pradesh'
) => {
  let subtotal = 0;
  let lineDiscountTotal = 0;
  let taxableTotal = 0;
  let totalTax = 0;
  let gstBreakdown = {};

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

  // Total discounts combined
  const totalCombinedDiscount = lineDiscountTotal + parsedOverallDiscount;

  // Determine CGST + SGST vs IGST (intra-state MP = CGST+SGST, inter-state = IGST)
  const isIntraState = !buyerState || buyerState.toLowerCase().trim() === 'madhya pradesh';
  const cgstAmount = isIntraState ? totalTax / 2 : 0;
  const sgstAmount = isIntraState ? totalTax / 2 : 0;
  const igstAmount = isIntraState ? 0 : totalTax;

  const rawGrandTotal = taxableTotal - parsedOverallDiscount + totalTax + parsedShipping + parsedAdditional;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    lineDiscountTotal: Math.round(lineDiscountTotal * 100) / 100,
    overallDiscount: parsedOverallDiscount,
    totalDiscount: Math.round(totalCombinedDiscount * 100) / 100,
    taxableAmount: Math.round(taxableTotal * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    shippingCharges: parsedShipping,
    additionalCharges: parsedAdditional,
    roundOff,
    grandTotal: roundedGrandTotal,
    gstBreakdown,
    isIntraState,
  };
};

/**
 * Generate a next unique mock Quotation Number
 * @param {Array} existingQuotes
 * @returns {string} e.g. "QT-2026-0007"
 */
export const generateNextQuotationNumber = (existingQuotes = []) => {
  const year = new Date().getFullYear();
  let maxSeq = existingQuotes.length;

  existingQuotes.forEach((q) => {
    if (q.quotationNumber && q.quotationNumber.startsWith(`QT-${year}-`)) {
      const parts = q.quotationNumber.split('-');
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `QT-${year}-${nextSeq}`;
};
