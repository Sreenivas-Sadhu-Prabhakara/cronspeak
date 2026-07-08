import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explain } from '../src/explain.js';

// Each case pairs a cron expression with the exact English sentence expected.
const CASES = [
  ['* * * * *', 'Every minute.'],
  ['*/15 * * * *', 'Every 15 minutes.'],
  ['0 0 * * *', 'At 12:00 AM.'],
  ['@daily', 'At 12:00 AM.'],
  ['@midnight', 'At 12:00 AM.'],
  ['0 9 * * 1-5', 'At 9:00 AM, on weekdays (Monday through Friday).'],
  ['0 0 1 * *', 'At 12:00 AM, on the 1st of the month.'],
  ['0 * * * *', 'At the top of every hour.'],
  ['@hourly', 'At the top of every hour.'],
  ['0 0 * * 0', 'At 12:00 AM, on Sunday.'],
  ['@weekly', 'At 12:00 AM, on Sunday.'],
  ['30 2 * * *', 'At 2:30 AM.'],
  ['0 0 1 1 *', 'At 12:00 AM, on the 1st of the month, in January.'],
  ['@yearly', 'At 12:00 AM, on the 1st of the month, in January.'],
  ['0 12 * * 6,0', 'At 12:00 PM, on weekends (Saturday and Sunday).'],
  ['15 14 1 * *', 'At 2:15 PM, on the 1st of the month.'],
  ['0,30 * * * *', 'Every 30 minutes.'],
  ['0 9,17 * * *', 'At 9:00 AM and 5:00 PM.'],
  ['*/30 9-17 * * 1-5', 'Every 30 minutes between 9:00 AM and 5:00 PM, on weekdays (Monday through Friday).'],
  ['0 0 1 JAN,JUL *', 'At 12:00 AM, on the 1st of the month, in January and July.'],
  ['0 0 * * MON', 'At 12:00 AM, on Monday.'],
  ['5 4 * * SUN', 'At 4:05 AM, on Sunday.'],
];

for (const [expr, expected] of CASES) {
  test(`explain: ${expr}`, () => {
    assert.equal(explain(expr), expected);
  });
}

test('explain: named days are case-insensitive and match numeric', () => {
  assert.equal(explain('0 9 * * mon-fri'), explain('0 9 * * 1-5'));
});

test('explain: day 7 is treated as Sunday', () => {
  assert.equal(explain('0 0 * * 7'), explain('0 0 * * 0'));
});

test('explain: OR semantics when both day fields are restricted', () => {
  // day-of-month 1 AND day-of-week Monday => "or" phrasing.
  const sentence = explain('0 0 1 * 1');
  assert.match(sentence, /on the 1st of the month, or on Monday/);
});

test('explain: result always ends with a period and starts capitalized', () => {
  for (const [expr] of CASES) {
    const s = explain(expr);
    assert.ok(s.endsWith('.'), `${expr} should end with a period`);
    assert.equal(s[0], s[0].toUpperCase(), `${expr} should start capitalized`);
  }
});

test('explain: invalid expression throws (propagated from parser)', () => {
  assert.throws(() => explain('* * *'), /5 fields/);
  assert.throws(() => explain('99 * * * *'), /out of range/);
});
