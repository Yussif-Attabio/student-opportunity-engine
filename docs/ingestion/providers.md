# Providers and source registry

| Provider | Identifier | Public endpoint |
| --- | --- | --- |
| Greenhouse | Board token | `boards-api.greenhouse.io/v1/boards/{token}/jobs` |
| Lever | Site name | `api.lever.co/v0/postings/{site}` |
| Ashby | Job-board name | `api.ashbyhq.com/posting-api/job-board/{name}` |
| Adzuna | Two-letter country code | `api.adzuna.com/v1/api/jobs/{country}/search/{page}` |

Adzuna provides optional broad, multi-company discovery. Configure
`ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, then rerun `npm run db:seed` to enable its
United States internship source. Adzuna listings must retain their redirect URL
and display the required “Jobs by Adzuna” attribution.

Add organizations through `POST /api/admin/sources` or the seed process. A source holds
its organization, provider type, public identifier, careers URL, enabled state,
frequency, health, timestamps, and provider metadata. Aggregator adapters may
use the organization supplied by each listing rather than the source name.

To add a provider, implement `OpportunitySourceAdapter`, validate responses with Zod,
use a fixed provider-domain allowlist, register it in `create-adapter-registry.ts`, add
fixtures and tests, then add its enum value through a migration. Never bypass
authentication, CAPTCHA, rate limits, robots policy, or terms.

`npm run sources:test-public` is an optional network smoke test for verified seed
identifiers. It is not part of deterministic automated tests.
