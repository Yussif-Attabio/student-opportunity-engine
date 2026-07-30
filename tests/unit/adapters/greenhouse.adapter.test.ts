import { describe, expect, it } from 'vitest'
import fixture from '../../fixtures/greenhouse/jobs.json' with { type: 'json' }
import { GreenhouseAdapter } from '../../../server/ingestion/adapters/greenhouse.adapter.js'
import { createSource, MockJsonHttpClient } from './test-helpers.js'

describe('GreenhouseAdapter', () => {
  it('fetches and normalizes public jobs without executable HTML', async () => {
    const client = new MockJsonHttpClient(() => fixture)
    const adapter = new GreenhouseAdapter(client)
    const source = createSource('GREENHOUSE', 'example')

    const raw = await adapter.fetchOpportunities(source)
    const normalized = await adapter.normalize(raw[0]!, source)

    expect(raw).toHaveLength(1)
    expect(normalized.externalId).toBe('123')
    expect(normalized.opportunityType).toBe('INTERNSHIP')
    expect(normalized.descriptionHtml).not.toContain('script')
    expect(normalized.datePosted).toBeNull()
    expect(client.urls[0]?.hostname).toBe('boards-api.greenhouse.io')
  })

  it('rejects unsafe board tokens before making a request', async () => {
    const client = new MockJsonHttpClient(() => fixture)
    const adapter = new GreenhouseAdapter(client)
    const source = createSource('GREENHOUSE', '../internal')

    const result = await adapter.validateSource(source)

    expect(result.valid).toBe(false)
    expect(client.urls).toHaveLength(0)
  })
})
