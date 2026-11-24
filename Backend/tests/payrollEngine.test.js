import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAttendancePay, totalsFromLines, eachDay, weekdayOf } from '../src/services/payrollEngine.js';
import { toPaise, mulDiv, ratio, fmtPaise } from '../src/utils/payrollMoney.js';

const base = {
  version: 1, salaryType: 'MONTHLY', baseAmountPaise: 3000000, paymentFrequency: 'MONTHLY', effectiveFrom: '2026-01-01', effectiveTo: null,
  workingDaysPerWeek: 6, weeklyOffDays: ['Sunday'], workingMinutesPerDay: 480, monthlyBasis: 'CALENDAR_DAYS', weeklyMode: 'FIXED_WEEKLY',
  overtimeEnabled: false, overtimeRateType: 'MULTIPLIER', overtimeMultiplierX100: 150, overtimeFixedPerHourPaise: 0,
  lateDeductionEnabled: false, lateAllowedPerPeriod: 3, lateDeductionPercent: 25, halfDayDeductionEnabled: true,
  unpaidLeaveDeductionEnabled: true, absentDeductionEnabled: true,
  paidLeaveTypes: ['Casual Leave', 'Sick Leave', 'Earned Leave'], paidWeeklyOffs: false, paidHolidays: false,
};
const rec = (status, extra = {}) => ({ status, checkIn: status === 'Absent' || status === 'On Leave' ? null : new Date('2026-11-02T09:30:00+05:30'), totalDurationMinutes: 480, lateMinutes: 0, ...extra });
// November 2026: 1st is a Sunday, 30 days, 5 Sundays (1, 8, 15, 22, 29) => 25 working days
const NOV = { periodFrom: '2026-11-01', periodTo: '2026-11-30' };
const workingNov = eachDay(NOV.periodFrom, NOV.periodTo).filter((d) => weekdayOf(d) !== 'Sunday');
const allPresent = () => new Map(workingNov.map((d) => [d, rec('Present')]));
const line = (r, code) => r.lines.find((l) => l.code === code);
const net = (r) => totalsFromLines(r.lines);

test('money: exact parsing and rounding', () => {
  assert.equal(toPaise('1234.5'), 123450);
  assert.equal(toPaise('0.07'), 7);
  assert.equal(toPaise('19.99') + toPaise('0.01'), 2000); // no float drift
  assert.throws(() => toPaise('1.234'));
  assert.throws(() => toPaise('-5'));
  assert.throws(() => toPaise('abc'));
  assert.equal(mulDiv(100, 1, 3), 33);
  assert.equal(mulDiv(100, 1, 6), 17); // half up
  assert.equal(ratio([3000000, 75], [30, 100]), 75000);
  assert.equal(fmtPaise(123450), '1,234.50');
});

test('MONTHLY calendar basis: full month, absences, unpaid leave, half day, paid leave', () => {
  const records = allPresent();
  records.set('2026-11-03', rec('Absent'));
  records.set('2026-11-04', rec('Absent'));
  records.set('2026-11-10', rec('On Leave'));
  records.set('2026-11-11', rec('Half Day', { totalDurationMinutes: 200 }));
  records.set('2026-11-12', rec('On Leave'));
  const leaves = [
    { leaveType: 'Unpaid Leave', startDate: '2026-11-10', endDate: '2026-11-10', isHalfDay: false },
    { leaveType: 'Casual Leave', startDate: '2026-11-12', endDate: '2026-11-12', isHalfDay: false },
  ];
  const r = calculateAttendancePay({ ...NOV, structures: [base], records, leaves });
  assert.equal(line(r, 'BASIC').amountPaise, 3000000);
  assert.equal(line(r, 'ABSENT').amountPaise, 200000); // 2 days x 1,000.00
  assert.equal(line(r, 'UNPAID_LEAVE').amountPaise, 100000);
  assert.equal(line(r, 'HALF_DAY').amountPaise, 50000);
  assert.equal(net(r).netPaise, 3000000 - 350000);
  assert.equal(r.summary.paidLeave, 1);
  assert.equal(r.summary.unpaidLeave, 1);
  assert.equal(r.summary.absent, 2);
});

