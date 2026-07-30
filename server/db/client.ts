import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

type Database = PostgresJsDatabase<typeof schema>

let database: Database | null = null
let queryClient: ReturnType<typeof postgres> | null = null

export const getDatabase = (): Database => {
  if (database) return database

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  queryClient = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  })
  database = drizzle(queryClient, { schema })
  return database
}

export const closeDatabase = async () => {
  if (queryClient) await queryClient.end({ timeout: 5 })
  queryClient = null
  database = null
}
