import type { VercelRequest, VercelResponse } from '@vercel/node'
import { classifyOpportunity } from '../../../server/classification/classify-opportunity.js'
import { getDatabase } from '../../../server/db/client.js'
import { readRawBody } from '../../../server/http/raw-body.js'
import { classifyOpportunityMessageSchema } from '../../../server/queue/messages.js'
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
      url: `${appUrl}/api/internal/jobs/classify-opportunity`,
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
  const parsed = classifyOpportunityMessageSchema.safeParse(json)
  if (!parsed.success) {
    return response.status(400).json({ error: 'Invalid classification message' })
  }

  const result = await classifyOpportunity(
    getDatabase(),
    parsed.data.opportunityId,
    undefined,
    parsed.data.force
  )
  return response.status(200).json({ status: result })
}
