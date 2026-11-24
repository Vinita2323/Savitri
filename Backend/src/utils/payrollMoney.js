/**
 * Decimal-safe money helpers. All money in the payroll module is an INTEGER number of paise (1 rupee = 100 paise).
 * Floating point is never used for a financial result: amounts are parsed from decimal strings, and every
 * proportional calculation goes through mulDiv(), which multiplies first and divides once using BigInt
 * (exact), rounding half up.
 */

export class MoneyError extends Error {}

/** "1234.5" | 1234.5 | "₹1,234.50" -> 123450. Refuses more than 2 decimals, negatives and non numbers. */
export const toPaise = (value, { allowZero = true, max = 100000000 } = {}) => {
  if (value === null || value === undefined || value === '') throw new MoneyError('Amount is required.');
  const s = String(value).replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new MoneyError('Enter a valid amount with at most 2 decimals.');
  const [r, p = ''] = s.split('.');
  const paise = Number(r) * 100 + Number(p.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) throw new MoneyError('Amount is too large.');
  if (!allowZero && paise === 0) throw new MoneyError('Amount must be greater than zero.');
  if (paise > max * 100) throw new MoneyError('Amount is too large.');
  return paise;
};

/** a * b / c, rounded half up, exact (BigInt). a, b, c are integers; result is a safe integer. */
export const mulDiv = (a, b, c) => {
  if (!c) throw new MoneyError('Division by zero.');
  const A = BigInt(Math.trunc(a));
  const B = BigInt(Math.trunc(b));
  const C = BigInt(Math.trunc(c));
  const neg = (A * B < 0n) !== (C < 0n);
  const n = (A * B < 0n ? -(A * B) : A * B);
  const d = C < 0n ? -C : C;
  const q = (2n * n + d) / (2n * d); // round half up on the magnitude
  const out = neg ? -q : q;
  return Number(out);
};

/** (n1 * n2 * ...) / (d1 * d2 * ...), exact (BigInt), rounded half up. For calculations with more than one factor. */
export const ratio = (nums, dens) => {
  let n = 1n;
  nums.forEach((x) => { n *= BigInt(Math.trunc(x)); });
  let d = 1n;
  dens.forEach((x) => { d *= BigInt(Math.trunc(x)); });
  if (d === 0n) throw new MoneyError('Division by zero.');
  const neg = (n < 0n) !== (d < 0n);
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (2n * an + ad) / (2n * ad);
  return Number(neg ? -q : q);
};

export const sum =(arr) => arr.reduce((t, x) => t + x, 0);

/** 123450 -> "1,234.50" */
export const fmtPaise = (p) => {
  const n = Math.trunc(Number(p) || 0);
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const r = String(Math.trunc(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${r}.${String(a % 100).padStart(2, '0')}`;
};

/** 123450 -> "1234.50" (plain, for spreadsheets and inputs) */
export const plainPaise = (p) => {
  const n = Math.trunc(Number(p) || 0);
  const a = Math.abs(n);
  return `${n < 0 ? '-' : ''}${Math.trunc(a / 100)}.${String(a % 100).padStart(2, '0')}`;
};
