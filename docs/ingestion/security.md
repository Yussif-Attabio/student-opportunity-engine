# Ingestion security

Built-in JSON APIs use fixed HTTPS host allowlists. Structured-data pages use an exact
per-source host allowlist derived from the database registry. Source creation is
restricted to authenticated administrators.

Before every page or redirect request, the page client:

1. Requires HTTPS and port 443.
2. Rejects embedded credentials.
3. Requires an exact approved hostname.
4. Resolves DNS and rejects loopback, private, carrier-grade NAT, link-local,
   documentation, benchmark, multicast, reserved, and cloud-metadata addresses.
5. Checks robots.txt using the identifying `JOB_SYNC_USER_AGENT`.
6. Follows at most three redirects, validating every destination again.
7. Applies a timeout and streaming response-size limit.
8. Accepts only HTML or XHTML for career pages.

The adapter parses `<script type="application/ld+json">` as inert text with `parse5`.
It never runs JavaScript. Descriptions pass through `sanitize-html`; scripts, event
handlers, iframes, and unsafe URL schemes are removed before storage.

Provider tokens, authorization headers, descriptions, raw payloads, and resumes are
redacted from structured logs. Queue payloads contain database identifiers only.

Do not add arbitrary user-supplied URL fetching. Custom scrapers must be
registered by identifier, restricted to reviewed domains, covered by saved fixtures,
and individually disableable.

The custom scraper adapter enforces that boundary in code: source identifiers must
resolve to a compiled definition; organization and listing URL must match it exactly;
discovered URLs are filtered to its host allowlist; each page is rechecked against
robots.txt and pinned public DNS; crawls are sequential, delayed, and capped at 25
details. Provider HTML is never stored as opportunity raw data.
