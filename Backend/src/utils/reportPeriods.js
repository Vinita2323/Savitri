/**
 * Day / week / month grouping for reports, in Indian Standard Time.
 * Mongo groups by IST calendar day; days are then rolled up here, so it works on any MongoDB version.
 * Week = Monday to Sunday. Keys: day "2026-10-05", week "2026-10-05" (its Monday), month "2026-10".
 */
const DAY_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nice = (s) => { const [y, m, d] = s.split('-'); return `${d} ${MON[Number(m) - 1]} ${y}`; };

export const PERIODS = ['day', 'week', 'month'];
export const isValidDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(toDate(s).getTime());

/** IST day boundaries for a "YYYY-MM-DD" filter (independent of the server's own timezone) */
export const istStart = (s) => new Date(`${s}T00:00:00.000+05:30`);
export const istEnd = (s) => new Date(`${s}T23:59:59.999+05:30`);

export const periodOf = (day, period) => {
  if (period === 'month') {
    const key = day.slice(0, 7);
    const first = `${key}-01`;
    const last = ymd(new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)));
    return { key, from: first, to: last, label: `${MON[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}` };
  }
  if (period === 'week') {
    const d = toDate(day);
    const back = (d.getUTCDay() + 6) % 7; // Monday = 0
    const mon = ymd(new Date(d.getTime() - back * DAY_MS));
    const sun = ymd(new Date(toDate(mon).getTime() + 6 * DAY_MS));
    return { key: mon, from: mon, to: sun, label: `${nice(mon)} to ${nice(sun)}` };
  }
  return { key: day, from: day, to: day, label: nice(day) };
};

/**
 * Roll IST-day rows up into periods.
 * dayRows: [{ day: 'YYYY-MM-DD', ...numbers }]; sumKeys: the numeric fields to add up.
 * Returns newest first: [{ _id: key, label, from, to, ...sums }]. Money is rounded to 2 decimals once, at the end.
 */
export const rollUp = (dayRows, period, sumKeys) => {
  const by = new Map();
  for (const r of dayRows) {
    if (!r.day) continue;
    const p = periodOf(r.day, period);
    const cur = by.get(p.key) || { _id: p.key, label: p.label, from: p.from, to: p.to, ...Object.fromEntries(sumKeys.map((k) => [k, 0])) };
    sumKeys.forEach((k) => { cur[k] += Number(r[k]) || 0; });
    by.set(p.key, cur);
  }
  return [...by.values()]
    .map((r) => { sumKeys.forEach((k) => { r[k] = Math.round(r[k] * 100) / 100; }); return r; })
    .sort((a, b) => b._id.localeCompare(a._id));
};
