import { getDatabase, closeDatabase } from '../server/db/client.js'
import { opportunitySources } from '../server/db/schema/opportunity-sources.js'
import { verifiedSeedSources } from '../server/db/seed/sources.js'

const run = async () => {
  const database = getDatabase()
  for (const source of verifiedSeedSources) {
    await database
      .insert(opportunitySources)
      .values({
        ...source,
        status: 'PENDING',
        nextSyncAt: new Date()
      })
      .onConflictDoUpdate({
        target: [opportunitySources.sourceType, opportunitySources.sourceIdentifier],
        set: {
          organizationName: source.organizationName,
          careersUrl: source.careersUrl,
          syncFrequencyMinutes: source.syncFrequencyMinutes,
          metadata: source.metadata,
          updatedAt: new Date()
        }
      })
  }
}

run()
  .then(() => {
    console.log(`Seeded ${verifiedSeedSources.length} verified opportunity sources.`)
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Source seeding failed')
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })
