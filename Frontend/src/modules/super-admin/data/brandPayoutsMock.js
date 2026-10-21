/**
 * Static demo payout history derived from brand seller targets.
 * Amounts stay consistent with each seller's paid, pending, and failed totals.
 */

import { BRAND_SELLERS, brandFromSlug } from './brandSellersMock';

const METHODS = ['UPI', 'NEFT', 'IMPS', 'UPI', 'NEFT'];

const splitPaise = (totalPaise, parts) => {
  const count = Math.max(parts, 1);
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise - base * count;
  return Array.from({ length: count }, (_, index) => base + (index === count - 1 ? remainder : 0));
};

const shiftDays = (isoDate, daysBack) => {
  const date = new Date(`${isoDate}T10:30:00+05:30`);
  date.setDate(date.getDate() - daysBack);
  return date.toISOString();
};

const moneyFromNet = (netPaise) => {
  const commission = Math.round(netPaise * 0.1);
  const other = Math.round(netPaise * 0.02);
  return {
    net: netPaise / 100,
    commission: commission / 100,
    other: other / 100,
    gross: (netPaise + commission + other) / 100,
  };
};

const buildForSeller = (seller) => {
  const slots = [];
  if (seller.failedAmount > 0) slots.push({ status: 'Failed', netPaise: Math.round(seller.failedAmount * 100) });
  if (seller.pendingAmount > 0) slots.push({ status: 'Pending', netPaise: Math.round(seller.pendingAmount * 100) });
  const completedParts = Math.max(5 - slots.length, 1);
  splitPaise(Math.round(seller.totalPaid * 100), completedParts).forEach((netPaise) => {
    slots.push({ status: 'Completed', netPaise });
  });

  return slots.map((slot, index) => {
    const amounts = moneyFromNet(slot.netPaise);
    const createdAt = shiftDays(seller.lastPayoutDate, (slots.length - 1 - index) * 6);
    const payoutId = `PO-${seller.id.replace('SEL-', '')}-${String(index + 1).padStart(2, '0')}`;
    const reference = `SET-${seller.id.replace('SEL-', '')}-${String(index + 1).padStart(3, '0')}`;
    const utr = `UTRDEMO${seller.id.replace(/\D/g, '')}${String(index + 1).padStart(2, '0')}`;
    return {
      id: `${seller.id}-${payoutId}`,
      payoutId,
      sellerId: seller.id,
      brandSlug: seller.brandSlug,
      createdAt,
      reference,
      gross: amounts.gross,
      commission: amounts.commission,
      otherDeductions: amounts.other,
      net: amounts.net,
      paymentMethod: METHODS[index % METHODS.length],
      utr,
      status: slot.status,
      failureReason:
        slot.status === 'Failed'
          ? 'Sample bank rejection — beneficiary account mismatch in this demo record.'
          : '',
      notes:
        slot.status === 'Completed'
          ? 'Sample settlement marked completed. No bank transfer was sent.'
          : slot.status === 'Pending'
            ? 'Waiting in the demo approval queue.'
            : 'Failed in the demo dataset only.',
      timeline: [
        { at: shiftDays(seller.lastPayoutDate, (slots.length - 1 - index) * 6 + 1), label: 'Payout drafted (demo)' },
        {
          at: createdAt,
          label:
            slot.status === 'Completed'
              ? 'Marked completed (demo)'
              : slot.status === 'Pending'
                ? 'Waiting for review (demo)'
                : 'Marked failed (demo)',
        },
      ],
    };
  });
};

const PAYOUTS_BY_SELLER = Object.fromEntries(
  BRAND_SELLERS.map((seller) => [seller.id, buildForSeller(seller)])
);

const round2 = (value) => Math.round(value * 100) / 100;

export const sellerPayoutStatus = (seller) => {
  if (seller.pendingAmount > 0) return 'Pending';
  if (seller.failedAmount > 0) return 'Failed';
  return 'Paid';
};

export const getSellerPayouts = (sellerId) => PAYOUTS_BY_SELLER[sellerId] || [];

export const getPayoutById = (sellerId, payoutId) =>
  getSellerPayouts(sellerId).find((payout) => payout.payoutId === payoutId) || null;

export const enrichSeller = (seller) => {
  const payouts = getSellerPayouts(seller.id);
  const sales = round2(payouts.reduce((sum, payout) => sum + payout.gross, 0));
  const commission = round2(payouts.reduce((sum, payout) => sum + payout.commission, 0));
  return {
    ...seller,
    sales,
    commission,
    status: sellerPayoutStatus(seller),
  };
};

export const getBrandSellers = (slug) =>
  BRAND_SELLERS.filter((seller) => seller.brandSlug === slug).map(enrichSeller);

export const getBrandSeller = (slug, sellerId) =>
  getBrandSellers(slug).find((seller) => seller.id === sellerId) || null;

export const getBrandSummary = (slug) => {
  const sellers = getBrandSellers(slug);
  const completed = round2(sellers.reduce((sum, seller) => sum + seller.totalPaid, 0));
  const pending = round2(sellers.reduce((sum, seller) => sum + seller.pendingAmount, 0));
  const failed = round2(sellers.reduce((sum, seller) => sum + seller.failedAmount, 0));
  return {
    brand: brandFromSlug(slug),
    totalSellers: sellers.length,
    totalPayouts: round2(completed + pending + failed),
    completed,
    pending,
    failed,
  };
};
