# Opportunity ingestion architecture

The ingestion system extends the existing React/Vite and Vercel application without
replacing it. Supabase PostgreSQL stores sources, normalized opportunities, sync runs,
classification attempts, admin roles, and durable failures. Drizzle owns schema and
migrations.

Vercel Cron calls `/api/internal/cron/dispatch-sources` every 15 minutes. The dispatcher
selects due enabled sources and publishes identifier-only messages to QStash. Signed
workers synchronize one source or classify one opportunity. QStash supplies durable
delivery, exponential retries, failure callbacks, and flow-control concurrency.

Provider adapters are isolated behind `OpportunitySourceAdapter`. The shared sync core
does not contain Greenhouse, Lever, or Ashby response logic. Built-in adapters construct
requests only for fixed HTTPS allowlisted provider hosts.

The existing `/api/jobs` request-time feed remains a temporary compatibility path.
New integrations should use the persisted `/api/opportunities` API.
