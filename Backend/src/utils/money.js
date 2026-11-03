/** Money helpers. The treasury book stores integer paise so debits and credits balance exactly. */
export const toPaise = (rupees) => {
  const n = typeof rupees === 'string' ? Number(rupees.trim()) : rupees;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n * 100);
};
export const fromPaise = (paise) => Math.round(Number(paise || 0)) / 100;
export const isPositiveInt = (n) => Number.isInteger(n) && n > 0;
