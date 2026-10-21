/** Static demo orders for customer payments. Amounts are sample figures only. */

import { PAYMENT_CUSTOMERS } from './paymentCustomersMock';

const CATALOG = {
  'auriva-bites': [
    ['Basmati Rice 5kg', 649],
    ['Cold Pressed Mustard Oil 1L', 320],
    ['Toor Dal 1kg', 168],
    ['Whole Wheat Atta 10kg', 520],
    ['Jaggery 1kg', 95],
    ['Filter Coffee 250g', 210],
  ],
  'quick-commerce': [
    ['Toned Milk 1L', 68],
    ['Brown Bread', 55],
    ['Farm Eggs 12pc', 96],
    ['Banana Dozen', 72],
    ['Greek Yogurt', 140],
    ['Mixed Fruit Pack', 189],
  ],
  shippnex: [
    ['Same-day Parcel', 149],
    ['Document Envelope', 79],
    ['Medium Carton', 220],
    ['Express Bike Drop', 99],
  ],
  medcred: [
    ['Vitamin D3 Strip', 240],
    ['Digital Thermometer', 349],
    ['ORS Pack', 85],
    ['Hand Sanitizer 500ml', 160],
    ['BP Monitor', 1299],
  ],
};

const ORDER_STATUS = ['Delivered', 'Delivered', 'Processing', 'Cancelled', 'Delivered', 'Returned', 'Delivered', 'Out for delivery'];

const round2 = (value) => Math.round(value * 100) / 100;

const purchasedAt = (customerIndex, orderIndex) => {
  const date = new Date('2026-10-20T15:30:00+05:30');
  date.setDate(date.getDate() - (customerIndex * 2 + orderIndex * 4));
  date.setHours(9 + (orderIndex % 8), (orderIndex * 7) % 60, 0, 0);
  return date.toISOString();
};

const buildOrder = (customer, customerIndex, orderIndex) => {
  const catalog = CATALOG[customer.brandSlug] || CATALOG['auriva-bites'];
  const first = orderIndex % catalog.length;
  const second = (orderIndex + 2) % catalog.length;
  const picks = orderIndex % 3 === 0 ? [catalog[first]] : [catalog[first], catalog[second]];
  const items = picks.map(([name, price], itemIndex) => ({
    name,
    quantity: 1 + ((orderIndex + itemIndex) % 3),
    price,
  }));
  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const discount = orderIndex % 2 === 0 ? Math.min(80, round2(subtotal * 0.05)) : 0;
  const taxable = subtotal - discount;
  const tax = round2(taxable * 0.05);
  const delivery = customer.brandSlug === 'shippnex' ? 0 : 40;
  const finalAmount = round2(taxable + tax + delivery);
  const orderId = `ORD-${customer.id}-${String(orderIndex + 1).padStart(2, '0')}`;

  return {
    id: orderId,
    orderId,
    customerId: customer.id,
    brandSlug: customer.brandSlug,
    createdAt: purchasedAt(customerIndex, orderIndex),
    items,
    subtotal,
    discount,
    tax,
    delivery,
    finalAmount,
    orderStatus: ORDER_STATUS[orderIndex % ORDER_STATUS.length],
  };
};

export const PAYMENT_ORDERS = PAYMENT_CUSTOMERS.flatMap((customer, customerIndex) =>
  Array.from({ length: customer.orderCount }, (_, orderIndex) => buildOrder(customer, customerIndex, orderIndex))
);
