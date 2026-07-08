// schedule.js — pure, DOM-free "next N runs" computation.
//
// Determinism contract: nextRuns() takes an explicit reference Date. It never
// calls Date.now() or reads any ambient clock, so tests can pass a fixed date
// and assert exact results. The UI passes new Date().
//
// All time math is done in the host's local timezone (via the Date object's
// local getters/setters), matching how most cron daemons interpret schedules
// against the machine's local time.

import { parseCron } from './parser.js';

/**
 * Does a given local Date match the parsed schedule?
 *
 * Standard cron day semantics: when BOTH day-of-month and day-of-week are
 * restricted, a timestamp matches if it satisfies EITHER (logical OR). When
 * only one is restricted, only that one must match. When neither is restricted,
 * the day fields impose no constraint.
 *
 * @param {Date} date local Date
 * @param {ReturnType<typeof parseCron>} sched
 * @returns {boolean}
 */
export function matches(date, sched) {
  if (!sched.minute.includes(date.getMinutes())) return false;
  if (!sched.hour.includes(date.getHours())) return false;
  if (!sched.month.includes(date.getMonth() + 1)) return false;

  const domOk = sched.dayOfMonth.includes(date.getDate());
  const dowOk = sched.dayOfWeek.includes(date.getDay());

  if (sched.domRestricted && sched.dowRestricted) {
    // OR semantics between the two day fields.
    return domOk || dowOk;
  }
  if (sched.domRestricted) return domOk;
  if (sched.dowRestricted) return dowOk;
  return true;
}

/**
 * Compute the next `count` run times strictly after `reference`.
 *
 * @param {string} expression a cron expression or supported macro
 * @param {Date} reference the reference instant (exclusive lower bound)
 * @param {number} [count=5]
 * @returns {Date[]} up to `count` future Date objects, ascending
 */
export function nextRuns(expression, reference, count = 5) {
  const sched = parseCron(expression);

  // Start at the top of the next minute after `reference` so we never return
  // the reference minute itself and we align to minute boundaries.
  const cursor = new Date(reference.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const runs = [];
  // Upper bound on iterations: cron repeats within a small number of years.
  // 5 years of minutes is a safe cap that also protects impossible schedules
  // (e.g. Feb 30) from looping forever.
  const maxIterations = 5 * 366 * 24 * 60;
  let iterations = 0;

  while (runs.length < count && iterations < maxIterations) {
    if (matches(cursor, sched)) {
      runs.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
    iterations += 1;
  }

  return runs;
}

/**
 * A human label for the host's current local timezone, e.g.
 * "Asia/Manila (GMT+8)" or, if the IANA name is unavailable, "GMT+8".
 * @param {Date} [reference=new Date()]
 * @returns {string}
 */
export function localTimeZoneLabel(reference = new Date()) {
  let ianaName = '';
  try {
    ianaName = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    ianaName = '';
  }

  // Offset in minutes; getTimezoneOffset is minutes behind UTC (positive = west).
  const offsetMinutes = -reference.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  const offsetLabel = `GMT${sign}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;

  return ianaName ? `${ianaName} (${offsetLabel})` : offsetLabel;
}

/**
 * Format a Date for display in local time, e.g. "Mon, Jul 13 2026, 00:15".
 * Framework-free and locale-stable so tests can assert exact strings.
 * @param {Date} date
 * @returns {string}
 */
export function formatRun(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dow = days[date.getDay()];
  const mon = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dow}, ${mon} ${day} ${year}, ${hh}:${mm}`;
}
