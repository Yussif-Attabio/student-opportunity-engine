import { afterEach, describe, expect, it } from 'vitest'
import fixture from '../../fixtures/adzuna/jobs.json' with { type: 'json' }
import { AdzunaAdapter } from '../../../server/ingestion/adapters/adzuna.adapter.js'
import { createSource, MockJsonHttpClient } from './test-helpers.js'

describe('AdzunaAdapter', () => {
  afterEach(() => {
    delete process.env.ADZUNA_APP_ID
    delete process.env.ADZUNA_APP_KEY
  })

  it('fetches broad listings and preserves Adzuna attribution links', async () => {
    process.env.ADZUNA_APP_ID = 'test-id'
    process.env.ADZUNA_APP_KEY = 'test-key'
    const client = new MockJsonHttpClient(() => fixture)
    const adapter = new AdzunaAdapter(client)
    const source = {
      ...createSource('ADZUNA', 'us'),
      metadata: { currency: 'USD', maxPages: 1 }
    }

    const raw = await adapter.fetchOpportunities(source)
    const normalized = await adapter.normalize(raw[0]!, source)

    expect(raw).toHaveLength(1)
    expect(client.urls[0]?.searchParams.get('app_id')).toBe('test-id')
    expect(normalized.organizationName).toBe('Example Technology')
    expect(normalized.opportunityType).toBe('INTERNSHIP')
    expect(normalized.employmentType).toBe('INTERN')
    expect(normalized.salaryMinimum).toBe('50000')
    expect(normalized.salaryPeriod).toBe('YEAR')
    expect(normalized.applicationUrl).toBe(
      'https://www.adzuna.com/details/adzuna-123'
    )
  })

  it('requires credentials', async () => {
    const adapter = new AdzunaAdapter(new MockJsonHttpClient(() => fixture))
    const source = createSource('ADZUNA', 'us')

    await expect(adapter.fetchOpportunities(source)).rejects.toThrow(
      'ADZUNA_APP_ID and ADZUNA_APP_KEY are required'
    )
  })
})
