import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { NormalizedOpportunity } from '../../server/ingestion/contracts.js'
import { upsertOpportunity } from '../../server/ingestion/upsert-opportunity.js'
import { clearIngestionTables, createTestDatabase } from './test-database.js'

const suite = describe.skipIf(!process.env.DATABASE_TEST_URL)

suite('opportunity upsert integration', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>>
  let sourceId: string

  beforeAll(async () => {
    context = await createTestDatabase()
  })
  beforeEach(async () => {
    await clearIngestionTables(context.database)
    const [source] = await context.database
      .insert((await import('../../server/db/schema/opportunity-sources.js')).opportunitySources)
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

  const normalized = (): NormalizedOpportunity => ({
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
    teams: ['University Recruiting'],
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

  it('is idempotent and updates materially changed postings', async () => {
    expect((await upsertOpportunity(context.database, normalized())).outcome).toBe(
      'created'
    )
    expect((await upsertOpportunity(context.database, normalized())).outcome).toBe(
      'unchanged'
    )
    expect(
      (
        await upsertOpportunity(context.database, {
          ...normalized(),
          descriptionText: 'An updated internship building reliable software.'
        })
      ).outcome
    ).toBe('updated')
  })
})
