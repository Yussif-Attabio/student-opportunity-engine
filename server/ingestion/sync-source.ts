import { eq, sql } from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import { ingestionFailures } from '../db/schema/failures.js'
import { opportunitySources } from '../db/schema/opportunity-sources.js'
import { opportunitySyncRuns } from '../db/schema/sync-runs.js'
import { logger } from '../logging.js'
import type { AdapterRegistry } from './adapter-registry.js'
import { recordMissingAfterSuccessfulSync } from './deactivate-missing.js'
import {
  SourceFetchError,
  SourceSyncAlreadyRunningError,
  SourceValidationError
} from './errors.js'
import { upsertOpportunity } from './upsert-opportunity.js'

type Database = ReturnType<typeof getDatabase>

export interface ClassificationDispatcher {
  enqueue(opportunityId: string): Promise<void>
}

export interface SyncSourceResult {
  syncRunId: string
  status: 'SUCCEEDED' | 'PARTIAL'
  fetchedCount: number
  createdCount: number
  updatedCount: number
  unchangedCount: number
  deactivatedCount: number
  duplicateCount: number
  classificationQueuedCount: number
  failureCount: number
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message.slice(0, 2_000) : 'Unknown ingestion error'

const nextSyncAt = (frequencyMinutes: number, from: Date): Date =>
  new Date(from.getTime() + frequencyMinutes * 60_000)

export const syncSource = async (
  database: Database,
  adapters: AdapterRegistry,
  sourceId: string,
  classificationDispatcher?: ClassificationDispatcher,
  now = new Date()
): Promise<SyncSourceResult> => {
  const [source] = await database
    .select()
    .from(opportunitySources)
    .where(eq(opportunitySources.id, sourceId))
    .limit(1)
  if (!source) throw new Error(`Opportunity source ${sourceId} was not found`)
  if (!source.enabled) throw new Error(`Opportunity source ${sourceId} is disabled`)

  let syncRun: { id: string } | undefined
  try {
    ;[syncRun] = await database
      .insert(opportunitySyncRuns)
      .values({ sourceId, status: 'RUNNING', startedAt: now })
      .returning({ id: opportunitySyncRuns.id })
  } catch (error) {
    const databaseError = error as { code?: unknown; constraint_name?: unknown }
    if (
      databaseError.code === '23505' &&
      databaseError.constraint_name ===
        'opportunity_sync_runs_one_running_per_source_uidx'
    ) {
      throw new SourceSyncAlreadyRunningError(sourceId)
    }
    throw error
  }
  if (!syncRun) throw new Error('Failed to create synchronization run')

  await database
    .update(opportunitySources)
    .set({ lastAttemptedSyncAt: now, updatedAt: now })
    .where(eq(opportunitySources.id, sourceId))

  const stats = {
    fetchedCount: 0,
    validCount: 0,
    createdCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    deactivatedCount: 0,
    duplicateCount: 0,
    classificationQueuedCount: 0,
    failureCount: 0
  }
  const seenExternalIds: string[] = []

  const recordFailure = async (
    kind: 'SOURCE_VALIDATION' | 'SOURCE_FETCH' | 'NORMALIZATION' | 'UPSERT' | 'QUEUE_DELIVERY',
    error: unknown,
    details: Record<string, unknown> = {}
  ) => {
    stats.failureCount += 1
    await database.insert(ingestionFailures).values({
      kind,
      sourceId,
      syncRunId: syncRun.id,
      errorCode: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: errorMessage(error),
      details
    })
  }

  try {
    const adapter = adapters.get(source.sourceType)
    const validation = await adapter.validateSource(source)
    if (!validation.valid) {
      const validationError = new SourceValidationError(validation.errors.join('; '))
      await recordFailure('SOURCE_VALIDATION', validationError, {
        validationErrors: validation.errors
      })
      throw validationError
    }

    let rawOpportunities
    try {
      rawOpportunities = await adapter.fetchOpportunities(source)
      stats.fetchedCount = rawOpportunities.length
    } catch (error) {
      await recordFailure('SOURCE_FETCH', error, {
        retryable: error instanceof SourceFetchError ? error.retryable : false,
        statusCode: error instanceof SourceFetchError ? error.statusCode : null
      })
      throw error
    }

    for (const rawOpportunity of rawOpportunities) {
      let normalized
      try {
        normalized = await adapter.normalize(rawOpportunity, source)
        stats.validCount += 1
      } catch (error) {
        await recordFailure('NORMALIZATION', error, {
          externalId: rawOpportunity.externalId
        })
        continue
      }

      try {
        const result = await upsertOpportunity(database, normalized, now)
        seenExternalIds.push(normalized.externalId)
        stats[`${result.outcome}Count`] += 1
        if (result.duplicateDetected) stats.duplicateCount += 1

        if (result.classificationRequired && classificationDispatcher) {
          try {
            await classificationDispatcher.enqueue(result.id)
            stats.classificationQueuedCount += 1
          } catch (error) {
            await recordFailure('QUEUE_DELIVERY', error, { opportunityId: result.id })
          }
        }
      } catch (error) {
        await recordFailure('UPSERT', error, {
          externalId: normalized.externalId
        })
      }
    }

    if (stats.failureCount === 0) {
      const threshold = Number(process.env.MISSED_SYNC_THRESHOLD ?? 3)
      stats.deactivatedCount = await recordMissingAfterSuccessfulSync(
        database,
        sourceId,
        seenExternalIds,
        threshold,
        now
      )
    }

    const status = stats.failureCount === 0 ? 'SUCCEEDED' : 'PARTIAL'
    const completedAt = new Date()
    await database
      .update(opportunitySyncRuns)
      .set({
        ...stats,
        status,
        completedAt,
        durationMs: completedAt.getTime() - now.getTime(),
        updatedAt: completedAt
      })
      .where(eq(opportunitySyncRuns.id, syncRun.id))
    await database
      .update(opportunitySources)
      .set({
        status: status === 'SUCCEEDED' ? 'HEALTHY' : 'DEGRADED',
        lastSuccessfulSyncAt: status === 'SUCCEEDED' ? completedAt : source.lastSuccessfulSyncAt,
        consecutiveFailures:
          status === 'SUCCEEDED' ? 0 : sql`${opportunitySources.consecutiveFailures} + 1`,
        nextSyncAt: nextSyncAt(source.syncFrequencyMinutes, completedAt),
        updatedAt: completedAt
      })
      .where(eq(opportunitySources.id, sourceId))

    logger.info({ sourceId, syncRunId: syncRun.id, status, ...stats }, 'Source sync completed')
    return { syncRunId: syncRun.id, status, ...stats }
  } catch (error) {
    const completedAt = new Date()
    await database
      .update(opportunitySyncRuns)
      .set({
        ...stats,
        status: 'FAILED',
        completedAt,
        durationMs: completedAt.getTime() - now.getTime(),
        errorCode: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: errorMessage(error),
        updatedAt: completedAt
      })
      .where(eq(opportunitySyncRuns.id, syncRun.id))
    await database
      .update(opportunitySources)
      .set({
        status:
          source.consecutiveFailures + 1 >= 3
            ? 'FAILING'
            : 'DEGRADED',
        consecutiveFailures: sql`${opportunitySources.consecutiveFailures} + 1`,
        nextSyncAt: nextSyncAt(source.syncFrequencyMinutes, completedAt),
        updatedAt: completedAt
      })
      .where(eq(opportunitySources.id, sourceId))
    logger.error(
      { sourceId, syncRunId: syncRun.id, error: errorMessage(error) },
      'Source sync failed'
    )
    throw error
  }
}
