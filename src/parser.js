// parser.js — pure, DOM-free cron parsing for a standard 5-field expression.
//
// A cron expression has five whitespace-separated fields:
//   minute hour day-of-month month day-of-week
//
// This module turns a raw string into a structured, validated representation
// with the explicit set of matching values for each field, so that both the
// English explainer and the schedule computer can consume the same result.

/**
 * Field definitions in canonical order, with their allowed numeric bounds and
 * the named aliases they accept.
 */
export const FIELDS = [
  { name: 'minute', min: 0, max: 59, names: null },
  { name: 'hour', min: 0, max: 23, names: null },
  { name: 'dayOfMonth', min: 1, max: 31, names: null },
  {
    name: 'month',
    min: 1,
    max: 12,
    names: {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    },
  },
  {
    // Day-of-week accepts 0-7 on input (both 0 and 7 mean Sunday). On output we
    // normalize 7 -> 0 so downstream code only deals with 0..6 (Sun..Sat).
    name: 'dayOfWeek',
    min: 0,
    max: 7,
    names: {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    },
  },
];

/**
 * Supported macros. Each maps to a canonical 5-field expression.
 */
export const MACROS = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

/**
 * A validation error carrying a friendly, specific message plus the field it
 * relates to (or null for whole-expression problems).
 */
export class CronError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'CronError';
    this.field = field;
  }
}

/**
 * Expand a macro to its 5-field form. Returns the input unchanged if it is not
 * a macro. Throws CronError for an unknown @macro.
 * @param {string} expr
 * @returns {string}
 */
export function expandMacro(expr) {
  const trimmed = expr.trim();
  if (!trimmed.startsWith('@')) return trimmed;
  const key = trimmed.toLowerCase();
  if (!(key in MACROS)) {
    const supported = Object.keys(MACROS).join(', ');
    throw new CronError(
      `Unknown macro "${trimmed}". Supported macros are: ${supported}.`,
    );
  }
  return MACROS[key];
}

/**
 * Resolve a single token (possibly a named alias) to a number within a field.
 * @param {string} token
 * @param {object} field
 * @returns {number}
 */
function resolveValue(token, field) {
  const raw = token.trim();
  if (raw === '') {
    throw new CronError(`The ${field.name} field has an empty value.`, field.name);
  }
  let value;
  if (field.names && /[a-z]/i.test(raw)) {
    const key = raw.toLowerCase();
    if (!(key in field.names)) {
      const allowed = Object.keys(field.names).map((n) => n.toUpperCase()).join(', ');
      throw new CronError(
        `"${raw}" is not a valid ${field.name} name. Use one of: ${allowed}.`,
        field.name,
      );
    }
    value = field.names[key];
  } else {
    if (!/^\d+$/.test(raw)) {
      throw new CronError(
        `"${raw}" is not a valid number in the ${field.name} field.`,
        field.name,
      );
    }
    value = Number(raw);
  }
  if (value < field.min || value > field.max) {
    throw new CronError(
      `${value} is out of range for ${field.name} (allowed ${field.min}–${field.max}).`,
      field.name,
    );
  }
  return value;
}

/**
 * Build a sorted, de-duplicated array of every integer from `start` to `end`
 * stepping by `step`.
 */
function rangeValues(start, end, step, field) {
  if (step <= 0) {
    throw new CronError(`Step must be a positive number in the ${field.name} field.`, field.name);
  }
  if (start > end) {
    throw new CronError(
      `Range ${start}-${end} is backwards in the ${field.name} field (start must be ≤ end).`,
      field.name,
    );
  }
  const out = [];
  for (let v = start; v <= end; v += step) out.push(v);
  return out;
}

/**
 * Parse one field into a sorted list of the discrete values it matches.
 * Handles a star, single values, ranges (a-b), steps (star-slash-N or a-b/N),
 * and comma-separated lists combining any of these.
 * @param {string} raw
 * @param {object} field
 * @returns {number[]}
 */
