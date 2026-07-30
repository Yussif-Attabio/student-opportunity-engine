import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { desc, eq } from 'drizzle-orm'
import { opportunitySources } from '../../server/db/schema/opportunity-sources.js'
import { opportunitySyncRuns } from '../../server/db/schema/sync-runs.js'
import { AdapterRegistry } from '../../server/ingestion/adapter-registry.js'
import type {
  NormalizedOpportunity,
  OpportunitySourceAdapter
} from '../../server/ingestion/contracts.js'
import { SourceFetchError } from '../../server/ingestion/errors.js'
import { syncSource } from '../../server/ingestion/sync-source.js'
import { clearIngestionTables, createTestDatabase } from './test-database.js'

const suite = describe.skipIf(!process.env.DATABASE_TEST_URL)

const normalized = (sourceId: string): NormalizedOpportunity => ({
  externalId: 'job-1',
  sourceId,
  sourceType: 'GREENHOUSE',
  organizationName: 'Example',
  organizationSlug: 'example',
  organizationLogoUrl: null,
  title: 'Software Engineer Intern',
  descriptionText: 'An internship building software.',
  descriptionHtml: '<p>An internship building software.</p>',
  opportunityType: 'INTERNSHIP',
  employmentType: 'INTERN',
  departments: ['Engineering'],
  locations: ['Remote'],
  city: null,
  state: null,
  country: null,
  remoteStatus: 'REMOTE',
  salaryMinimum: null,
  salaryMaximum: null,
  salaryCurrency: null,
  salaryPeriod: null,
  applicationUrl: 'https://example.com/jobs/1',
  sourceUrl: 'https://example.com/jobs/1',
  datePosted: null,
  applicationDeadline: null,
  rawSourceData: { id: 'job-1' }
})

const adapter = (fail = false): OpportunitySourceAdapter => ({
  sourceType: 'GREENHOUSE',
  validateSource: async () => ({ valid: true, errors: [] }),
  fetchOpportunities: async () => {
    if (fail) {
      throw new SourceFetchError('Temporary provider failure', { retryable: true })
    }
    return [{ externalId: 'job-1', data: { id: 'job-1' } }]
  },
  normalize: async (_raw, source) => normalized(source.id)
})

suite('source synchronization integration', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>>
  let sourceId: string

  beforeAll(async () => {
    context = await createTestDatabase()
  })
  beforeEach(async () => {
    await clearIngestionTables(context.database)
    const [source] = await context.database
      .insert(opportunitySources)
      .values({
        organizationName: 'Example',
        sourceType: 'GREENHOUSE',
        sourceIdentifier: 'example',
        careersUrl: 'https://example.com/careers'
      })
      .returning()
    sourceId = source!.id
  })
  afterAll(async () => context.close())

  it('records successful idempotent synchronization statistics', async () => {
    const registry = new AdapterRegistry([adapter()])
    expect((await syncSource(context.database, registry, sourceId)).createdCount).toBe(1)
    expect((await syncSource(context.database, registry, sourceId)).unchangedCount).toBe(1)
  })

  it('records failed runs and succeeds when the retry is delivered', async () => {
    await expect(
      syncSource(context.database, new AdapterRegistry([adapter(true)]), sourceId)
    ).rejects.toThrow('Temporary provider failure')

    const [failedRun] = await context.database
      .select()
      .from(opportunitySyncRuns)
      .where(eq(opportunitySyncRuns.sourceId, sourceId))
      .orderBy(desc(opportunitySyncRuns.createdAt))
      .limit(1)
    expect(failedRun?.status).toBe('FAILED')

    const retried = await syncSource(
      context.database,
      new AdapterRegistry([adapter()]),
      sourceId
    )
    expect(retried.status).toBe('SUCCEEDED')
  })
})
