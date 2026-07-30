import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../db/client.js'
import { requireAdmin } from '../auth/require-admin.js'
import { getUuidRouteParameter } from '../http/route-params.js'
import { IngestionQueueClient } from '../queue/client.js'
import { SourceRepository } from '../sources/source-repository.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const database = getDatabase()
  try {
    await requireAdmin(database, request.headers.authorization)
  } catch {
    return response.status(403).json({ error: 'Administrator access is required' })
  }
  const sourceId = getUuidRouteParameter(request, 'id')
  const source = await new SourceRepository(database).getById(sourceId)
  if (!source) return response.status(404).json({ error: 'Source not found' })
  if (!source.enabled) return response.status(409).json({ error: 'Source is disabled' })
  const queued = await new IngestionQueueClient().enqueueSource(sourceId)
  return response.status(202).json({ messageId: queued.messageId })
}