test('MONTHLY working-days basis uses 25 working days as the divisor', () => {
  const records = allPresent();
  records.set('2026-11-03', rec('Absent'));
  records.set('2026-11-04', rec('Absent'));
  const r = calculateAttendancePay({ ...NOV, structures: [{ ...base, monthlyBasis: 'WORKING_DAYS' }], records });
  assert.equal(line(r, 'BASIC').amountPaise, 3000000);
  assert.equal(line(r, 'ABSENT').amountPaise, 240000); // 30000 / 25 = 1200 per day
});

test('a public holiday on a working day is paid and never deducted', () => {
  const records = allPresent();
  records.delete('2026-11-09');
  const r = calculateAttendancePay({ ...NOV, structures: [base], records, holidays: new Set(['2026-11-09']) });
  assert.equal(line(r, 'ABSENT'), undefined);
  assert.equal(net(r).netPaise, 3000000);
});

test('missing attendance on a past working day counts as absent; weekly offs never do', () => {
  const r = calculateAttendancePay({ ...NOV, structures: [base], records: new Map() });
  assert.equal(r.summary.absent, 25);
  assert.equal(line(r, 'ABSENT').amountPaise, 2500000);
  assert.equal(net(r).netPaise, 500000); // only the 5 Sundays are paid
});

test('joining mid month prorates the earnings by eligible days', () => {
  const r = calculateAttendancePay({ ...NOV, structures: [base], joiningDate: '2026-11-16', records: new Map(workingNov.filter((d) => d >= '2026-11-16').map((d) => [d, rec('Present')])) });
  assert.equal(line(r, 'BASIC').amountPaise, 1500000); // 15 of 30 days
  assert.equal(line(r, 'ABSENT'), undefined);
});

test('salary change mid period: each part uses the structure in force on that date', () => {
  const v1 = { ...base, version: 1, effectiveTo: '2026-11-15' };
  const v2 = { ...base, version: 2, effectiveFrom: '2026-11-16', baseAmountPaise: 6000000 };
  const r = calculateAttendancePay({ ...NOV, structures: [v1, v2], records: allPresent() });
  assert.equal(line(r, 'BASIC').amountPaise, 1500000 + 3000000);
});

test('late arrivals: free allowance, then a percentage of a day for each extra late; no double deduction with half days', () => {
  const s = { ...base, lateDeductionEnabled: true, lateAllowedPerPeriod: 2, lateDeductionPercent: 25 };
  const records = allPresent();
  ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].forEach((d) => records.set(d, rec('Late', { lateMinutes: 20 })));
  records.set('2026-11-07', rec('Half Day', { lateMinutes: 90, totalDurationMinutes: 200 }));
  const r = calculateAttendancePay({ ...NOV, structures: [s], records });
  assert.equal(r.summary.late, 5);
  assert.equal(line(r, 'LATE').amountPaise, 75000); // 3 extra x 25% x 1,000.00
  assert.equal(line(r, 'HALF_DAY').amountPaise, 50000); // the half day is deducted once, not also as a late
});

test('half-day leave: paid leave plus a worked half is a full day', () => {
  const records = allPresent();
  records.set('2026-11-03', { ...rec('Half Day'), totalDurationMinutes: 240 });
  const leaves = [{ leaveType: 'Casual Leave', startDate: '2026-11-03', endDate: '2026-11-03', isHalfDay: true }];
  const r = calculateAttendancePay({ ...NOV, structures: [base], records, leaves });
  assert.equal(line(r, 'HALF_DAY'), undefined);
  assert.equal(net(r).netPaise, 3000000);
});

test('half-day UNPAID leave with a worked half deducts half a day', () => {
  const records = allPresent();
  const leaves = [{ leaveType: 'Unpaid Leave', startDate: '2026-11-03', endDate: '2026-11-03', isHalfDay: true }];
  const r = calculateAttendancePay({ ...NOV, structures: [base], records, leaves });
  assert.equal(line(r, 'UNPAID_LEAVE').amountPaise, 50000);
});

