import { closeDatabase, getDatabase } from '../server/db/client.js'
import { IngestionQueueClient } from '../server/queue/client.js'
import { SourceRepository } from '../server/sources/source-repository.js'

const run = async () => {
  const sources = await new SourceRepository(getDatabase()).listDue(new Date(), 100)
  const queue = new IngestionQueueClient()
  const results = await Promise.all(
    sources.map(async (source) => {
      const message = await queue.enqueueSource(source.id)
      return { sourceId: source.id, messageId: message.messageId }
    })
  )
  console.log(`Dispatched ${results.length} due opportunity sources.`)
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Source dispatch failed')
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })
