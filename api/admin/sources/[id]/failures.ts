import type { VercelRequest, VercelResponse } from '@vercel/node'
import { desc, eq } from 'drizzle-orm'
import { getDatabase } from '../../../../server/db/client.js'
import { ingestionFailures } from '../../../../server/db/schema/failures.js'
import { requireAdmin } from '../../../../server/auth/require-admin.js'
import { getUuidRouteParameter } from '../../../../server/http/route-params.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const database = getDatabase()
  try {
    await requireAdmin(database, request.headers.authorization)
  } catch {
    return response.status(403).json({ error: 'Administrator access is required' })
  }
  const sourceId = getUuidRouteParameter(request, 'id')
  const failures = await database
    .select()
    .from(ingestionFailures)
    .where(eq(ingestionFailures.sourceId, sourceId))
    .orderBy(desc(ingestionFailures.createdAt))
    .limit(100)
  return response.status(200).json({ failures })
}
