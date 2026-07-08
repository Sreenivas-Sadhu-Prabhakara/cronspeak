// explain.js — pure, DOM-free translation of a cron expression into a clear
// plain-English sentence. Consumes the structured result from parseCron().

import { parseCron, FIELDS } from './parser.js';

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Ordinal suffix for a day-of-month number, e.g. 1 -> "1st", 22 -> "22nd". */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Join a list of strings with commas and a trailing "and". */
function humanList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Zero-pad a number to two digits. */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Render an hour+minute pair as a friendly 12-hour clock time, e.g. "9:05 AM". */
function clockTime(hour, minute) {
  const period = hour < 12 ? 'AM' : 'PM';
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(minute)} ${period}`;
}

/**
 * Detect whether a value list is a simple arithmetic step that covers the whole
 * field (e.g. every 15 within 0..59). Returns the step size, or null.
 */
function detectFullStep(values, field) {
  if (values.length < 2) return null;
  const step = values[1] - values[0];
  if (step <= 1) return null;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] - values[i - 1] !== step) return null;
  }
  // Must start at the field minimum and its next step must overshoot the max
  // (i.e. it genuinely spans the whole field).
  if (values[0] !== field.min) return null;
  if (values[values.length - 1] + step <= field.max) return null;
  return step;
}

/** True if a field's values are exactly every value in [min, max]. */
function isEvery(values, field) {
  return values.length === field.max - field.min + 1;
}

/** True if a sorted list is a contiguous run of consecutive integers (2+ long). */
function isContiguous(values) {
  if (values.length < 2) return false;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] - values[i - 1] !== 1) return false;
  }
  return true;
}

/**
 * Phrase a set of hours for "during ..." clauses. A contiguous run reads as a
 * window ("between 9:00 AM and 5:00 PM"); otherwise the hours are listed.
 */
function describeHourWindow(hour) {
  if (isContiguous(hour)) {
    const start = clockTime(hour[0], 0);
    const end = clockTime(hour[hour.length - 1], 0);
    return `between ${start} and ${end}`;
  }
  return `at ${humanList(hour.map((h) => clockTime(h, 0)))}`;
}

/**
 * Build the time-of-day phrase from minute + hour lists. This is where most of
 * the readability lives, so it handles the common shapes explicitly.
 */
function describeTime(sched) {
  const minuteField = FIELDS[0];
  const hourField = FIELDS[1];
  const { minute, hour } = sched;

  const everyMinute = isEvery(minute, minuteField);
  const everyHour = isEvery(hour, hourField);
  const minuteStep = detectFullStep(minute, minuteField);
  const hourStep = detectFullStep(hour, hourField);

  // Every minute of every hour.
  if (everyMinute && everyHour) return 'every minute';

  // Every N minutes, all day.
  if (minuteStep && everyHour) return `every ${minuteStep} minutes`;

  // Every minute, but only within specific hours.
  if (everyMinute && !everyHour) {
    if (hourStep) return `every minute, every ${hourStep} hours`;
    return `every minute ${describeHourWindow(hour)}`;
  }

  // Every N minutes within specific hours.
  if (minuteStep && !everyHour) {
    if (hourStep) return `every ${minuteStep} minutes, every ${hourStep} hours`;
    return `every ${minuteStep} minutes ${describeHourWindow(hour)}`;
  }

  // Specific minute(s), every hour.
  if (!minuteStep && everyHour) {
    if (minute.length === 1) {
      const at = minute[0] === 0 ? 'the top of every hour' : `minute ${minute[0]} of every hour`;
      return `at ${at}`;
    }
    return `at ${humanList(minute.map((m) => `minute ${m}`))} of every hour`;
  }

  // Specific minute(s), every N hours.
  if (!minuteStep && hourStep) {
    if (minute.length === 1 && minute[0] === 0) return `every ${hourStep} hours`;
    return `at ${humanList(minute.map((m) => `minute ${m}`))}, every ${hourStep} hours`;
  }

  // The common, fully-specified case: concrete clock times.
  const times = [];
  for (const h of hour) {
    for (const m of minute) {
      times.push(clockTime(h, m));
    }
  }
  return `at ${humanList(times)}`;
}

/** Describe the day-of-week constraint, or null if unrestricted. */
function describeDayOfWeek(sched) {
  if (!sched.dowRestricted) return null;
  const dow = sched.dayOfWeek;
  const asSet = new Set(dow);

  // Weekdays / weekends shortcuts.
  const weekdays = [1, 2, 3, 4, 5];
  const weekend = [0, 6];
  if (asSet.size === 5 && weekdays.every((d) => asSet.has(d))) {
    return 'on weekdays (Monday through Friday)';
  }
  if (asSet.size === 2 && weekend.every((d) => asSet.has(d))) {
    return 'on weekends (Saturday and Sunday)';
  }
  // Every day of the week is effectively unrestricted.
  if (dow.length === 7) return null;

  return `on ${humanList(dow.map((d) => DOW_NAMES[d]))}`;
}

/** Describe the day-of-month constraint, or null if unrestricted. */
function describeDayOfMonth(sched) {
  if (!sched.domRestricted) return null;
  const domField = FIELDS[2];
  const dom = sched.dayOfMonth;
  if (isEvery(dom, domField)) return null;
  const step = detectFullStep(dom, domField);
  if (step) return `every ${step} days`;
  if (dom.length === 1) return `on the ${ordinal(dom[0])} of the month`;
  return `on the ${humanList(dom.map((d) => ordinal(d)))} of the month`;
}

/** Describe the month constraint, or null if unrestricted (every month). */
function describeMonth(sched) {
  const monthField = FIELDS[3];
  const { month } = sched;
  if (isEvery(month, monthField)) return null;
  // Prefer a plain list for a handful of months; only use "every N months" when
  // the set is a genuine stride of three or more months.
  const step = detectFullStep(month, monthField);
  if (step && month.length >= 3) return `every ${step} months`;
  return `in ${humanList(month.map((m) => MONTH_NAMES[m]))}`;
}

/**
 * Translate a cron expression (or macro) into a single plain-English sentence.
 *
 * @param {string} expression
 * @returns {string} e.g. "At 9:00 AM, on weekdays (Monday through Friday)."
 */
export function explain(expression) {
  const sched = parseCron(expression);

  const timePhrase = describeTime(sched);
  const domPhrase = describeDayOfMonth(sched);
  const dowPhrase = describeDayOfWeek(sched);
  const monthPhrase = describeMonth(sched);

  const parts = [timePhrase];

  // Combine the two day fields. Standard cron uses OR when both are restricted.
  if (domPhrase && dowPhrase) {
    parts.push(`${domPhrase}, or ${dowPhrase}`);
  } else if (domPhrase) {
    parts.push(domPhrase);
  } else if (dowPhrase) {
    parts.push(dowPhrase);
  }

  if (monthPhrase) parts.push(monthPhrase);

  // Assemble, capitalize the first letter, and end with a period.
  let sentence = parts.filter(Boolean).join(', ');
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  if (!sentence.endsWith('.')) sentence += '.';
  return sentence;
}
