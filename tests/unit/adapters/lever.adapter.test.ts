import { describe, expect, it } from 'vitest'
import fixture from '../../fixtures/lever/jobs.json' with { type: 'json' }
import { LeverAdapter } from '../../../server/ingestion/adapters/lever.adapter.js'
import { createSource, MockJsonHttpClient } from './test-helpers.js'

describe('LeverAdapter', () => {
  it('paginates and normalizes compensation and workplace data', async () => {
    const base = fixture[0]!
    const client = new MockJsonHttpClient((url) => {
      const skip = Number(url.searchParams.get('skip'))
      if (skip === 0) {
        return Array.from({ length: 100 }, (_, index) => ({
          ...base,
          id: `lever-${index}`
        }))
      }
      return [{ ...base, id: 'lever-final' }]
    })
    const adapter = new LeverAdapter(client)
    const source = createSource('LEVER', 'example')

    const raw = await adapter.fetchOpportunities(source)
    const normalized = await adapter.normalize(raw.at(-1)!, source)

    expect(raw).toHaveLength(101)
    expect(client.urls).toHaveLength(2)
    expect(normalized.remoteStatus).toBe('HYBRID')
    expect(normalized.salaryMinimum).toBe('100000')
    expect(normalized.salaryPeriod).toBe('YEAR')
    expect(normalized.datePosted).toBeNull()
  })

  it('uses the EU endpoint only when source metadata requests it', async () => {
    const client = new MockJsonHttpClient(() => [])
    const adapter = new LeverAdapter(client)
    const source = { ...createSource('LEVER', 'example'), metadata: { region: 'EU' } }

    await adapter.fetchOpportunities(source)

    expect(client.urls[0]?.hostname).toBe('api.eu.lever.co')
  })
})