export function parseField(raw, field) {
  const text = raw.trim();
  if (text === '') {
    throw new CronError(`The ${field.name} field is empty.`, field.name);
  }
  const matched = new Set();

  for (const part of text.split(',')) {
    const piece = part.trim();
    if (piece === '') {
      throw new CronError(
        `The ${field.name} field has an empty list item (a stray comma?).`,
        field.name,
      );
    }

    let base = piece;
    let step = 1;
    if (piece.includes('/')) {
      const [b, s, ...rest] = piece.split('/');
      if (rest.length > 0 || s === undefined || s.trim() === '') {
        throw new CronError(
          `Malformed step "${piece}" in the ${field.name} field. Use the form value/step, e.g. */15.`,
          field.name,
        );
      }
      if (!/^\d+$/.test(s.trim())) {
        throw new CronError(
          `Step "${s.trim()}" must be a positive whole number in the ${field.name} field.`,
          field.name,
        );
      }
      base = b.trim();
      step = Number(s.trim());
      if (step === 0) {
        throw new CronError(`Step cannot be 0 in the ${field.name} field.`, field.name);
      }
    }

    let start;
    let end;
    if (base === '*') {
      start = field.min;
      end = field.max;
    } else if (base.includes('-')) {
      const bits = base.split('-');
      if (bits.length !== 2) {
        throw new CronError(
          `Malformed range "${base}" in the ${field.name} field. Use the form start-end, e.g. 1-5.`,
          field.name,
        );
      }
      start = resolveValue(bits[0], field);
      end = resolveValue(bits[1], field);
    } else {
      start = resolveValue(base, field);
      // A bare "5/2" means "from 5 to the field maximum, stepping by 2".
      end = piece.includes('/') ? field.max : start;
    }

    for (const v of rangeValues(start, end, step, field)) matched.add(v);
  }

  return [...matched].sort((a, b) => a - b);
}

/**
 * Parse a full cron expression (after macro expansion) into a structured
 * schedule object. Day-of-week 7 is normalized to 0.
 *
 * @param {string} expression
 * @returns {{
 *   raw: string,
 *   fields: string[],
 *   minute: number[], hour: number[], dayOfMonth: number[],
 *   month: number[], dayOfWeek: number[],
 *   domRestricted: boolean, dowRestricted: boolean
 * }}
 */
export function parseCron(expression) {
  if (typeof expression !== 'string') {
    throw new CronError('Expression must be a string.');
  }
  const expanded = expandMacro(expression);
  const trimmed = expanded.trim();
  if (trimmed === '') {
    throw new CronError('Expression is empty. Enter five fields, e.g. * * * * *');
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    throw new CronError(
      `A cron expression needs exactly 5 fields (minute hour day-of-month month day-of-week); you have ${fields.length}.`,
    );
  }

  const parsed = {};
  for (let i = 0; i < FIELDS.length; i += 1) {
    parsed[FIELDS[i].name] = parseField(fields[i], FIELDS[i]);
  }

  // Normalize day-of-week: collapse 7 (Sunday) to 0, de-duplicate, re-sort.
  parsed.dayOfWeek = [...new Set(parsed.dayOfWeek.map((d) => (d === 7 ? 0 : d)))].sort(
    (a, b) => a - b,
  );

  // Track whether day-of-month / day-of-week were actually restricted (not "*").
  // Standard cron OR-combines the two day fields when both are restricted.
  const domRestricted = fields[2].trim() !== '*';
  const dowRestricted = fields[4].trim() !== '*';

  return {
    raw: trimmed,
    fields,
    minute: parsed.minute,
    hour: parsed.hour,
    dayOfMonth: parsed.dayOfMonth,
    month: parsed.month,
    dayOfWeek: parsed.dayOfWeek,
    domRestricted,
    dowRestricted,
  };
}
