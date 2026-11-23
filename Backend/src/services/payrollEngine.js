/**
 * Payroll calculation engine. PURE: no database, no clock. Given the salary structure(s), the attendance records,
 * the approved leaves and the holidays of a period it returns the earning / deduction lines.
 *
 * Units used so that no floating point is ever needed:
 *   money  = integer paise
 *   days   = "centi-days": 100 = one full day, 50 = a half day
 *   time   = integer minutes
 * Every proportional amount is computed as (a * b * ...) / (c * ...) in one exact step, rounded half up (utils/payrollMoney.js).
 *
 * The exact rules are documented in Backend/docs/PAYROLL.md.
 */
import { ratio } from '../utils/payrollMoney.js';

const pad = (n) => String(n).padStart(2, '0');
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const toDate = (ds) => { const m = ISO.exec(ds); return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); };
const fromDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const eachDay = (from, to) => { const out = []; for (let d = toDate(from); fromDate(d) <= to; d = new Date(d.getTime() + 86400000)) out.push(fromDate(d)); return out; };
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const weekdayOf = (ds) => WD[toDate(ds).getUTCDay()];
export const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

/** The structure that applies on a date (versions never overlap; the newest version wins if data is odd). */
export const structureFor = (structures, ds) => {
  let hit = null;
  for (const s of structures) {
    if (s.effectiveFrom <= ds && (!s.effectiveTo || ds <= s.effectiveTo)) { if (!hit || s.version > hit.version) hit = s; }
  }
  return hit;
};

const LABEL = {
  BASIC: 'Basic earnings',
  OVERTIME: 'Overtime',
  ABSENT: 'Absent days',
  UNPAID_LEAVE: 'Unpaid leave',
  HALF_DAY: 'Half days',
  LATE: 'Late arrivals',
};

