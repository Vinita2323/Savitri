/**
 * Static demo payment records linked to demo orders.
 * Successful totals exclude pending, failed, and fully refunded amounts.
 */

import { PAYMENT_ORDERS } from './paymentOrdersMock';

const STATUS_CYCLE = ['Successful', 'Successful', 'Pending', 'Failed', 'Partially Refunded', 'Refunded', 'Successful', 'Successful'];
const METHODS = ['UPI', 'Card', 'UPI', 'Card', 'UPI', 'NetBanking', 'Wallet', 'COD'];

const round2 = (value) => Math.round(value * 100) / 100;

const timelineFor = (payment, createdAt) => {
  const start = new Date(createdAt);
  const earlier = new Date(start.getTime() - 12 * 60 * 1000).toISOString();
  const steps = [
    { at: earlier, label: 'Order placed (demo)' },
    { at: createdAt, label: `Payment marked ${payment.status.toLowerCase()} (demo)` },
  ];
  if (payment.refundAmount > 0) {
    steps.push({
      at: new Date(start.getTime() + 36 * 60 * 60 * 1000).toISOString(),
      label: payment.refundStatus === 'Full' ? 'Full refund recorded (demo)' : 'Partial refund recorded (demo)',
    });
  }
  return steps;
};

const customerOffset = (customerId) =>
  customerId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % STATUS_CYCLE.length;

const buildPayment = (order, orderIndex) => {
  const status = STATUS_CYCLE[(orderIndex + customerOffset(order.customerId)) % STATUS_CYCLE.length];
  const method = METHODS[(orderIndex + customerOffset(order.customerId)) % METHODS.length];
  const collected = status === 'Pending' || status === 'Failed' ? 0 : order.finalAmount;
  const refundAmount =
    status === 'Refunded' ? order.finalAmount : status === 'Partially Refunded' ? round2(order.finalAmount * 0.35) : 0;
  const refundStatus = status === 'Refunded' ? 'Full' : status === 'Partially Refunded' ? 'Partial' : 'None';
  const transactionId = `PAY-${order.orderId.replace('ORD-', '')}`;

  const payment = {
    id: transactionId,
    transactionId,
    orderId: order.orderId,
    customerId: order.customerId,
    brandSlug: order.brandSlug,
    createdAt: order.createdAt,
    method,
    status,
    gatewayRef: method === 'COD' ? '' : `pay_demo_${order.orderId.toLowerCase()}`,
    amountPaid: collected,
    refundAmount,
    refundStatus,
    notes:
      status === 'Failed'
        ? 'Sample authorization failed. No money was collected.'
        : status === 'Pending'
          ? 'Sample payment is still awaiting confirmation.'
          : 'Demonstration payment record only.',
  };

  return { ...payment, timeline: timelineFor(payment, order.createdAt) };
};

export const PAYMENT_RECORDS = PAYMENT_ORDERS.map((order, index) => {
  const siblingIndex = PAYMENT_ORDERS.filter((row) => row.customerId === order.customerId).findIndex(
    (row) => row.orderId === order.orderId
  );
  return buildPayment(order, siblingIndex === -1 ? index : siblingIndex);
});
