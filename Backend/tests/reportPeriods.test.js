import test from 'node:test';
import assert from 'node:assert/strict';
import { periodOf, rollUp, istStart, istEnd, isValidDay } from '../src/utils/reportPeriods.js';

test('week runs Monday to Sunday', () => {
  // 2026-10-05 is a Monday, 2026-10-11 a Sunday
  assert.equal(periodOf('2026-10-05', 'week').key, '2026-10-05');
  assert.equal(periodOf('2026-10-11', 'week').key, '2026-10-05');
  assert.equal(periodOf('2026-10-12', 'week').key, '2026-10-12');
  assert.equal(periodOf('2026-10-07', 'week').to, '2026-10-11');
});

test('week crossing a month and a year boundary', () => {
  const p = periodOf('2026-12-31', 'week'); // Thursday
  assert.equal(p.from, '2026-12-28');
  assert.equal(p.to, '2027-01-03');
});

test('month covers the whole month, including leap February', () => {
  assert.equal(periodOf('2028-02-10', 'month').to, '2028-02-29');
  assert.equal(periodOf('2026-02-10', 'month').to, '2026-02-28');
  assert.equal(periodOf('2026-10-31', 'month').label, 'Oct 2026');
});

test('rollUp adds days into periods, newest first, with money rounded once', () => {
  const rows = [
    { day: '2026-10-05', orders: 2, money: 0.1 }, { day: '2026-10-06', orders: 1, money: 0.2 },
    { day: '2026-10-12', orders: 4, money: 10.005 }, { day: '2026-11-01', orders: 1, money: 5 },
  ];
  const weeks = rollUp(rows, 'week', ['orders', 'money']);
  assert.deepEqual(weeks.map((w) => [w._id, w.orders, w.money]), [['2026-10-26', 1, 5], ['2026-10-12', 4, 10.01], ['2026-10-05', 3, 0.3]]);
  const months = rollUp(rows, 'month', ['orders', 'money']);
  assert.deepEqual(months.map((m) => [m._id, m.orders]), [['2026-11', 1], ['2026-10', 7]]);
  assert.equal(rollUp(rows, 'day', ['orders']).length, 4);
});

test('Indian-time day boundaries do not depend on the server timezone', () => {
  assert.equal(istStart('2026-10-05').toISOString(), '2026-10-04T18:30:00.000Z');
  assert.equal(istEnd('2026-10-05').toISOString(), '2026-10-05T18:29:59.999Z');
  assert.equal(isValidDay('2026-13-01'), false);
  assert.equal(isValidDay('2026-10-05'), true);
});
