import { describe, expect, it } from 'vitest'
import fixture from '../../fixtures/ashby/jobs.json' with { type: 'json' }
import { AshbyAdapter } from '../../../server/ingestion/adapters/ashby.adapter.js'
import { createSource, MockJsonHttpClient } from './test-helpers.js'

describe('AshbyAdapter', () => {
  it('excludes unlisted jobs and normalizes the documented public response', async () => {
    const client = new MockJsonHttpClient(() => fixture)
    const adapter = new AshbyAdapter(client)
    const source = createSource('ASHBY', 'example')

    const raw = await adapter.fetchOpportunities(source)
    const normalized = await adapter.normalize(raw[0]!, source)

    expect(raw).toHaveLength(1)
    expect(normalized.externalId).toBe('ashby-123')
    expect(normalized.remoteStatus).toBe('REMOTE')
    expect(normalized.employmentType).toBe('INTERN')
    expect(normalized.salaryMaximum).toBe('90000')
    expect(normalized.datePosted?.toISOString()).toBe('2026-06-01T12:00:00.000Z')
  })
})
