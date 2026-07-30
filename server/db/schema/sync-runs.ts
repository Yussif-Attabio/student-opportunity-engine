import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { syncRunStatusEnum } from './enums.js'
import { opportunitySources } from './opportunity-sources.js'

export const opportunitySyncRuns = pgTable(
  'opportunity_sync_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => opportunitySources.id, { onDelete: 'cascade' }),
    status: syncRunStatusEnum('status').notNull().default('QUEUED'),
    queueMessageId: text('queue_message_id'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    fetchedCount: integer('fetched_count').notNull().default(0),
    validCount: integer('valid_count').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    unchangedCount: integer('unchanged_count').notNull().default(0),
    deactivatedCount: integer('deactivated_count').notNull().default(0),
    duplicateCount: integer('duplicate_count').notNull().default(0),
    classificationQueuedCount: integer('classification_queued_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('opportunity_sync_runs_source_created_idx').on(table.sourceId, table.createdAt),
    index('opportunity_sync_runs_status_created_idx').on(table.status, table.createdAt),
    index('opportunity_sync_runs_queue_message_idx').on(table.queueMessageId),
    uniqueIndex('opportunity_sync_runs_one_running_per_source_uidx')
      .on(table.sourceId)
      .where(sql`${table.status} = 'RUNNING'`)
  ]
)