test('deduction switches off: absent / unpaid leave / half day not deducted when disabled', () => {
  const s = { ...base, absentDeductionEnabled: false, unpaidLeaveDeductionEnabled: false, halfDayDeductionEnabled: false };
  const records = allPresent();
  records.set('2026-11-03', rec('Absent'));
  records.set('2026-11-04', rec('Half Day'));
  const r = calculateAttendancePay({ ...NOV, structures: [s], records });
  assert.equal(r.lines.filter((l) => l.kind === 'DEDUCTION').length, 0);
});

test('DAILY wage: payable days x rate, half days count 0.5, weekly offs unpaid by default', () => {
  const s = { ...base, salaryType: 'DAILY', baseAmountPaise: 80000, paymentFrequency: 'DAILY' };
  const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
  const records = new Map(days.map((d) => [d, rec('Present')]));
  records.set('2026-11-13', rec('Half Day'));
  records.set('2026-11-14', rec('Half Day'));
  const r = calculateAttendancePay({ ...NOV, structures: [s], records });
  assert.equal(line(r, 'BASIC').amountPaise, 11 * 80000);
  const paidSun = calculateAttendancePay({ ...NOV, structures: [{ ...s, paidWeeklyOffs: true }], records });
  assert.equal(line(paidSun, 'BASIC').amountPaise, (11 + 5) * 80000);
});

test('DAILY wage: working on a weekly off is paid', () => {
  const s = { ...base, salaryType: 'DAILY', baseAmountPaise: 80000, paymentFrequency: 'DAILY' };
  const records = new Map([['2026-11-08', rec('Present')]]); // a Sunday
  const r = calculateAttendancePay({ periodFrom: '2026-11-08', periodTo: '2026-11-08', structures: [s], records });
  assert.equal(line(r, 'BASIC').amountPaise, 80000);
});

test('HOURLY: payable hours x rate, paid leave counts a full working day, overtime only when approved', () => {
  const s = { ...base, salaryType: 'HOURLY', baseAmountPaise: 15000, paymentFrequency: 'WEEKLY', overtimeEnabled: true };
  const records = new Map([
    ['2026-11-02', rec('Present')], ['2026-11-03', rec('Present')], ['2026-11-04', rec('Present')], ['2026-11-05', rec('Present')],
    ['2026-11-06', rec('Present', { totalDurationMinutes: 600 })], // 2 h over
    ['2026-11-07', rec('On Leave')],
  ]);
  const leaves = [{ leaveType: 'Sick Leave', startDate: '2026-11-07', endDate: '2026-11-07', isHalfDay: false }];
  const win = { periodFrom: '2026-11-02', periodTo: '2026-11-08' };
  const manual0 = calculateAttendancePay({ ...win, structures: [s], records, leaves, overtime: { mode: 'MANUAL', approvedMinutes: 0 } });
  assert.equal(line(manual0, 'BASIC').amountPaise, 6 * 8 * 15000); // 5 worked days (capped at 8h) + 1 paid sick day
  assert.equal(line(manual0, 'OVERTIME'), undefined);
  assert.equal(manual0.overtimeCandidateMinutes, 120);
  const auto = calculateAttendancePay({ ...win, structures: [s], records, leaves, overtime: { mode: 'AUTO' } });
  assert.equal(line(auto, 'OVERTIME').amountPaise, 15000 * 2 * 1.5); // 2 h x 150.00 x 1.5
  const part = calculateAttendancePay({ ...win, structures: [s], records, leaves, overtime: { mode: 'MANUAL', approvedMinutes: 60 } });
  assert.equal(line(part, 'OVERTIME').amountPaise, 22500);
  const fixedRate = calculateAttendancePay({ ...win, structures: [{ ...s, overtimeRateType: 'FIXED_PER_HOUR', overtimeFixedPerHourPaise: 30000 }], records, leaves, overtime: { mode: 'AUTO' } });
  assert.equal(line(fixedRate, 'OVERTIME').amountPaise, 60000);
});

