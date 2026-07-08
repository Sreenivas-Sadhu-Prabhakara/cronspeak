# Contributing to cronspeak

Thanks for your interest in improving cronspeak. This is a small, dependency-free
project, and contributions of all sizes are welcome — bug reports, new preset
schedules, clearer English phrasing, and fixes to edge cases in cron parsing are
all valuable.

Please be respectful and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Running it locally

There is no build step and nothing to install to run the app. Open `index.html`
directly, or serve the folder so ES modules load reliably:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Running the tests

The scheduling logic lives in pure, DOM-free modules under `src/` and is covered
by Node's built-in test runner (no dependencies):

```bash
npm test        # runs: node --test
```

Node 18 or newer is required. Please add or update tests for any change to the
parser, the English explainer, or the schedule computation.

## Code style

- **Vanilla JavaScript, ES modules, no runtime dependencies.** Do not add a
  bundler, a framework, or a package that has to be installed to run the app.
- Keep all scheduling logic in `src/parser.js`, `src/explain.js`, and
  `src/schedule.js` as **pure, DOM-free** functions so they stay testable.
  `src/app.js` is the only file that touches the DOM.
- Time math must be deterministic: pure functions take a reference `Date`
  argument and must never call `Date.now()` internally.
- No external network requests, CDNs, or web fonts. The Content Security Policy
  in `index.html` (`connect-src 'none'`) is intentional — keep it intact.
- Match the existing formatting: two-space indent, semicolons, single quotes.

## Pull request process

1. Fork the repository and create a branch for your change.
2. Make your change and add/adjust tests; run `npm test` and make sure
   everything passes.
3. Keep the diff focused — one logical change per pull request.
4. Open a pull request describing **what** changed and **why**. If it changes
   behavior, include an example expression and the before/after output.
5. A maintainer will review; please be responsive to feedback.

## Reporting bugs and requesting features

Use the issue templates under **New issue**. For security issues, do **not**
open a public issue — follow [SECURITY.md](SECURITY.md) instead.
