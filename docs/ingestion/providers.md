# Providers and source registry

| Provider | Identifier | Public endpoint |
| --- | --- | --- |
| Greenhouse | Board token | `boards-api.greenhouse.io/v1/boards/{token}/jobs` |
| Lever | Site name | `api.lever.co/v0/postings/{site}` |
| Ashby | Job-board name | `api.ashbyhq.com/posting-api/job-board/{name}` |
| Adzuna | Two-letter country code | `api.adzuna.com/v1/api/jobs/{country}/search/{page}` |
| Structured data | Exact career-page hostname | Explicit HTTPS page containing `JobPosting` JSON-LD |

Adzuna provides optional broad, multi-company discovery. Configure
`ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, then run `npm run db:seed`. If an existing
Adzuna source was previously disabled, enable it explicitly through the admin API;
seeding deliberately preserves all existing enabled/disabled states so takedowns are
not reversed. Adzuna listings must retain their redirect URL
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

`CUSTOM_SCRAPER` uses an approved-domain registry. A scraper definition must be
compiled into `server/ingestion/custom-scrapers`, identify one organization and exact
listing URL, limit crawled detail pages to 25 or fewer, wait at least 100 ms between
detail requests, and extract only that site's known static HTML. There is intentionally
no universal scraper or arbitrary URL fetch endpoint. Admin source creation rejects
identifiers not present in the registry.

The first registered scraper is `unesco-careers`. It reads only the robots-allowed
`https://careers.unesco.org/search/` listing and `/job/.../{id}/` detail paths, never
requests the disallowed `/services/`, `/talentcommunity/`, or application paths, and
runs at most daily. It was live-verified on 2026-07-30 with 10 public student-detail
pages, including education, culture, science, communications, and oversight
internships. Non-student search results are discarded before detail fetching.

To add a provider, implement `OpportunitySourceAdapter`, validate responses with Zod,
use a fixed provider-domain allowlist, register it in `create-adapter-registry.ts`, add
fixtures and tests, then add its enum value through a migration. Never bypass
authentication, CAPTCHA, rate limits, robots policy, or terms.

Before adding a custom scraper, confirm no supported official API or usable
`JobPosting` JSON-LD exists, review robots.txt and site terms, save listing/detail
fixtures, register only necessary hosts, and document the verification date. Scrapers
must be removed or disabled when the organization requests a takedown.

`npm run sources:test-public` is an optional network smoke test for verified seed
identifiers. It is not part of deterministic automated tests.

The verified production seed set includes student-focused non-technical coverage from
One Acre Fund, Human Rights Watch, ProPublica, and the ACLU, plus Anthropic fellowships.
Identifiers and `verifiedAt` dates are stored with each seed. A provider is not seeded
only because it has non-technical jobs; it must have a current student, intern,
apprentice, new-graduate, or fellowship signal and fit response-size safety limits.
