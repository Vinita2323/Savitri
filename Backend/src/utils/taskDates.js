// Task dates picked in the UI are plain calendar days ("2026-11-25"). A bare day must mean the Indian calendar day (IST),
// not midnight UTC: a deadline of "25 Nov" is the END of 25 Nov (a task is only overdue once that day is over),
// and a start date is the START of its day. Full timestamps are passed through unchanged.
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const parseTaskDate = (value, { endOfDay = false } = {}) => {
  if (value instanceof Date) return value;
  const s = String(value ?? '').trim();
  if (DAY_ONLY.test(s)) return new Date(`${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`);
  return new Date(s);
};
