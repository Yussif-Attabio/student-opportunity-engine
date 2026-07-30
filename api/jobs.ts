import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getJobsFeed } from '../server/jobs.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const feed = await getJobsFeed(req.query.refresh === '1')
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    return res.status(200).json(feed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load jobs'
    return res.status(502).json({ error: message })
  }
}
