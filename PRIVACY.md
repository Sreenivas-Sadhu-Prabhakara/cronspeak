# Privacy Policy

_Last updated: 2026_

cronspeak is a static, client-side web application. This policy describes what
happens to your data honestly and in plain terms.

## The short version

cronspeak collects nothing, transmits nothing, and has no backend. Everything
you type is processed by JavaScript running in your own browser, on your own
device, and never leaves it.

## What data the application collects

**None.** The application does not gather, log, or transmit any personal data,
usage analytics, telemetry, cookies, or identifiers. There is no account system
and no server that the application talks to.

## How this is enforced

The page is served with a Content Security Policy that includes:

```
connect-src 'none'
```

This directive instructs your browser to block **all** outbound network requests
the page could attempt — `fetch`, `XMLHttpRequest`, WebSockets, and similar. As a
result, even a bug or a malicious dependency could not exfiltrate your input,
because the browser itself refuses the connection. The policy also blocks
external scripts, styles from arbitrary origins, plugins, and framing, further
shrinking the attack surface. There are no third-party fonts, scripts, or
tracking pixels of any kind.

## The only data storage

If you use the app, it may store **only your most recently entered expression**
in your browser's `localStorage`, purely so the field is pre-filled the next time
you open the page. This value:

- stays on your device and is never transmitted;
- contains only a cron expression (a short technical string), not personal data;
- can be removed at any time by clearing site data / browser storage for this
  origin.

Nothing else is stored.

## Hosting and server logs

If you use a hosted copy (for example on GitHub Pages), the **host** — not the
maintainers — operates the web server that delivers the page. Like essentially
all web hosts, that server processes standard access logs, which can include
your IP address, user agent, and the time of the request, in order to serve the
file and protect the service. Those logs are handled under the host's own
privacy policy (for GitHub Pages, GitHub's privacy statement). **The maintainers
of cronspeak have no access to those logs and receive no data from them.** If you
open `index.html` locally instead, no server is involved at all.

## Your rights

Because the application holds no personal data about you, there is nothing for us
to export, correct, or delete on your behalf. You remain fully in control: the
only stored value is the last expression in your own browser, which you can view
or clear yourself at any time through your browser's settings.

## Changes to this policy

Any changes will be committed to this file in the public repository, so the
history is transparent and auditable.

## Contact

Privacy questions: `privacy@example.com` _(placeholder — replace with a real
contact address before publishing)_.
