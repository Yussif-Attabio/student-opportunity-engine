import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import { opportunities } from '../db/schema/opportunities.js'

type Database = ReturnType<typeof getDatabase>

export const recordMissingAfterSuccessfulSync = async (
  database: Database,
  sourceId: string,
  seenExternalIds: string[],
  threshold: number,
  now = new Date()
): Promise<number> => {
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new Error('Missed synchronization threshold must be a positive integer')
  }

  const missingCondition =
    seenExternalIds.length > 0
      ? and(
          eq(opportunities.sourceId, sourceId),
          eq(opportunities.isActive, true),
          notInArray(opportunities.externalId, seenExternalIds)
        )
      : and(eq(opportunities.sourceId, sourceId), eq(opportunities.isActive, true))

  const missing = await database
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(missingCondition)
  if (missing.length === 0) return 0

  const updated = await database
    .update(opportunities)
    .set({
      missedSuccessfulSyncs: sql`${opportunities.missedSuccessfulSyncs} + 1`,
      isActive: sql`case when ${opportunities.missedSuccessfulSyncs} + 1 >= ${threshold} then false else true end`,
      updatedAt: now
    })
    .where(inArray(opportunities.id, missing.map(({ id }) => id)))
    .returning({ isActive: opportunities.isActive })

  return updated.filter(({ isActive }) => !isActive).length
}
