import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase } from '../../../server/db/client.js'
import { IngestionQueueClient } from '../../../server/queue/client.js'
import { SourceRepository } from '../../../server/sources/source-repository.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.authorization !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized' })
  }

  const repository = new SourceRepository(getDatabase())
  const dueSources = await repository.listDue(new Date(), 100)
  const queue = new IngestionQueueClient()
  const messages = await Promise.all(
    dueSources.map(async (source) => {
      const result = await queue.enqueueSource(source.id)
      return { sourceId: source.id, messageId: result.messageId }
    })
  )
  return response.status(200).json({ dispatched: messages.length, messages })
}
