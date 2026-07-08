// app.js — the ONLY module that touches the DOM. All scheduling logic lives in
// the pure, testable modules (parser / explain / schedule) imported below.

import { CronError } from './parser.js';
import { explain } from './explain.js';
import {
  nextRuns, formatRun, localTimeZoneLabel,
} from './schedule.js';

const STORAGE_KEY = 'cronspeak:last-expression';
const RUN_COUNT = 5;

// One-click presets: the pragmatic English -> cron direction.
const PRESETS = [
  { label: 'Every day at midnight', expr: '0 0 * * *' },
  { label: 'Every 15 minutes', expr: '*/15 * * * *' },
  { label: 'Weekdays at 9:00 AM', expr: '0 9 * * 1-5' },
  { label: 'First of every month', expr: '0 0 1 * *' },
  { label: 'Every Sunday', expr: '0 0 * * 0' },
  { label: 'Every hour', expr: '0 * * * *' },
];

// ---- Element handles ---------------------------------------------------------

const $ = (id) => document.getElementById(id);

const el = {
  cron: $('cron'),
  explanation: $('explanation'),
  anatomy: $('anatomy'),
  anatomyVals: [...document.querySelectorAll('.anatomy .val')],
  anatomyCells: [...document.querySelectorAll('.anatomy .cell')],
  runs: $('runs'),
  presets: $('presets'),
  copyCron: $('copy-cron'),
  copyExplain: $('copy-explain'),
  tzLabel: $('tz-label'),
};

// ---- Helpers -----------------------------------------------------------------

/**
 * Human "in X" relative label for a future date vs now. Kept in the UI layer
 * because it depends on the live clock; the schedule math itself is pure.
 */
function relativeLabel(date, now) {
  const diffMs = date.getTime() - now.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/** Split a raw expression into up to five display tokens for the anatomy strip. */
function anatomyTokens(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('@')) {
    // Show the macro name spread across the first cell; blank the rest.
    return [trimmed, '', '', '', ''];
  }
  const parts = trimmed.split(/\s+/);
  return [0, 1, 2, 3, 4].map((i) => parts[i] ?? '');
}

function updateAnatomy(raw) {
  const tokens = anatomyTokens(raw);
  el.anatomyVals.forEach((node, i) => {
    const token = tokens[i] || '';
    node.textContent = token || '—';
    el.anatomyCells[i].classList.toggle('filled', token !== '' && token !== '—');
  });
}

/** Show the copied-state on a button briefly. */
function flashCopied(button, doneLabel = 'Copied') {
  const original = button.dataset.label || button.textContent;
  button.dataset.label = original;
  button.textContent = doneLabel;
  button.classList.add('copied');
  window.setTimeout(() => {
    button.textContent = button.dataset.label;
    button.classList.remove('copied');
  }, 1400);
}

async function copyText(text, button, doneLabel) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts (e.g. file://) without any network.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    flashCopied(button, doneLabel);
  } catch {
    flashCopied(button, 'Copy failed');
  }
}

// ---- Rendering ---------------------------------------------------------------

function renderRuns(expression, now) {
  const runs = nextRuns(expression, now, RUN_COUNT);
  el.runs.classList.remove('empty');
  el.runs.replaceChildren();

  if (runs.length === 0) {
    el.runs.classList.add('empty');
    const li = document.createElement('li');
    li.textContent = 'This expression never matches a real date.';
    el.runs.appendChild(li);
    return;
  }

  for (const run of runs) {
    const li = document.createElement('li');

    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.setAttribute('aria-hidden', 'true');

    const when = document.createElement('span');
    when.className = 'when';
    when.textContent = formatRun(run);

    const rel = document.createElement('span');
    rel.className = 'rel';
    rel.textContent = relativeLabel(run, now);

    li.append(tick, when, rel);
    el.runs.appendChild(li);
  }
}

function renderEmptyRuns(message) {
  el.runs.classList.add('empty');
  el.runs.replaceChildren();
  const li = document.createElement('li');
  li.textContent = message;
  el.runs.appendChild(li);
}

/** The core update cycle: read the field, validate, and paint everything. */
function update() {
  const raw = el.cron.value;
  updateAnatomy(raw);

  const trimmed = raw.trim();
  if (trimmed === '') {
    el.cron.classList.remove('invalid');
    el.explanation.classList.remove('is-error');
    el.explanation.textContent = 'Type a cron expression to see what it means.';
    renderEmptyRuns('Enter a valid expression to preview upcoming runs.');
    return;
  }

  try {
    const sentence = explain(trimmed);
    const now = new Date();

    el.cron.classList.remove('invalid');
    el.explanation.classList.remove('is-error');
    el.explanation.textContent = sentence;

    renderRuns(trimmed, now);
    saveExpression(trimmed);
  } catch (err) {
    el.cron.classList.add('invalid');
    el.explanation.classList.add('is-error');
    el.explanation.textContent = err instanceof CronError
      ? err.message
      : 'That does not look like a valid cron expression yet.';
    renderEmptyRuns('Fix the expression to preview upcoming runs.');
  }
}

// ---- Persistence (last expression only) -------------------------------------

function saveExpression(expr) {
  try {
    window.localStorage.setItem(STORAGE_KEY, expr);
  } catch {
    // Storage may be unavailable (private mode, disabled). Non-fatal.
  }
}

function loadExpression() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// ---- Wiring ------------------------------------------------------------------

function buildPresets() {
  for (const { label, expr } of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset';

    const text = document.createElement('span');
    text.textContent = label;

    const code = document.createElement('code');
    code.textContent = expr;

    btn.append(text, code);
    btn.addEventListener('click', () => {
      el.cron.value = expr;
      update();
      el.cron.focus();
    });
    el.presets.appendChild(btn);
  }
}

function init() {
  el.tzLabel.textContent = localTimeZoneLabel(new Date());

  buildPresets();

  const saved = loadExpression();
  if (saved && saved.trim() !== '') {
    el.cron.value = saved;
  }

  el.cron.addEventListener('input', update);
  el.copyCron.addEventListener('click', () => {
    copyText(el.cron.value.trim(), el.copyCron, 'Copied');
  });
  el.copyExplain.addEventListener('click', () => {
    copyText(el.explanation.textContent, el.copyExplain, 'Copied');
  });

  update();
}

init();
