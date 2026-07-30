import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../server/db/schema/index.js'

export const createTestDatabase = async () => {
  const connectionString = process.env.DATABASE_TEST_URL
  if (!connectionString) throw new Error('DATABASE_TEST_URL is required')
  const client = postgres(connectionString, { max: 1, prepare: false })
  const database = drizzle(client, { schema })
  await migrate(database, { migrationsFolder: 'drizzle' })
  return { database, close: () => client.end({ timeout: 5 }) }
}

export const clearIngestionTables = async (
  database: Awaited<ReturnType<typeof createTestDatabase>>['database']
) => {
  await database.delete(schema.ingestionFailures)
  await database.delete(schema.opportunityClassifications)
  await database.delete(schema.opportunitySyncRuns)
  await database.delete(schema.opportunities)
  await database.delete(schema.opportunitySources)
}
