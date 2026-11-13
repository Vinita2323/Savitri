/**
 * Canonical city names for seller/brand matching.
 *
 * Google Maps reports Delhi addresses under many names ("New Delhi", "North West Delhi", "NCT of Delhi" ...).
 * Those all normalise to the canonical city "Delhi". Every other city is only trimmed, so an unrelated city can
 * never be mapped to Delhi by accident (Noida, Gurgaon, Ghaziabad and Faridabad stay as they are).
 *
 * NOTE: Frontend/src/utils/cityNormalization.js mirrors this file (the two packages cannot share code).
 * Keep the two in sync; the test-suite compares them.
 */

const DIRECTIONS = ['north east', 'north west', 'south east', 'south west', 'north', 'south', 'east', 'west', 'central'];
const DIR = DIRECTIONS.join('|');

const DELHI_PATTERNS = [
  new RegExp('^(?:(?:' + DIR + ') )?(?:new |old )?delhi$'), // Delhi, New Delhi, West Delhi, North West Delhi, Old Delhi
  new RegExp('^(?:new delhi|delhi) (?:' + DIR + ')$'), // New Delhi Central, Delhi North
  /^(?:nct|national capital territory) of delhi$/,
  /^delhi (?:nct|cantt|cantonment|division)$/,
  /^shahdara(?: delhi)?$/,
];

const fold = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Returns the canonical name for a reported city ('Delhi' for any Delhi variation), or the trimmed input. */
export const normalizeCity = (value) => {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const c = fold(raw);
  if (DELHI_PATTERNS.some((re) => re.test(c))) return 'Delhi';
  return raw;
};

/** Case-insensitive comparison of two city names after normalisation. */
export const sameCity = (a, b) => {
  const x = normalizeCity(a).toLowerCase();
  const y = normalizeCity(b).toLowerCase();
  return Boolean(x) && x === y;
};

/** Delhi PIN codes are 110001-110099: exactly six digits. Other 11xxxx codes are not Delhi and are not mapped. */
export const isDelhiPincode = (pin) => /^1100(?:0[1-9]|[1-9][0-9])$/.test(String(pin ?? '').trim());
