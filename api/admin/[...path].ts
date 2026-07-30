import type { VercelRequest, VercelResponse } from '@vercel/node'
import ingestionStats from '../../server/admin-api/ingestion-stats.js'
import reclassifyOpportunity from '../../server/admin-api/reclassify-opportunity.js'
import sourceFailures from '../../server/admin-api/source-failures.js'
import sourceSyncRuns from '../../server/admin-api/source-sync-runs.js'
import sourceSync from '../../server/admin-api/source-sync.js'
import sourceTest from '../../server/admin-api/source-test.js'
import sourceUpdate from '../../server/admin-api/source-update.js'
import sourcesIndex from '../../server/admin-api/sources-index.js'

type Handler = (request: VercelRequest, response: VercelResponse) => unknown

const route = (
  request: VercelRequest
): { handler: Handler; id?: string } | null => {
  const value = request.query.path
  const segments = (Array.isArray(value) ? value : [value])
    .filter((part): part is string => typeof part === 'string')
    .flatMap((part) => part.split('/'))
    .filter(Boolean)

  if (segments.length === 1 && segments[0] === 'sources') {
    return { handler: sourcesIndex }
  }
  if (segments.length === 2 && segments[0] === 'sources') {
    return { handler: sourceUpdate, id: segments[1] }
  }
  if (segments.length === 3 && segments[0] === 'sources') {
    const handlers: Record<string, Handler> = {
      test: sourceTest,
      sync: sourceSync,
      'sync-runs': sourceSyncRuns,
      failures: sourceFailures
    }
    const handler = handlers[segments[2]!]
    return handler ? { handler, id: segments[1] } : null
  }
  if (
    segments.length === 3 &&
    segments[0] === 'opportunities' &&
    segments[2] === 'reclassify'
  ) {
    return { handler: reclassifyOpportunity, id: segments[1] }
  }
  if (
    segments.length === 2 &&
    segments[0] === 'ingestion' &&
    segments[1] === 'stats'
  ) {
    return { handler: ingestionStats }
  }
  return null
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const matched = route(request)
  if (!matched) return response.status(404).json({ error: 'Admin route not found' })
  if (matched.id) request.query.id = matched.id
  return matched.handler(request, response)
}
