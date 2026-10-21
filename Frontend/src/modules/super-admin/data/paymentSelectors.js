/** Joins demo orders and payments so overview totals stay consistent. */

import { PAYMENT_BRANDS } from './paymentBrandsMock';
import { PAYMENT_CUSTOMERS } from './paymentCustomersMock';
import { PAYMENT_ORDERS } from './paymentOrdersMock';
import { PAYMENT_RECORDS } from './paymentRecordsMock';

const round2 = (value) => Math.round(value * 100) / 100;

export const paymentSplit = (payment) => {
  if (payment.status === 'Successful') {
    return { successful: payment.amountPaid, pending: 0, failed: 0, refund: 0, failedCount: 0 };
  }
  if (payment.status === 'Pending') {
    return { successful: 0, pending: payment.amountPaid === 0 ? lookupFinal(payment.orderId) : 0, failed: 0, refund: 0, failedCount: 0 };
  }
  if (payment.status === 'Failed') {
    return { successful: 0, pending: 0, failed: lookupFinal(payment.orderId), refund: 0, failedCount: 1 };
  }
  if (payment.status === 'Refunded') {
    return { successful: 0, pending: 0, failed: 0, refund: payment.refundAmount, failedCount: 0 };
  }
  return {
    successful: round2(payment.amountPaid - payment.refundAmount),
    pending: 0,
    failed: 0,
    refund: payment.refundAmount,
    failedCount: 0,
  };
};

const orderById = Object.fromEntries(PAYMENT_ORDERS.map((order) => [order.orderId, order]));
const paymentByOrderId = Object.fromEntries(PAYMENT_RECORDS.map((payment) => [payment.orderId, payment]));

function lookupFinal(orderId) {
  return orderById[orderId]?.finalAmount || 0;
}

const sumSplits = (payments) =>
  payments.reduce(
    (totals, payment) => {
      const split = paymentSplit(payment);
      return {
        successful: round2(totals.successful + split.successful),
        pending: round2(totals.pending + split.pending),
        failed: round2(totals.failed + split.failed),
        refund: round2(totals.refund + split.refund),
        failedCount: totals.failedCount + split.failedCount,
        count: totals.count + 1,
      };
    },
    { successful: 0, pending: 0, failed: 0, refund: 0, failedCount: 0, count: 0 }
  );

export const getOrderPayment = (orderId) => paymentByOrderId[orderId] || null;

export const getPurchases = (brandSlug, customerId) =>
  PAYMENT_ORDERS.filter((order) => order.brandSlug === brandSlug && order.customerId === customerId)
    .map((order) => ({ ...order, payment: getOrderPayment(order.orderId) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const summarizeCustomer = (customer) => {
  const purchases = getPurchases(customer.brandSlug, customer.id);
  const totals = sumSplits(purchases.map((purchase) => purchase.payment).filter(Boolean));
  const latest = purchases[0] || null;
  return {
    ...customer,
    orders: purchases.length,
    successful: totals.successful,
    refunds: totals.refund,
    pending: totals.pending,
    failed: totals.failed,
    failedCount: totals.failedCount,
    lastPurchaseAt: latest?.createdAt || '',
    lastMethod: latest?.payment?.method || '—',
    latestStatus: latest?.payment?.status || '—',
  };
};

const STATUS_ORDER = ['Successful', 'Pending', 'Failed', 'Partially Refunded', 'Refunded'];

export const getBrandPaymentTotals = (slug) => {
  const payments = PAYMENT_RECORDS.filter((payment) => payment.brandSlug === slug);
  const rows = STATUS_ORDER.map((status) => {
    const matches = payments.filter((payment) => payment.status === status);
    const amount = matches.reduce((sum, payment) => {
      if (status === 'Successful') return sum + payment.amountPaid;
      if (status === 'Pending' || status === 'Failed') return sum + lookupFinal(payment.orderId);
      if (status === 'Refunded') return sum + payment.refundAmount;
      return sum + round2(payment.amountPaid - payment.refundAmount);
    }, 0);
    return { status, count: matches.length, amount: round2(amount) };
  });
  const split = sumSplits(payments);
  return {
    rows,
    paymentCount: payments.length,
    successful: split.successful,
    pending: split.pending,
    failedAmount: split.failed,
    failedCount: split.failedCount,
    refunds: split.refund,
  };
};

export const getBrandCustomers = (slug) =>
  PAYMENT_CUSTOMERS.filter((customer) => customer.brandSlug === slug).map(summarizeCustomer);

export const getBrandCustomer = (slug, customerId) =>
  getBrandCustomers(slug).find((customer) => customer.id === customerId) || null;

export const getBrandSummaries = () =>
  PAYMENT_BRANDS.map((brand) => {
    const customers = getBrandCustomers(brand.slug);
    const payments = PAYMENT_RECORDS.filter((payment) => payment.brandSlug === brand.slug);
    const totals = sumSplits(payments);
    return {
      ...brand,
      customers: customers.length,
      orders: PAYMENT_ORDERS.filter((order) => order.brandSlug === brand.slug).length,
      successful: totals.successful,
      refunds: totals.refund,
      pending: totals.pending,
      failedCount: totals.failedCount,
      failedAmount: totals.failed,
      paymentCount: totals.count,
    };
  });

export const getPlatformSummary = () => {
  const brands = getBrandSummaries();
  return {
    brands: brands.length,
    payments: brands.reduce((sum, brand) => sum + brand.paymentCount, 0),
    successful: round2(brands.reduce((sum, brand) => sum + brand.successful, 0)),
    refunds: round2(brands.reduce((sum, brand) => sum + brand.refunds, 0)),
    pending: round2(brands.reduce((sum, brand) => sum + brand.pending, 0)),
    failedCount: brands.reduce((sum, brand) => sum + brand.failedCount, 0),
  };
};
