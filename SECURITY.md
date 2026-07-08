# Security Policy

## Supported versions

cronspeak is a single static page released from the `main` branch. Security
fixes are applied to the current version on `main`; there are no separately
maintained release branches.

| Version        | Supported |
| -------------- | --------- |
| `main` (latest) | ✅        |
| older commits   | ❌        |

## Attack surface

cronspeak has **no backend, no database, and no server-side code**. It runs
entirely in the browser and, by its Content Security Policy (`connect-src
'none'`), makes no network requests. There is no authentication, no user data
transmitted, and no API to attack. The realistic surface is limited to the
client-side code itself (for example a parsing or DOM-handling flaw).

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** — do not open a public
issue for a security problem.

- Preferred: open a **GitHub Security Advisory** on the repository
  (Security → Report a vulnerability), which keeps the discussion private until a
  fix is ready.
- Alternatively, email the privacy contact: `privacy@example.com` _(placeholder —
  replace with a real address before publishing)_.

Please include steps to reproduce, the affected file(s), and the impact you
observed.

## Response expectations

- **Acknowledgement:** within 5 business days.
- **Assessment and plan:** within 10 business days of acknowledgement.
- **Fix and disclosure:** coordinated with the reporter once a fix is available;
  we aim to credit reporters who wish to be named.

Because there is no server component, most fixes take effect as soon as the
static site is redeployed and users reload the page.
