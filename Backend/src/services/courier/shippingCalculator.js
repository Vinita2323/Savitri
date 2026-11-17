// Pure shipping maths (no DB, no provider). Courier rates always come from the provider / rate card passed in;
// nothing here knows any real courier price.

export const VOLUMETRIC_DIVISOR = 5000; // cm3 per kg, the common surface-courier convention

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pos = (n) => Number.isFinite(Number(n)) && Number(n) > 0;

/** Validate package weight (kg) and dimensions (cm). Returns an array of problems (empty = valid). */
export const validatePackage = (pkg = {}) => {
  const problems = [];
  if (!pos(pkg.weightKg)) problems.push('weight must be greater than 0 kg');
  else if (Number(pkg.weightKg) > 1000) problems.push('weight is unrealistically high');
  for (const k of ['length', 'breadth', 'height']) {
    if (!pos(pkg[k])) problems.push(`${k} must be greater than 0 cm`);
    else if (Number(pkg[k]) > 500) problems.push(`${k} is unrealistically large`);
  }
  return problems;
};

export const volumetricWeightKg = ({ length, breadth, height }) => round2((Number(length) * Number(breadth) * Number(height)) / VOLUMETRIC_DIVISOR);

/** Chargeable weight = the larger of actual and volumetric, rounded UP to the next slab (default 0.5 kg). */
export const chargeableWeightKg = (pkg, slabKg = 0.5) => {
  const actual = Number(pkg.weightKg);
  const volumetric = volumetricWeightKg(pkg);
  const raw = Math.max(actual, volumetric);
  const slabs = Math.max(1, Math.ceil(raw / slabKg - 1e-9));
  return { actualKg: round2(actual), volumetricKg: volumetric, chargeableKg: round2(slabs * slabKg), slabKg };
};

/**
 * rate card: { firstSlabCharge, additionalSlabCharge, slabKg, fuelPercent?, codFlat?, codPercent? }
 * options: { paymentMethod, codAmount, discount (flat), discountPercent }
 * Returns a line-item breakdown so the UI / admin can show how the charge was built.
 */
export const calculateShippingCharge = ({ chargeableKg, rate, paymentMethod = 'PREPAID', codAmount = 0, discount = 0, discountPercent = 0 }) => {
  if (!rate || !pos(chargeableKg)) return { ok: false, message: 'Rate card and chargeable weight are required' };
  const slab = rate.slabKg || 0.5;
  const slabs = Math.max(1, Math.ceil(chargeableKg / slab - 1e-9));
  const freight = round2(Number(rate.firstSlabCharge) + (slabs - 1) * Number(rate.additionalSlabCharge || 0));
  const fuel = round2((freight * Number(rate.fuelPercent || 0)) / 100);
  const isCod = String(paymentMethod).toUpperCase() === 'COD';
  const cod = isCod ? round2(Math.max(Number(rate.codFlat || 0), (Number(codAmount) * Number(rate.codPercent || 0)) / 100)) : 0;
  const gross = round2(freight + fuel + cod);
  const disc = round2(Math.min(gross, Math.max(0, Number(discount) || 0) + (gross * Math.max(0, Number(discountPercent) || 0)) / 100));
  return { ok: true, slabs, freight, fuel, cod, gross, discount: disc, total: round2(gross - disc), currency: 'INR' };
};

/** Aggregate a fulfilment's item snapshots into one package: weights add up, footprint = largest, height stacks. */
export const packageFromItems = (items = []) => {
  if (!items.length) return { complete: false, missing: 'items' };
  let weightKg = 0; let length = 0; let breadth = 0; let height = 0;
  for (const it of items) {
    const q = Number(it.quantity) || 1;
    if (!pos(it.weightKg) || !pos(it.length) || !pos(it.breadth) || !pos(it.height)) {
      return { complete: false, missing: it.name || 'an item' };
    }
    weightKg += Number(it.weightKg) * q;
    length = Math.max(length, Number(it.length));
    breadth = Math.max(breadth, Number(it.breadth));
    height += Number(it.height) * q;
  }
  return { complete: true, weightKg: round2(weightKg), length: round2(length), breadth: round2(breadth), height: round2(height) };
};
