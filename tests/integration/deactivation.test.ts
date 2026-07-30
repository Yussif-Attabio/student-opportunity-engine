import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { opportunities } from '../../server/db/schema/opportunities.js'
import { opportunitySources } from '../../server/db/schema/opportunity-sources.js'
import { recordMissingAfterSuccessfulSync } from '../../server/ingestion/deactivate-missing.js'
import { clearIngestionTables, createTestDatabase } from './test-database.js'

const suite = describe.skipIf(!process.env.DATABASE_TEST_URL)

suite('successful-miss deactivation integration', () => {
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
        sourceType: 'LEVER',
        sourceIdentifier: 'example',
        careersUrl: 'https://example.com/careers'
      })
      .returning()
    sourceId = source!.id
    await context.database.insert(opportunities).values({
      externalId: 'missing-job',
      sourceId,
      sourceType: 'LEVER',
      organizationName: 'Example',
      organizationSlug: 'example',
      title: 'Intern',
      applicationUrl: 'https://example.com/jobs/missing',
      canonicalApplicationUrl: 'https://example.com/jobs/missing',
      sourceUrl: 'https://example.com/jobs/missing',
      contentHash: 'a'.repeat(64),
      fingerprint: 'b'.repeat(64),
      rawSourceData: {}
    })
  })
  afterAll(async () => context.close())

  it('deactivates only after three successful misses', async () => {
    expect(await recordMissingAfterSuccessfulSync(context.database, sourceId, [], 3)).toBe(
      0
    )
    expect(await recordMissingAfterSuccessfulSync(context.database, sourceId, [], 3)).toBe(
      0
    )
    expect(await recordMissingAfterSuccessfulSync(context.database, sourceId, [], 3)).toBe(
      1
    )
    const [opportunity] = await context.database
      .select()
      .from(opportunities)
      .where(eq(opportunities.sourceId, sourceId))
    expect(opportunity?.isActive).toBe(false)
  })
})
