import { closeDatabase, getDatabase } from '../server/db/client.js'
import { opportunitySources } from '../server/db/schema/opportunity-sources.js'
import { createAdapterRegistry } from '../server/ingestion/create-adapter-registry.js'
import { syncSource } from '../server/ingestion/sync-source.js'

const database = getDatabase()
const sources = await database.select().from(opportunitySources)
const registry = createAdapterRegistry()

try {
  for (const source of sources.filter((item) => item.enabled)) {
    const result = await syncSource(database, registry, source.id)
    console.log(
      `${source.organizationName}: ${result.status}, ${result.createdCount} created, ${result.updatedCount} updated`
    )
  }
} finally {
  await closeDatabase()
}
