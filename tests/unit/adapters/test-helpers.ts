import type { OpportunitySource } from '../../../server/ingestion/contracts.js'
import type { JsonHttpClient } from '../../../server/ingestion/http-client.js'

export class MockJsonHttpClient implements JsonHttpClient {
  readonly urls: URL[] = []

  constructor(private readonly responder: (url: URL) => unknown) {}

  async getJson<T>(url: URL): Promise<T> {
    this.urls.push(url)
    return this.responder(url) as T
  }
}

export const createSource = (
  sourceType: OpportunitySource['sourceType'],
  sourceIdentifier: string
): OpportunitySource => ({
  id: '00000000-0000-4000-8000-000000000001',
  organizationName: 'Example Company',
  sourceType,
  sourceIdentifier,
  careersUrl: 'https://example.com/careers',
  enabled: true,
  syncFrequencyMinutes: 360,
  nextSyncAt: null,
  lastSuccessfulSyncAt: null,
  lastAttemptedSyncAt: null,
  consecutiveFailures: 0,
  status: 'PENDING',
  metadata: {},
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z')
})
