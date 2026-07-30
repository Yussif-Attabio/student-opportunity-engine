import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { getDatabase } from '../db/client.js'
import { opportunities } from '../db/schema/opportunities.js'
import { requireAdmin } from '../auth/require-admin.js'
import { getUuidRouteParameter } from '../http/route-params.js'
import { IngestionQueueClient } from '../queue/client.js'

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
  const opportunityId = getUuidRouteParameter(request, 'id')
  const [opportunity] = await database
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1)
  if (!opportunity) return response.status(404).json({ error: 'Opportunity not found' })
  await database
    .update(opportunities)
    .set({ classificationStatus: 'PENDING', updatedAt: new Date() })
    .where(eq(opportunities.id, opportunityId))
  await new IngestionQueueClient().enqueue(opportunityId, true)
  return response.status(202).json({ queued: true })
}
