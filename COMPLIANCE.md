# Compliance Notes

**This document describes technical design choices and is not legal advice or a
certification of compliance.** It explains, honestly, how cronspeak's
architecture relates to common data-protection expectations. cronspeak is a
static, client-side application with no backend and no data collection, which is
what makes most of these mappings straightforward.

## Design facts these mappings rest on

- The application runs entirely in the user's browser. There is no server-side
  processing of user input and no database.
- The Content Security Policy sets `connect-src 'none'`, so the page cannot make
  network requests; user input therefore cannot be transmitted anywhere.
- The only data ever stored is the user's most recent cron expression, kept in
  their own browser's `localStorage` on their device.
- The maintainers operate no service that receives user data. A host such as
  GitHub Pages processes standard access logs (e.g. IP addresses) under its own
  privacy policy; the maintainers have no access to them.

## GDPR (EU General Data Protection Regulation)

- **Art. 5 — Data minimisation & purpose limitation.** The application collects
  no personal data. The single stored value (last expression) is a technical
  string kept locally for the sole purpose of pre-filling the input field.
- **Art. 25 — Data protection by design and by default.** Local-only processing
  and `connect-src 'none'` are privacy-by-design in the strongest form: the
  system is built so that transmitting personal data is not possible, and the
  default state stores nothing beyond an optional local convenience value.
- **Arts. 15–20 — Rights of access, rectification, erasure, restriction, and
  portability.** These are honoured by design. Because the maintainers hold no
  personal data, there is nothing to disclose, correct, or delete on request;
  the user retains complete control over the only stored value and can view or
  clear it themselves through their browser.
- **Art. 32 — Security of processing.** A restrictive CSP (`connect-src 'none'`,
  no external scripts/styles/objects/frames), no backend, and no data at rest on
  any server minimise the attack surface. There is no personal data in transit
  or in server-side storage to protect.

## India — Digital Personal Data Protection Act, 2023 (DPDPA)

- **Data minimisation & purpose limitation.** No personal data is processed by
  the application; the only stored item is a local technical string used solely
  to restore the last input.
- **No processing by the maintainers.** The maintainers act on no personal data,
  since none is transmitted to them. Any host access logs are the host's
  processing under its own terms, not the maintainers'.
- **Data-principal rights.** Rights such as access, correction, and erasure are
  satisfied inherently: there is no maintainer-held personal data to act on, and
  the user controls the only local value directly.
- **Grievance redressal.** As a substitute for the DPO / grievance-officer point
  of contact that the Act anticipates, the project provides a privacy contact
  (see below) for questions or concerns. For a static project of this kind with
  no data collection, this contact serves that expectation.

## HIPAA (US Health Insurance Portability and Accountability Act)

**Not applicable.** cronspeak does not create, receive, maintain, or transmit any
Protected Health Information (PHI). The maintainers are neither a covered entity
nor a business associate, and there is no server-side processing of any kind. No
Business Associate Agreement is relevant. The security safeguards the project
does follow — no backend, no data transmission (`connect-src 'none'`), no
server-side storage, and a minimal client attack surface — are noted here for
completeness, not because HIPAA governs this tool.

## Privacy contact

`privacy@example.com` _(placeholder — replace with a real contact address before
publishing)_.
