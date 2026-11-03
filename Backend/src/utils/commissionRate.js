import CommissionSettings from '../models/CommissionSettings.model.js';

/** The seller commission that was hard-coded before the global setting existed. */
export const LEGACY_DEFAULT_SELLER_COMMISSION = 10;

/**
 * Does this seller carry its own commission rate (an override of the global default)?
 *  - hasCustomCommission === true  -> custom
 *  - hasCustomCommission === false -> follows the global default (after a reset)
 *  - flag unset (legacy record)    -> custom only if the stored rate differs from the old default of 10
 */
export const sellerHasCustomCommission = (seller) => {
  if (!seller) return false;
  const stored = seller.commissionPercentage;
  if (stored === null || stored === undefined || !Number.isFinite(Number(stored))) return false;
  if (seller.hasCustomCommission === true) return true;
  if (seller.hasCustomCommission === false) return false;
  return Number(stored) !== LEGACY_DEFAULT_SELLER_COMMISSION;
};

/** Effective commission % for a seller given the global default. Pure - safe to call per order. */
export const resolveSellerCommissionRate = (seller, globalRate) => {
  if (sellerHasCustomCommission(seller)) return Number(seller.commissionPercentage);
  const g = Number(globalRate);
  return Number.isFinite(g) ? g : LEGACY_DEFAULT_SELLER_COMMISSION;
};

export const getGlobalSellerCommission = async () => {
  const settings = await CommissionSettings.getOrCreateActiveSettings();
  const g = Number(settings?.sellerCommission);
  return Number.isFinite(g) ? g : LEGACY_DEFAULT_SELLER_COMMISSION;
};

/**
 * Strict percentage parser: only a real number (or a plain numeric string) between 0 and 100.
 * null / '' / true / arrays / "5%" are rejected rather than silently coerced to 0 or 1.
 */
export const parseCommissionPercent = (value) => {
  let n;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && /^\d+(\.\d{1,4})?$/.test(value.trim())) n = Number(value.trim());
  else return null;
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10000) / 10000;
};
