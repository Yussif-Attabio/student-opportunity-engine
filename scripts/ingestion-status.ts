import { desc, sql } from 'drizzle-orm'
import { closeDatabase, getDatabase } from '../server/db/client.js'
import { ingestionFailures } from '../server/db/schema/failures.js'
import { opportunities } from '../server/db/schema/opportunities.js'
import { opportunitySources } from '../server/db/schema/opportunity-sources.js'
import { opportunitySyncRuns } from '../server/db/schema/sync-runs.js'

const database = getDatabase()

const [sources, runs, failures, [opportunityCount]] = await Promise.all([
  database
    .select({
      organization: opportunitySources.organizationName,
      status: opportunitySources.status,
      failures: opportunitySources.consecutiveFailures,
      lastAttempt: opportunitySources.lastAttemptedSyncAt,
      lastSuccess: opportunitySources.lastSuccessfulSyncAt
    })
    .from(opportunitySources),
  database
    .select({
      status: opportunitySyncRuns.status,
      fetched: opportunitySyncRuns.fetchedCount,
      created: opportunitySyncRuns.createdCount,
      failures: opportunitySyncRuns.failureCount,
      error: opportunitySyncRuns.errorMessage
    })
    .from(opportunitySyncRuns)
    .orderBy(desc(opportunitySyncRuns.createdAt))
    .limit(10),
  database
    .select({
      kind: ingestionFailures.kind,
      error: ingestionFailures.errorMessage,
      createdAt: ingestionFailures.createdAt
    })
    .from(ingestionFailures)
    .orderBy(desc(ingestionFailures.createdAt))
    .limit(10),
  database.select({ count: sql<number>`count(*)::int` }).from(opportunities)
])

console.log(
  JSON.stringify(
    {
      opportunityCount: opportunityCount?.count ?? 0,
      sources,
      runs,
      failures
    },
    null,
    2
  )
)

await closeDatabase()
