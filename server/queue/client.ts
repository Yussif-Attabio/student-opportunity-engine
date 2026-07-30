import { Client } from '@upstash/qstash'
import type { ClassificationDispatcher } from '../ingestion/sync-source.js'

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const getAppUrl = () => {
  const appUrl = process.env.APP_URL
  if (!appUrl) throw new Error('APP_URL is not configured')
  const url = new URL(appUrl)
  if (url.protocol !== 'https:') throw new Error('APP_URL must use HTTPS')
  return url.toString().replace(/\/+$/, '')
}

export class IngestionQueueClient implements ClassificationDispatcher {
  private readonly client: Client
  private readonly appUrl: string

  constructor() {
    const token = process.env.QSTASH_TOKEN
    if (!token) throw new Error('QSTASH_TOKEN is not configured')
    this.client = new Client({ token })
    this.appUrl = getAppUrl()
  }

  async enqueueSource(
    sourceId: string,
    options: { deduplicate?: boolean } = {}
  ) {
    const deduplicate = options.deduplicate ?? true
    return this.client.publishJSON({
      url: `${this.appUrl}/api/internal/jobs/sync-source`,
      body: { sourceId },
      retries: 5,
      failureCallback: `${this.appUrl}/api/internal/jobs/failure-callback`,
      deduplicationId: deduplicate
        ? `source-${sourceId}-${Math.floor(Date.now() / 900_000)}`
        : undefined,
      flowControl: {
        key: 'source-sync',
        parallelism: positiveInteger(process.env.SYNC_PROVIDER_CONCURRENCY, 3)
      }
    })
  }

  async enqueue(opportunityId: string, force = false): Promise<void> {
    await this.client.publishJSON({
      url: `${this.appUrl}/api/internal/jobs/classify-opportunity`,
      body: { opportunityId, force },
      retries: 5,
      failureCallback: `${this.appUrl}/api/internal/jobs/failure-callback`,
      flowControl: {
        key: 'opportunity-classification',
        parallelism: positiveInteger(process.env.CLASSIFICATION_CONCURRENCY, 2)
      }
    })
  }
}
