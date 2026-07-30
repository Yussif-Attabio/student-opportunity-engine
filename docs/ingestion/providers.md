# Providers and source registry

| Provider | Identifier | Public endpoint |
| --- | --- | --- |
| Greenhouse | Board token | `boards-api.greenhouse.io/v1/boards/{token}/jobs` |
| Lever | Site name | `api.lever.co/v0/postings/{site}` |
| Ashby | Job-board name | `api.ashbyhq.com/posting-api/job-board/{name}` |
| Adzuna | Two-letter country code | `api.adzuna.com/v1/api/jobs/{country}/search/{page}` |
| Structured data | Exact career-page hostname | Explicit HTTPS page containing `JobPosting` JSON-LD |

Adzuna provides optional broad, multi-company discovery. Configure
`ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, then rerun `npm run db:seed` to enable its
United States internship source. Adzuna listings must retain their redirect URL
and display the required “Jobs by Adzuna” attribution.

Add organizations through `POST /api/admin/sources` or the seed process. A source holds
its organization, provider type, public identifier, careers URL, enabled state,
frequency, health, timestamps, and provider metadata. Aggregator adapters may
use the organization supplied by each listing rather than the source name.

For a structured-data source:

- Set `sourceIdentifier` to the exact lowercase hostname in `careersUrl`.
- Put additional approved redirect hosts in `metadata.allowedHosts` only when verified.
- Register a job-listing page that returns JSON-LD in static HTML.
- Confirm robots.txt allows the page for `JOB_SYNC_USER_AGENT`.
- Prefer an official ATS/API adapter whenever one exists.

The adapter supports a single object, a top-level array, and nested `@graph` records.
Malformed JSON-LD scripts and malformed individual jobs are isolated. Scripts are
parsed as text and are never executed.

`CUSTOM_SCRAPER` is reserved for the later approved-domain scraper registry. There is
intentionally no arbitrary scraper or arbitrary URL fetch endpoint.

To add a provider, implement `OpportunitySourceAdapter`, validate responses with Zod,
use a fixed provider-domain allowlist, register it in `create-adapter-registry.ts`, add
fixtures and tests, then add its enum value through a migration. Never bypass
authentication, CAPTCHA, rate limits, robots policy, or terms.

`npm run sources:test-public` is an optional network smoke test for verified seed
identifiers. It is not part of deterministic automated tests.

The verified production seed set includes student-focused non-technical coverage from
One Acre Fund, Human Rights Watch, ProPublica, and the ACLU, plus Anthropic fellowships.
Identifiers and `verifiedAt` dates are stored with each seed. A provider is not seeded
only because it has non-technical jobs; it must have a current student, intern,
apprentice, new-graduate, or fellowship signal and fit response-size safety limits.
