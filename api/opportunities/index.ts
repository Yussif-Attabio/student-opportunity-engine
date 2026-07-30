import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../../server/db/client.js'
import { opportunityFiltersSchema } from '../../server/opportunities/filters.js'
import {
  InvalidOpportunityCursorError,
  queryOpportunities
} from '../../server/opportunities/query.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const parsed = opportunityFiltersSchema.safeParse(request.query)
  if (!parsed.success) {
    return response.status(400).json({ error: 'Invalid filters', issues: parsed.error.issues })
  }
  try {
    const result = await queryOpportunities(getDatabase(), parsed.data)
    response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return response.status(200).json(result)
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      error instanceof RangeError ||
      error instanceof InvalidOpportunityCursorError
    ) {
      return response.status(400).json({ error: 'Invalid pagination cursor' })
    }
    throw error
  }
}
