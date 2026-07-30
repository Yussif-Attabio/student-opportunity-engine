import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../../../server/db/client.js'
import { createAdapterRegistry } from '../../../server/ingestion/create-adapter-registry.js'
import {
  SourceFetchError,
  SourceSyncAlreadyRunningError
} from '../../../server/ingestion/errors.js'
import { syncSource } from '../../../server/ingestion/sync-source.js'
import { readRawBody } from '../../../server/http/raw-body.js'
import { IngestionQueueClient } from '../../../server/queue/client.js'
import { syncSourceMessageSchema } from '../../../server/queue/messages.js'
import { verifyQStashSignature } from '../../../server/queue/signature.js'

export const config = { api: { bodyParser: false } }

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const body = await readRawBody(request)
  const appUrl = process.env.APP_URL?.replace(/\/+$/, '')
  if (!appUrl) return response.status(500).json({ error: 'APP_URL is not configured' })

  try {
    await verifyQStashSignature({
      signature: request.headers['upstash-signature'] as string | undefined,
      body,
      url: `${appUrl}/api/internal/jobs/sync-source`,
      upstashRegion: request.headers['upstash-region'] as string | undefined
    })
  } catch {
    return response.status(401).json({ error: 'Invalid queue signature' })
  }

  let json: unknown
  try {
    json = JSON.parse(body) as unknown
  } catch {
    return response.status(400).json({ error: 'Invalid JSON message body' })
  }
  const parsed = syncSourceMessageSchema.safeParse(json)
  if (!parsed.success) {
    return response.status(400).json({ error: 'Invalid source synchronization message' })
  }

  try {
    const result = await syncSource(
      getDatabase(),
      createAdapterRegistry(),
      parsed.data.sourceId,
      new IngestionQueueClient()
    )
    return response.status(200).json(result)
  } catch (error) {
    if (error instanceof SourceSyncAlreadyRunningError) {
      return response.status(202).json({ status: 'already_running' })
    }
    if (error instanceof SourceFetchError && error.retryable) {
      if (error.retryAfterSeconds) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds))
      }
      return response.status(503).json({ error: 'Provider temporarily unavailable' })
    }
    return response.status(500).json({ error: 'Source synchronization failed' })
  }
}