export const calculateAttendancePay = ({
  periodFrom,
  periodTo,
  structures,
  joiningDate = null,
  records = new Map(),
  leaves = [],
  holidays = new Set(),
  overtime = { mode: 'MANUAL', approvedMinutes: 0 },
}) => {
  const warnings = [];
  const warned = new Set();
  const warn = (key, text) => { if (!warned.has(key)) { warned.add(key); warnings.push(text); } };
  const groups = new Map();
  const days = [];
  const counts = { eligibleDays: 0, present: 0, late: 0, halfDay: 0, paidLeave: 0, unpaidLeave: 0, absent: 0, holiday: 0, weeklyOff: 0, workedOnOffDay: 0 };
  let workedMinutesTotal = 0;
  let lateMinutesTotal = 0;

  const leaveFor = (ds) => leaves.find((l) => l.startDate <= ds && ds <= l.endDate) || null;

  for (const ds of eachDay(periodFrom, periodTo)) {
    const s = structureFor(structures, ds);
    if (!s) { days.push({ date: ds, cls: 'NO_STRUCTURE', payableCenti: 0 }); warn('nostruct', 'Some days of the period have no salary structure in force and are not paid.'); continue; }
    if (joiningDate && ds < joiningDate) { days.push({ date: ds, cls: 'NOT_JOINED', payableCenti: 0 }); continue; }

    const T = s.salaryType;
    const ym = ds.slice(0, 7);
    const key = T === 'MONTHLY' ? `${s.version}|${ym}` : `${s.version}`;
    if (!groups.has(key)) {
      groups.set(key, { key, s, ym, E: 0, payableCenti: 0, payableMinutes: 0, short: { ABSENT: 0, UNPAID_LEAVE: 0, HALF_DAY: 0 }, lates: 0, ot: 0, units: 0 });
    }
    const g = groups.get(key);
    const offs = new Set(s.weeklyOffDays || []);
    const isHol = holidays.has(ds);
    const isOff = offs.has(weekdayOf(ds));
    const rec = records.get(ds) || null;
    const leave = leaveFor(ds);
    const whm = s.workingMinutesPerDay;
    const worked = rec ? Math.max(0, rec.totalDurationMinutes || 0) : 0;
    const hasWork = Boolean(rec && rec.checkIn && ['Present', 'Late', 'Half Day', 'Incomplete'].includes(rec.status));
    counts.eligibleDays += 1;

    const day = { date: ds, cls: '', payableCenti: 0, workedMinutes: worked, lateMinutes: 0, note: '' };

    if (isHol || isOff) {
      day.cls = isHol ? 'HOLIDAY' : 'WEEKLY_OFF';
      counts[isHol ? 'holiday' : 'weeklyOff'] += 1;
      if (T === 'MONTHLY') { if (s.monthlyBasis === 'CALENDAR_DAYS') g.E += 1; }
      else if (T === 'WEEKLY' && s.weeklyMode === 'FIXED_WEEKLY') g.E += 1;
      else {
        const paid = isHol ? s.paidHolidays : s.paidWeeklyOffs;
        let credit = paid ? 100 : 0;
        let mins = paid ? whm : 0;
        if (hasWork) {
          counts.workedOnOffDay += 1;
          day.note = 'Worked on a ' + (isHol ? 'holiday' : 'weekly off');
          credit = rec.status === 'Half Day' ? Math.max(credit, 50) : 100;
          mins = Math.max(mins, Math.min(worked, whm));
          if (s.overtimeEnabled && worked > whm) g.ot += worked - whm;
        }
        g.payableCenti += credit;
        g.payableMinutes += mins;
        day.payableCenti = credit;
      }
      if (hasWork && (T === 'MONTHLY' || (T === 'WEEKLY' && s.weeklyMode === 'FIXED_WEEKLY'))) {
        counts.workedOnOffDay += 1;
        day.note = 'Worked on a ' + (isHol ? 'holiday' : 'weekly off') + ' (no extra pay in a fixed salary; grant a bonus or compensatory off)';
        warn(`off-${ds}`, `${ds}: worked on a ${isHol ? 'holiday' : 'weekly off'}. A fixed salary pays nothing extra; add a bonus if it should be paid.`);
      }
      days.push(day);
      continue;
    }

    // ── a working day ──
    const fixed = T === 'MONTHLY' || (T === 'WEEKLY' && s.weeklyMode === 'FIXED_WEEKLY');
    if (T === 'MONTHLY' && s.monthlyBasis === 'WORKING_DAYS') g.E += 1;
    else if (T === 'MONTHLY') g.E += 1;
    else if (T === 'WEEKLY' && s.weeklyMode === 'FIXED_WEEKLY') g.E += 1;

    let credit = 0;
    let mins = 0;
    const paidType = (l) => (s.paidLeaveTypes || []).includes(l.leaveType);
    const shortfall = (reason, centi) => { g.short[reason] += centi; };

    if (leave && !leave.isHalfDay) {
      const paid = paidType(leave);
      day.cls = paid ? 'PAID_LEAVE' : 'UNPAID_LEAVE';
      day.note = leave.leaveType;
      if (paid) { credit = 100; mins = whm; counts.paidLeave += 1; } else { counts.unpaidLeave += 1; if (s.unpaidLeaveDeductionEnabled) shortfall('UNPAID_LEAVE', 100); else { credit = 100; mins = whm; } }
    } else if (leave && leave.isHalfDay) {
      const paid = paidType(leave);
      day.cls = 'HALF_LEAVE';
      day.note = `${leave.leaveType} (half day)`;
      const wk = hasWork ? 50 : 0;
      credit = wk + (paid ? 50 : 0);
      mins = (hasWork ? Math.min(worked, Math.floor(whm / 2)) : 0) + (paid ? Math.floor(whm / 2) : 0);
      if (!paid) { counts.unpaidLeave += 0.5; if (s.unpaidLeaveDeductionEnabled) shortfall('UNPAID_LEAVE', 50); else credit += 50; }
      else counts.paidLeave += 0.5;
      if (!hasWork) { counts.absent += 0.5; if (s.absentDeductionEnabled) shortfall('ABSENT', 50); else credit += 50; }
      else counts.present += 0.5;
    } else if (rec) {
      switch (rec.status) {
        case 'Present':
        case 'Late':
        case 'Incomplete':
          day.cls = rec.status === 'Late' ? 'LATE' : 'PRESENT';
          credit = 100; mins = Math.min(worked, whm); counts.present += 1;
          if (rec.status === 'Incomplete') { day.note = 'No check-out recorded'; warn(`inc-${ds}`, `${ds}: no check-out recorded; hours may need an adjustment.`); }
          if (rec.status === 'Late') { counts.late += 1; g.lates += 1; day.lateMinutes = rec.lateMinutes || 0; lateMinutesTotal += rec.lateMinutes || 0; }
          if (s.overtimeEnabled && worked > whm) g.ot += worked - whm;
          break;
        case 'Half Day':
          day.cls = 'HALF_DAY'; counts.halfDay += 1; mins = Math.min(worked, whm);
          if (s.halfDayDeductionEnabled) { credit = 50; shortfall('HALF_DAY', 50); } else credit = 100;
          break;
        case 'On Leave':
          day.cls = 'PAID_LEAVE'; credit = 100; mins = whm; counts.paidLeave += 1;
          day.note = 'Marked on leave without a matching leave request';
          warn(`ol-${ds}`, `${ds}: marked "On Leave" without a leave request; treated as paid leave.`);
          break;
        case 'Absent':
          day.cls = 'ABSENT'; counts.absent += 1;
          if (s.absentDeductionEnabled) shortfall('ABSENT', 100); else { credit = 100; mins = whm; }
          break;
        default: // Holiday / Weekly Off recorded on a day the calendar treats as working
          day.cls = 'PRESENT'; credit = 100; mins = whm; counts.present += 1;
          warn(`mm-${ds}`, `${ds}: attendance says "${rec.status}" but it is a working day; treated as paid.`);
      }
    } else {
      day.cls = 'ABSENT'; counts.absent += 1; day.note = 'No attendance recorded';
      if (s.absentDeductionEnabled) shortfall('ABSENT', 100); else { credit = 100; mins = whm; }
    }
    workedMinutesTotal += worked;
    day.payableCenti = credit;
    g.payableCenti += credit;
    g.payableMinutes += mins;
    days.push(day);
  }

  // ── money ──
  const unitsOf = (g) => {
    const { s, ym } = g;
    if (s.salaryType !== 'MONTHLY') return 0;
    if (s.monthlyBasis === 'CALENDAR_DAYS') return daysInMonth(ym);
    const offs = new Set(s.weeklyOffDays || []);
    let n = 0;
    for (const ds of eachDay(`${ym}-01`, `${ym}-${pad(daysInMonth(ym))}`)) if (!offs.has(weekdayOf(ds)) && !holidays.has(ds)) n += 1;
    return n || 1;
  };
  // paise for `c` centi-days of this group's structure
  const dayAmt = (g, c) => {
    const { s } = g; const b = s.baseAmountPaise;
    if (s.salaryType === 'MONTHLY') return ratio([b, c], [g.units, 100]);
    if (s.salaryType === 'WEEKLY') return ratio([b, c], [s.workingDaysPerWeek, 100]);
    if (s.salaryType === 'DAILY') return ratio([b, c], [100]);
    return ratio([b, s.workingMinutesPerDay, c], [60, 100]); // HOURLY
  };
  const otPay = (g, minutes) => {
    const { s } = g; const b = s.baseAmountPaise;
    if (!minutes) return 0;
    if (s.overtimeRateType === 'FIXED_PER_HOUR') return ratio([s.overtimeFixedPerHourPaise, minutes], [60]);
    const m = s.overtimeMultiplierX100;
    if (s.salaryType === 'MONTHLY') return ratio([b, minutes, m], [g.units, s.workingMinutesPerDay, 100]);
    if (s.salaryType === 'WEEKLY') return ratio([b, minutes, m], [s.workingDaysPerWeek, s.workingMinutesPerDay, 100]);
    if (s.salaryType === 'DAILY') return ratio([b, minutes, m], [s.workingMinutesPerDay, 100]);
    return ratio([b, minutes, m], [60, 100]);
  };

  const tot = { BASIC: 0, OVERTIME: 0, ABSENT: 0, UNPAID_LEAVE: 0, HALF_DAY: 0, LATE: 0 };
  const qty = { BASIC: 0, OVERTIME: 0, ABSENT: 0, UNPAID_LEAVE: 0, HALF_DAY: 0, LATE: 0 };
  let otCandidate = 0;
  let otRemaining = overtime.mode === 'AUTO' ? Infinity : Math.max(0, Math.trunc(overtime.approvedMinutes || 0));
  let otApproved = 0;
  const lateAllowanceLeft = new Map();
  for (const g of groups.values()) {
    g.units = unitsOf(g);
    const { s } = g;
    const fixed = s.salaryType === 'MONTHLY' || (s.salaryType === 'WEEKLY' && s.weeklyMode === 'FIXED_WEEKLY');
    let earn;
    if (s.salaryType === 'MONTHLY') earn = ratio([s.baseAmountPaise, g.E], [g.units]);
    else if (s.salaryType === 'WEEKLY' && fixed) earn = ratio([s.baseAmountPaise, g.E], [7]);
    else if (s.salaryType === 'WEEKLY') earn = ratio([s.baseAmountPaise, g.payableCenti], [s.workingDaysPerWeek, 100]);
    else if (s.salaryType === 'DAILY') earn = ratio([s.baseAmountPaise, g.payableCenti], [100]);
    else earn = ratio([s.baseAmountPaise, g.payableMinutes], [60]);
    tot.BASIC += earn;
    qty.BASIC += fixed ? g.E * 100 : s.salaryType === 'HOURLY' ? g.payableMinutes : g.payableCenti;

    if (fixed) {
      for (const r of ['ABSENT', 'UNPAID_LEAVE', 'HALF_DAY']) {
        if (g.short[r]) { tot[r] += dayAmt(g, g.short[r]); qty[r] += g.short[r]; }
      }
    }
    if (s.overtimeEnabled && g.ot) {
      otCandidate += g.ot;
      const take = Math.min(g.ot, otRemaining);
      if (take > 0) { tot.OVERTIME += otPay(g, take); qty.OVERTIME += take; otApproved += take; if (otRemaining !== Infinity) otRemaining -= take; }
    }
    if (s.lateDeductionEnabled && g.lates) {
      const pid = s.version;
      if (!lateAllowanceLeft.has(pid)) lateAllowanceLeft.set(pid, s.lateAllowedPerPeriod);
      const free = Math.min(lateAllowanceLeft.get(pid), g.lates);
      lateAllowanceLeft.set(pid, lateAllowanceLeft.get(pid) - free);
      const extra = g.lates - free;
      if (extra > 0) { tot.LATE += dayAmt(g, extra * s.lateDeductionPercent); qty.LATE += extra; }
    }
  }

  const unit = { BASIC: 'DAY_CENTI', OVERTIME: 'MINUTE', ABSENT: 'DAY_CENTI', UNPAID_LEAVE: 'DAY_CENTI', HALF_DAY: 'DAY_CENTI', LATE: 'COUNT' };
  const lines = [];
  for (const code of ['BASIC', 'OVERTIME']) if (tot[code] || qty[code]) lines.push({ kind: 'EARNING', code, label: LABEL[code], quantity: qty[code], unit: unit[code], amountPaise: tot[code], source: 'SYSTEM' });
  for (const code of ['ABSENT', 'UNPAID_LEAVE', 'HALF_DAY', 'LATE']) if (tot[code]) lines.push({ kind: 'DEDUCTION', code, label: LABEL[code], quantity: qty[code], unit: unit[code], amountPaise: tot[code], source: 'SYSTEM' });
  if (otCandidate > otApproved) warn('ot', `${otCandidate - otApproved} min of overtime is waiting for approval and is not paid yet.`);

  const eligible = counts.eligibleDays;
  const shortAll = [...groups.values()].reduce((t, g) => t + g.short.ABSENT + g.short.UNPAID_LEAVE + g.short.HALF_DAY, 0);
  const anyFixed = [...groups.values()].some((g) => g.s.salaryType === 'MONTHLY' || (g.s.salaryType === 'WEEKLY' && g.s.weeklyMode === 'FIXED_WEEKLY'));
  const paidCenti = anyFixed ? eligible * 100 - shortAll : [...groups.values()].reduce((t, g) => t + g.payableCenti, 0);
  const summary = {
    ...counts,
    workedMinutes: workedMinutesTotal,
    lateMinutes: lateMinutesTotal,
    paidDayCenti: Math.max(0, paidCenti),
    payableMinutes: [...groups.values()].reduce((t, g) => t + g.payableMinutes, 0),
    overtimeCandidateMinutes: otCandidate,
    overtimeApprovedMinutes: otApproved,
    groups: [...groups.values()].map((g) => ({ key: g.key, version: g.s.version, salaryType: g.s.salaryType, units: g.units, eligible: g.E, payableCenti: g.payableCenti, payableMinutes: g.payableMinutes, lates: g.lates, overtimeMinutes: g.ot })),
  };
  return { lines, summary, days, warnings, overtimeCandidateMinutes: otCandidate, overtimeApprovedMinutes: otApproved };
};

/** Totals from final lines (earnings, deductions incl. advance recovery). Net never goes below zero; the uncovered part is reported. */
export const totalsFromLines = (lines) => {
  const gross = lines.filter((l) => l.kind === 'EARNING').reduce((t, l) => t + l.amountPaise, 0);
  const deductions = lines.filter((l) => l.kind === 'DEDUCTION').reduce((t, l) => t + l.amountPaise, 0);
  const advance = lines.filter((l) => l.code === 'ADVANCE_RECOVERY').reduce((t, l) => t + l.amountPaise, 0);
  const raw = gross - deductions;
  return { grossPaise: gross, deductionsPaise: deductions, advanceRecoveryPaise: advance, netPaise: Math.max(0, raw), shortfallPaise: raw < 0 ? -raw : 0 };
};
