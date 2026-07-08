## What does this change?

A short description of the change and the motivation for it.

## Type of change

- [ ] Bug fix
- [ ] New feature (e.g. a preset, broader cron support)
- [ ] Clearer English phrasing
- [ ] Documentation
- [ ] Other

## Before / after

If this changes behavior, show an example expression and the output before and
after your change:

| Expression | Before | After |
| ---------- | ------ | ----- |
| `…`        | `…`    | `…`   |

## Checklist

- [ ] `npm test` passes locally.
- [ ] I added or updated tests for parser / explain / schedule changes.
- [ ] No runtime dependencies were added; the app stays vanilla and offline.
- [ ] The Content Security Policy in `index.html` is unchanged.
- [ ] Scheduling logic stays pure and DOM-free (only `src/app.js` touches the DOM).
