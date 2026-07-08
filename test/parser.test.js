import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCron, parseField, expandMacro, FIELDS, CronError, MACROS,
} from '../src/parser.js';

const minuteField = FIELDS[0];
const monthField = FIELDS[3];
const dowField = FIELDS[4];

test('parseField: star expands to the full range', () => {
  assert.deepEqual(parseField('*', minuteField), Array.from({ length: 60 }, (_, i) => i));
});

test('parseField: single value', () => {
  assert.deepEqual(parseField('5', minuteField), [5]);
});

test('parseField: comma list is sorted and de-duplicated', () => {
  assert.deepEqual(parseField('30,0,15,0', minuteField), [0, 15, 30]);
});

test('parseField: range', () => {
  assert.deepEqual(parseField('1-5', minuteField), [1, 2, 3, 4, 5]);
});

test('parseField: step over star */15', () => {
  assert.deepEqual(parseField('*/15', minuteField), [0, 15, 30, 45]);
});

test('parseField: step over range 1-30/5', () => {
  assert.deepEqual(parseField('1-30/5', minuteField), [1, 6, 11, 16, 21, 26]);
});

test('parseField: bare value with step 5/2 means from-value to max', () => {
  // minute 5 to 59 stepping 2 -> 5,7,9,...
  const result = parseField('5/2', minuteField);
  assert.equal(result[0], 5);
  assert.equal(result[1], 7);
  assert.equal(result[result.length - 1], 59);
});

test('parseField: named months', () => {
  assert.deepEqual(parseField('JAN,DEC', monthField), [1, 12]);
  assert.deepEqual(parseField('jan-mar', monthField), [1, 2, 3]);
});

test('parseField: named days of week', () => {
  assert.deepEqual(parseField('MON-FRI', dowField), [1, 2, 3, 4, 5]);
  assert.deepEqual(parseField('SUN', dowField), [0]);
});

test('parseField: rejects out-of-range value', () => {
  assert.throws(() => parseField('60', minuteField), CronError);
  assert.throws(() => parseField('99', monthField), CronError);
});

test('parseField: rejects backwards range', () => {
  assert.throws(() => parseField('5-1', minuteField), /backwards/);
});

test('parseField: rejects non-numeric junk', () => {
  assert.throws(() => parseField('abc', minuteField), CronError);
});

test('parseField: rejects empty list item', () => {
  assert.throws(() => parseField('1,,3', minuteField), /empty list item/);
});

test('parseField: rejects zero step', () => {
  assert.throws(() => parseField('*/0', minuteField), /Step cannot be 0/);
});

test('expandMacro: all supported macros', () => {
  assert.equal(expandMacro('@yearly'), '0 0 1 1 *');
  assert.equal(expandMacro('@annually'), '0 0 1 1 *');
  assert.equal(expandMacro('@monthly'), '0 0 1 * *');
  assert.equal(expandMacro('@weekly'), '0 0 * * 0');
  assert.equal(expandMacro('@daily'), '0 0 * * *');
  assert.equal(expandMacro('@midnight'), '0 0 * * *');
  assert.equal(expandMacro('@hourly'), '0 * * * *');
});

test('expandMacro: case-insensitive', () => {
  assert.equal(expandMacro('@DAILY'), '0 0 * * *');
});

test('expandMacro: unknown macro throws', () => {
  assert.throws(() => expandMacro('@fortnightly'), /Unknown macro/);
});

test('expandMacro: passes through a normal expression', () => {
  assert.equal(expandMacro('*/15 * * * *'), '*/15 * * * *');
});

test('parseCron: wrong field count is rejected', () => {
  assert.throws(() => parseCron('* * * *'), /exactly 5 fields/);
  assert.throws(() => parseCron('* * * * * *'), /exactly 5 fields/);
});

test('parseCron: empty expression is rejected', () => {
  assert.throws(() => parseCron('   '), /empty/i);
});

test('parseCron: normalizes day-of-week 7 to 0 (Sunday)', () => {
  const sched = parseCron('0 0 * * 7');
  assert.deepEqual(sched.dayOfWeek, [0]);
});

test('parseCron: day-of-week 0 and 7 both map to Sunday, de-duplicated', () => {
  const sched = parseCron('0 0 * * 0,7');
  assert.deepEqual(sched.dayOfWeek, [0]);
});

test('parseCron: tracks whether day fields are restricted', () => {
  const both = parseCron('0 0 1 * 1');
  assert.equal(both.domRestricted, true);
  assert.equal(both.dowRestricted, true);

  const neither = parseCron('0 0 * * *');
  assert.equal(neither.domRestricted, false);
  assert.equal(neither.dowRestricted, false);
});

test('parseCron: full structured result for a known expression', () => {
  const sched = parseCron('0 9 * * 1-5');
  assert.deepEqual(sched.minute, [0]);
  assert.deepEqual(sched.hour, [9]);
  assert.deepEqual(sched.dayOfWeek, [1, 2, 3, 4, 5]);
  assert.equal(sched.month.length, 12);
  assert.equal(sched.dayOfMonth.length, 31);
});

test('parseCron: expands a macro then parses it', () => {
  const sched = parseCron('@hourly');
  assert.deepEqual(sched.minute, [0]);
  assert.equal(sched.hour.length, 24);
});

test('MACROS constant is exported and complete', () => {
  assert.ok(Object.keys(MACROS).length >= 7);
});
