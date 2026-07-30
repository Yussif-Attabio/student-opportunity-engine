# Providers and source registry

| Provider | Identifier | Public endpoint |
| --- | --- | --- |
| Greenhouse | Board token | `boards-api.greenhouse.io/v1/boards/{token}/jobs` |
| Lever | Site name | `api.lever.co/v0/postings/{site}` |
| Ashby | Job-board name | `api.ashbyhq.com/posting-api/job-board/{name}` |

Add organizations through `POST /api/admin/sources` or the seed process. A source holds
its organization, provider type, public identifier, careers URL, enabled state,
frequency, health, timestamps, and provider metadata. No code change is needed.

To add a provider, implement `OpportunitySourceAdapter`, validate responses with Zod,
use a fixed provider-domain allowlist, register it in `create-adapter-registry.ts`, add
fixtures and tests, then add its enum value through a migration. Never bypass
authentication, CAPTCHA, rate limits, robots policy, or terms.

`npm run sources:test-public` is an optional network smoke test for verified seed
identifiers. It is not part of deterministic automated tests.
