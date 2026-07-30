# Opportunity ingestion architecture

The ingestion system extends the existing React/Vite and Vercel application without
replacing it. Supabase PostgreSQL stores sources, normalized opportunities, sync runs,
classification attempts, admin roles, and durable failures. Drizzle owns schema and
migrations.

QStash calls `/api/internal/cron/dispatch-sources` every 15 minutes. A once-daily Vercel
Cron is retained as a free-plan safety trigger. The dispatcher selects due enabled
sources and publishes identifier-only messages to QStash. Signed workers synchronize
one source or classify one opportunity. QStash supplies durable delivery, exponential
retries, failure callbacks, and flow-control concurrency.

Provider adapters are isolated behind `OpportunitySourceAdapter`. The shared sync core
does not contain Greenhouse, Lever, Ashby, Adzuna, or JSON-LD response logic. Built-in
API adapters construct requests only for fixed HTTPS allowlisted provider hosts.

`STRUCTURED_DATA` sources point to one explicitly registered HTTPS career page. The
safe page client verifies the exact hostname, rejects private and reserved DNS results,
checks robots.txt, follows only bounded redirects to explicitly approved hosts, sends
an identifying User-Agent, and limits response time and size. It parses static HTML
only and never executes page scripts.

The existing `/api/jobs` request-time feed remains a temporary compatibility path.
New integrations should use the persisted `/api/opportunities` API.
