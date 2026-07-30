import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../../../server/db/client.js'
import { requireAdmin } from '../../../server/auth/require-admin.js'
import { createAdapterRegistry } from '../../../server/ingestion/create-adapter-registry.js'
import type { OpportunitySource } from '../../../server/ingestion/contracts.js'
import { parseJsonBody } from '../../../server/http/json-body.js'
import { createSourceSchema } from '../../../server/sources/source-input.js'
import { SourceRepository } from '../../../server/sources/source-repository.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const database = getDatabase()
  try {
    await requireAdmin(database, request.headers.authorization)
  } catch {
    return response.status(403).json({ error: 'Administrator access is required' })
  }
  const repository = new SourceRepository(database)

  if (request.method === 'GET') {
    return response.status(200).json({ sources: await repository.list() })
  }
  if (request.method === 'POST') {
    const parsed = createSourceSchema.safeParse(parseJsonBody(request))
    if (!parsed.success) {
      return response.status(400).json({ error: 'Invalid source', issues: parsed.error.issues })
    }
    if (!['GREENHOUSE', 'LEVER', 'ASHBY'].includes(parsed.data.sourceType)) {
      return response.status(400).json({ error: 'This source type is not yet supported' })
    }
    const candidate: OpportunitySource = {
      id: '00000000-0000-4000-8000-000000000000',
      ...parsed.data,
      nextSyncAt: null,
      lastSuccessfulSyncAt: null,
      lastAttemptedSyncAt: null,
      consecutiveFailures: 0,
      status: parsed.data.enabled ? 'PENDING' : 'DISABLED',
      createdAt: new Date(),
      updatedAt: new Date()
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
    const source = await repository.create(parsed.data)
    return response.status(201).json({ source, validation })
  }

  response.setHeader('Allow', 'GET, POST')
  return response.status(405).json({ error: 'Method not allowed' })
}
