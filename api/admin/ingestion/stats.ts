import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from 'drizzle-orm'
import { getDatabase } from '../../../server/db/client.js'
import { opportunitySources } from '../../../server/db/schema/opportunity-sources.js'
import { opportunities } from '../../../server/db/schema/opportunities.js'
import { opportunitySyncRuns } from '../../../server/db/schema/sync-runs.js'
import { requireAdmin } from '../../../server/auth/require-admin.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const database = getDatabase()
  try {
    await requireAdmin(database, request.headers.authorization)
  } catch {
    return response.status(403).json({ error: 'Administrator access is required' })
  }
  const [sourceStats] = await database
    .select({
      totalSources: sql<number>`count(*)::int`,
      healthySources: sql<number>`count(*) filter (where ${opportunitySources.status} = 'HEALTHY')::int`,
      failingSources: sql<number>`count(*) filter (where ${opportunitySources.status} in ('DEGRADED', 'FAILING'))::int`,
      lastSuccessfulSync: sql<Date | null>`max(${opportunitySources.lastSuccessfulSyncAt})`
    })
    .from(opportunitySources)
  const [opportunityStats] = await database
    .select({
      activeOpportunities: sql<number>`count(*) filter (where ${opportunities.isActive})::int`,
      inactiveOpportunities: sql<number>`count(*) filter (where not ${opportunities.isActive})::int`,
      classificationSuccesses: sql<number>`count(*) filter (where ${opportunities.classificationStatus} = 'SUCCEEDED')::int`,
      classificationFailures: sql<number>`count(*) filter (where ${opportunities.classificationStatus} = 'FAILED')::int`
    })
    .from(opportunities)
  const [syncStats] = await database
    .select({
      opportunitiesFetched: sql<number>`coalesce(sum(${opportunitySyncRuns.fetchedCount}), 0)::int`,
      opportunitiesCreated: sql<number>`coalesce(sum(${opportunitySyncRuns.createdCount}), 0)::int`,
      opportunitiesUpdated: sql<number>`coalesce(sum(${opportunitySyncRuns.updatedCount}), 0)::int`,
      opportunitiesUnchanged: sql<number>`coalesce(sum(${opportunitySyncRuns.unchangedCount}), 0)::int`,
      opportunitiesDeactivated: sql<number>`coalesce(sum(${opportunitySyncRuns.deactivatedCount}), 0)::int`,
      duplicatesDetected: sql<number>`coalesce(sum(${opportunitySyncRuns.duplicateCount}), 0)::int`,
      averageSyncDurationMs: sql<number | null>`avg(${opportunitySyncRuns.durationMs})::int`
    })
    .from(opportunitySyncRuns)
  return response.status(200).json({
    ...sourceStats,
    ...opportunityStats,
    ...syncStats
  })
}
