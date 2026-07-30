# Troubleshooting

**No opportunities appear:** confirm migrations and seed completed, the source is
enabled, `next_sync_at` is due, and the latest run succeeded.

**Worker returns 401:** `APP_URL` must exactly match the QStash destination and signing
keys must be current.

**Source fails validation:** check the public board identifier and Lever region. Use the
source-test endpoint or `npm run sources:test-public`.

**Records are not deactivated:** only complete successful syncs increment misses. Review
partial-run failures and `MISSED_SYNC_THRESHOLD`.

**Classification repeats:** compare content hash, `CLASSIFIER_VERSION`, and the latest
attempt. Failed attempts are intentionally retryable.

**Database tests are skipped:** provide an isolated `DATABASE_TEST_URL`. Never use a
production or shared development database.

**Structured career page is rejected:** confirm the URL uses HTTPS, `sourceIdentifier`
exactly matches the hostname, redirects are explicitly allowlisted, DNS resolves only
to public addresses, robots.txt allows `JOB_SYNC_USER_AGENT`, the response is static
HTML below `SOURCE_HTML_MAX_RESPONSE_BYTES`, and valid `JobPosting` JSON-LD exists.
