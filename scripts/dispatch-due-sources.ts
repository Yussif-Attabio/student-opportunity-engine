import { closeDatabase, getDatabase } from '../server/db/client.js'
import { IngestionQueueClient } from '../server/queue/client.js'
import { SourceRepository } from '../server/sources/source-repository.js'

const run = async () => {
  const repository = new SourceRepository(getDatabase())
  const sources = process.argv.includes('--all')
    ? (await repository.list()).filter((source) => source.enabled)
    : await repository.listDue(new Date(), 100)
  const queue = new IngestionQueueClient()
  const results = await Promise.all(
    sources.map(async (source) => {
      const message = await queue.enqueueSource(source.id, { deduplicate: false })
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
