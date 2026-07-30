import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../db/client.js'
import { requireAdmin } from '../auth/require-admin.js'
import { createAdapterRegistry } from '../ingestion/create-adapter-registry.js'
import { getUuidRouteParameter } from '../http/route-params.js'
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
  const source = await new SourceRepository(database).getById(
    getUuidRouteParameter(request, 'id')
  )
  if (!source) return response.status(404).json({ error: 'Source not found' })
  const adapter = createAdapterRegistry().get(source.sourceType)
  const validation = await adapter.validateSource(source)
  if (!validation.valid) return response.status(422).json({ validation })
  const opportunities = await adapter.fetchOpportunities(source)
  return response.status(200).json({
    validation,
    fetchedCount: opportunities.length,
    sampleExternalIds: opportunities.slice(0, 5).map(({ externalId }) => externalId)
  })
}
