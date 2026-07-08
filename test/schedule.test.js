import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextRuns, matches, formatRun, localTimeZoneLabel,
} from '../src/schedule.js';
import { parseCron } from '../src/parser.js';

// All schedule math is done in the host's LOCAL timezone. To keep these tests
// deterministic regardless of where they run, we build reference Dates from
// local components (new Date(y, m, d, hh, mm)) and assert on local getters.

test('nextRuns: */15 * * * * yields the next four quarter-hours', () => {
  // Reference: 2026-07-08 10:07 local. Next quarter-hours: 10:15, 10:30, 10:45, 11:00.
  const ref = new Date(2026, 6, 8, 10, 7, 0, 0);
  const runs = nextRuns('*/15 * * * *', ref, 4);
  assert.equal(runs.length, 4);
  const asHM = runs.map((d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
  assert.deepEqual(asHM, ['10:15', '10:30', '10:45', '11:00']);
});

test('nextRuns: never returns the reference minute itself', () => {
  // Reference exactly on a quarter-hour; the next run must be 15 min later.
  const ref = new Date(2026, 6, 8, 10, 15, 0, 0);
  const runs = nextRuns('*/15 * * * *', ref, 1);
  assert.equal(runs[0].getHours(), 10);
  assert.equal(runs[0].getMinutes(), 30);
});

test('nextRuns: 0 9 * * 1-5 (weekdays at 9am) skips the weekend', () => {
  // 2026-07-10 is a Friday. Reference Friday 10:00 -> next run should be
  // Monday 2026-07-13 at 09:00, then Tue, Wed, Thu, Fri.
  const refFriday = new Date(2026, 6, 10, 10, 0, 0, 0);
  assert.equal(refFriday.getDay(), 5, 'sanity: reference is a Friday');
  const runs = nextRuns('0 9 * * 1-5', refFriday, 5);
  const first = runs[0];
  assert.equal(first.getDay(), 1, 'first run is a Monday');
  assert.equal(first.getDate(), 13);
  assert.equal(first.getHours(), 9);
  assert.equal(first.getMinutes(), 0);
  // None of the five runs fall on Sat(6) or Sun(0).
  for (const r of runs) {
    assert.ok(r.getDay() >= 1 && r.getDay() <= 5, `run ${r} is a weekday`);
    assert.equal(r.getHours(), 9);
  }
});

test('nextRuns: 0 0 1 * * fires at midnight on the 1st of each month', () => {
  // Reference mid-July -> next runs Aug 1, Sep 1, Oct 1 at 00:00.
  const ref = new Date(2026, 6, 15, 12, 0, 0, 0);
  const runs = nextRuns('0 0 1 * *', ref, 3);
  assert.deepEqual(runs.map((d) => d.getDate()), [1, 1, 1]);
  assert.deepEqual(runs.map((d) => d.getMonth()), [7, 8, 9]); // Aug, Sep, Oct
  for (const r of runs) {
    assert.equal(r.getHours(), 0);
    assert.equal(r.getMinutes(), 0);
  }
});

test('nextRuns: @daily fires at local midnight', () => {
  const ref = new Date(2026, 6, 8, 6, 30, 0, 0);
  const runs = nextRuns('@daily', ref, 3);
  assert.deepEqual(runs.map((d) => d.getDate()), [9, 10, 11]);
  for (const r of runs) {
    assert.equal(r.getHours(), 0);
    assert.equal(r.getMinutes(), 0);
  }
});

test('nextRuns: @hourly fires at the top of each hour', () => {
  const ref = new Date(2026, 6, 8, 10, 30, 0, 0);
  const runs = nextRuns('@hourly', ref, 3);
  const asHM = runs.map((d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
  assert.deepEqual(asHM, ['11:00', '12:00', '13:00']);
});

test('nextRuns: OR semantics — 0 0 13 * 5 fires on the 13th AND every Friday', () => {
  // Standard cron: when both day fields are restricted the match is OR. In July
  // 2026 the Fridays fall on the 3rd, 10th, 17th, 24th and 31st; the 13th is a
  // Monday. So from July 1 midnight the matches are 3, 10, 13, 17, 24, 31.
  const ref = new Date(2026, 6, 1, 0, 0, 0, 0);
  const runs = nextRuns('0 0 13 * 5', ref, 6);
  const dates = runs.map((d) => d.getDate());
  assert.deepEqual(dates, [3, 10, 13, 17, 24, 31]);
  for (const r of runs) {
    assert.equal(r.getMonth(), 6, 'all six matches are in July');
    assert.equal(r.getHours(), 0);
  }
});

test('matches: respects month restriction', () => {
  const sched = parseCron('0 0 1 1 *'); // Jan 1 midnight (@yearly)
  assert.ok(matches(new Date(2026, 0, 1, 0, 0), sched));
  assert.ok(!matches(new Date(2026, 1, 1, 0, 0), sched)); // Feb 1
});

test('nextRuns: @yearly fires once per year on Jan 1', () => {
  const ref = new Date(2026, 6, 8, 0, 0, 0, 0);
  const runs = nextRuns('@yearly', ref, 2);
  assert.deepEqual(runs.map((d) => d.getFullYear()), [2027, 2028]);
  for (const r of runs) {
    assert.equal(r.getMonth(), 0);
    assert.equal(r.getDate(), 1);
    assert.equal(r.getHours(), 0);
  }
});

test('nextRuns: impossible schedule (Feb 30) returns no runs, does not hang', () => {
  const ref = new Date(2026, 0, 1, 0, 0, 0, 0);
  const runs = nextRuns('0 0 30 2 *', ref, 5);
  assert.deepEqual(runs, []);
});

test('formatRun: stable local formatting', () => {
  const d = new Date(2026, 6, 13, 9, 5, 0, 0); // Mon Jul 13 2026 09:05
  assert.equal(formatRun(d), 'Mon, Jul 13 2026, 09:05');
});

test('localTimeZoneLabel: returns a non-empty label with a GMT offset', () => {
  const label = localTimeZoneLabel(new Date(2026, 6, 8, 12, 0));
  assert.match(label, /GMT[+-]\d/);
});