test('overtime is ignored when the structure does not allow it', () => {
  const records = allPresent();
  records.set('2026-11-02', rec('Present', { totalDurationMinutes: 700 }));
  const r = calculateAttendancePay({ ...NOV, structures: [base], records, overtime: { mode: 'AUTO' } });
  assert.equal(line(r, 'OVERTIME'), undefined);
});

test('MONTHLY overtime rate is derived from the monthly salary', () => {
  const s = { ...base, overtimeEnabled: true };
  const records = allPresent();
  records.set('2026-11-02', rec('Present', { totalDurationMinutes: 600 })); // 120 min overtime
  const r = calculateAttendancePay({ ...NOV, structures: [s], records, overtime: { mode: 'AUTO' } });
  // hourly = 30000 / 30 / 8 = 125.00; x 2 h x 1.5 = 375.00
  assert.equal(line(r, 'OVERTIME').amountPaise, 37500);
});

test('WEEKLY fixed: weekly amount, prorated by days, absence costs 1/6 of the week', () => {
  const s = { ...base, salaryType: 'WEEKLY', baseAmountPaise: 600000, paymentFrequency: 'WEEKLY', weeklyMode: 'FIXED_WEEKLY' };
  const week = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
  const records = new Map(week.map((d) => [d, rec('Present')]));
  records.set('2026-11-04', rec('Absent'));
  const r = calculateAttendancePay({ periodFrom: '2026-11-02', periodTo: '2026-11-08', structures: [s], records });
  assert.equal(line(r, 'BASIC').amountPaise, 600000);
  assert.equal(line(r, 'ABSENT').amountPaise, 100000);
});

test('WEEKLY daily-rate based: weekly amount / working days per week x payable days', () => {
  const s = { ...base, salaryType: 'WEEKLY', baseAmountPaise: 600000, paymentFrequency: 'WEEKLY', weeklyMode: 'DAILY_RATE' };
  const records = new Map(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map((d) => [d, rec('Present')]));
  const r = calculateAttendancePay({ periodFrom: '2026-11-02', periodTo: '2026-11-08', structures: [s], records });
  assert.equal(line(r, 'BASIC').amountPaise, 500000);
});

test('rounding is done once per line, half up, and money never drifts', () => {
  const s = { ...base, baseAmountPaise: 1000000 }; // 10,000.00 over 30 days = 333.33... per day
  const records = allPresent();
  records.set('2026-11-03', rec('Absent'));
  records.set('2026-11-04', rec('Absent'));
  records.set('2026-11-05', rec('Absent'));
  const r = calculateAttendancePay({ ...NOV, structures: [s], records });
  assert.equal(line(r, 'ABSENT').amountPaise, 100000); // 3 x 333.333 = 1000.00, not 999.99
  assert.equal(net(r).netPaise, 900000);
});

test('no structure in force: nothing is paid and a warning explains why', () => {
  const r = calculateAttendancePay({ ...NOV, structures: [{ ...base, effectiveFrom: '2027-01-01' }], records: allPresent() });
  assert.equal(r.lines.length, 0);
  assert.ok(r.warnings.some((w) => /no salary structure/i.test(w)));
});

test('totals: net never goes below zero and the uncovered part is reported', () => {
  const t = totalsFromLines([
    { kind: 'EARNING', code: 'BASIC', amountPaise: 100000 },
    { kind: 'DEDUCTION', code: 'OTHER_DEDUCTION', amountPaise: 150000 },
  ]);
  assert.equal(t.netPaise, 0);
  assert.equal(t.shortfallPaise, 50000);
});

test('selfie data does not exist in the engine: attendance alone decides pay', () => {
  const r = calculateAttendancePay({ ...NOV, structures: [base], records: allPresent() });
  assert.equal(net(r).netPaise, 3000000);
  assert.equal(JSON.stringify(r).includes('selfie'), false);
});
