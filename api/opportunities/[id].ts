import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, eq } from 'drizzle-orm'
import { getDatabase } from '../../server/db/client.js'
import { opportunities } from '../../server/db/schema/opportunities.js'
import { getUuidRouteParameter } from '../../server/http/route-params.js'
import { publicOpportunitySelection } from '../../server/opportunities/query.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const database = getDatabase()
  const id = getUuidRouteParameter(request, 'id')
  const [opportunity] = await database
    .select(publicOpportunitySelection)
    .from(opportunities)
    .where(and(eq(opportunities.id, id), eq(opportunities.isActive, true)))
    .limit(1)
  if (!opportunity) return response.status(404).json({ error: 'Opportunity not found' })
  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return response.status(200).json({ opportunity })
}
