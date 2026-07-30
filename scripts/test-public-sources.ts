import { verifiedSeedSources } from '../server/db/seed/sources.js'
import type { OpportunitySource } from '../server/ingestion/contracts.js'
import { createAdapterRegistry } from '../server/ingestion/create-adapter-registry.js'

const registry = createAdapterRegistry()

for (const [index, input] of verifiedSeedSources.entries()) {
  if (!input.enabled) {
    console.log(`${input.organizationName}: skipped (credentials not configured)`)
    continue
  }
  const source: OpportunitySource = {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    ...input,
    nextSyncAt: null,
    lastSuccessfulSyncAt: null,
    lastAttemptedSyncAt: null,
    consecutiveFailures: 0,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const adapter = registry.get(source.sourceType)
  const validation = await adapter.validateSource(source)
  if (!validation.valid) {
    throw new Error(`${source.organizationName}: ${validation.errors.join('; ')}`)
  }
  const raw = await adapter.fetchOpportunities(source)
  if (raw[0]) await adapter.normalize(raw[0], source)
  console.log(`${source.organizationName}: ${raw.length} public postings`)
}
