import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../db/client.js'
import { requireAdmin } from '../auth/require-admin.js'
import { parseJsonBody } from '../http/json-body.js'
import { createAdapterRegistry } from '../ingestion/create-adapter-registry.js'
import { getUuidRouteParameter } from '../http/route-params.js'
import {
  isImplementedSourceType,
  updateSourceSchema
} from '../sources/source-input.js'
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
  if (
    parsed.data.sourceType &&
    !isImplementedSourceType(parsed.data.sourceType)
  ) {
    return response.status(400).json({ error: 'This source type is not yet supported' })
  }
  const repository = new SourceRepository(database)
  const sourceId = getUuidRouteParameter(request, 'id')
  const existing = await repository.getById(sourceId)
  if (!existing) return response.status(404).json({ error: 'Source not found' })
  const configurationChanged = [
    'organizationName',
    'sourceType',
    'sourceIdentifier',
    'careersUrl',
    'metadata'
  ].some((key) => key in parsed.data)
  const candidate = { ...existing, ...parsed.data }
  if (
    candidate.enabled &&
    (configurationChanged || parsed.data.enabled === true)
  ) {
    if (!isImplementedSourceType(candidate.sourceType)) {
      return response.status(400).json({ error: 'This source type is not yet supported' })
    }
    const validation = await createAdapterRegistry()
      .get(candidate.sourceType)
      .validateSource(candidate)
    if (!validation.valid) {
      return response.status(422).json({
        error: 'The source could not be validated',
        validation
      })
    }
  }
  const source = await repository.update(sourceId, parsed.data)
  if (!source) return response.status(404).json({ error: 'Source not found' })
  return response.status(200).json({ source })
}
