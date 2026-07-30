import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../db/client.js'
import { requireAdmin } from '../auth/require-admin.js'
import { parseJsonBody } from '../http/json-body.js'
import { getUuidRouteParameter } from '../http/route-params.js'
import { updateSourceSchema } from '../sources/source-input.js'
import { SourceRepository } from '../sources/source-repository.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'PATCH') {
    response.setHeader('Allow', 'PATCH')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const database = getDatabase()
  try {
    await requireAdmin(database, request.headers.authorization)
  } catch {
    return response.status(403).json({ error: 'Administrator access is required' })
  }
  const parsed = updateSourceSchema.safeParse(parseJsonBody(request))
  if (!parsed.success) {
    return response.status(400).json({ error: 'Invalid source update', issues: parsed.error.issues })
  }
  const source = await new SourceRepository(database).update(
    getUuidRouteParameter(request, 'id'),
    parsed.data
  )
  if (!source) return response.status(404).json({ error: 'Source not found' })
  return response.status(200).json({ source })
}
