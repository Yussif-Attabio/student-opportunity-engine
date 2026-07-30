import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDatabase } from '../../../server/db/client.js'
import { ingestionFailures } from '../../../server/db/schema/failures.js'
import { readRawBody } from '../../../server/http/raw-body.js'
import { verifyQStashSignature } from '../../../server/queue/signature.js'

const failurePayloadSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional()
  })
  .passthrough()

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
      url: `${appUrl}/api/internal/jobs/failure-callback`,
      upstashRegion: request.headers['upstash-region'] as string | undefined
    })
  } catch {
    return response.status(401).json({ error: 'Invalid queue signature' })
  }

  let payload: z.infer<typeof failurePayloadSchema>
  try {
    payload = failurePayloadSchema.parse(JSON.parse(body))
  } catch {
    payload = { message: 'QStash delivery failed with an unreadable callback payload' }
  }
  await getDatabase()
    .insert(ingestionFailures)
    .values({
      kind: 'QUEUE_DELIVERY',
      status: 'ABANDONED',
      queueMessageId: request.headers['upstash-message-id'] as string | undefined,
      errorCode: payload.error ?? 'QStashDeliveryFailed',
      errorMessage: (payload.message ?? 'QStash exhausted delivery retries').slice(0, 2_000),
      details: {
        destination: request.headers['upstash-forward-upstash-destination'] ?? null
      }
    })
  return response.status(200).json({ recorded: true })
}
