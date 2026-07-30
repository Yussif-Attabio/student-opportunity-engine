import { and, eq, or } from 'drizzle-orm'
import { closeDatabase, getDatabase } from '../server/db/client.js'
import { opportunities } from '../server/db/schema/opportunities.js'
import { IngestionQueueClient } from '../server/queue/client.js'

const database = getDatabase()
const candidates = await database
  .select({ id: opportunities.id })
  .from(opportunities)
  .where(
    and(
      eq(opportunities.isActive, true),
      eq(opportunities.studentEligible, true),
      or(
        eq(opportunities.classificationStatus, 'PENDING'),
        eq(opportunities.classificationStatus, 'FAILED')
      )
    )
  )

const queue = new IngestionQueueClient()
for (const candidate of candidates) {
  await queue.enqueue(candidate.id)
}

console.log(`Queued ${candidates.length} student-candidate classifications.`)
await closeDatabase()
