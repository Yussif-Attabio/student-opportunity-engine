import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core'
import { failureKindEnum, failureStatusEnum } from './enums.js'
import { opportunities } from './opportunities.js'
import { opportunitySources } from './opportunity-sources.js'
import { opportunitySyncRuns } from './sync-runs.js'

export const ingestionFailures = pgTable(
  'ingestion_failures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: failureKindEnum('kind').notNull(),
    status: failureStatusEnum('status').notNull().default('OPEN'),
    sourceId: uuid('source_id').references(() => opportunitySources.id, {
      onDelete: 'cascade'
    }),
    syncRunId: uuid('sync_run_id').references(() => opportunitySyncRuns.id, {
      onDelete: 'cascade'
    }),
    opportunityId: uuid('opportunity_id').references(() => opportunities.id, {
      onDelete: 'cascade'
    }),
    queueMessageId: text('queue_message_id'),
    errorCode: text('error_code'),
    errorMessage: text('error_message').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    attemptCount: integer('attempt_count').notNull().default(1),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('ingestion_failures_status_retry_idx').on(table.status, table.nextRetryAt),
    index('ingestion_failures_source_created_idx').on(table.sourceId, table.createdAt),
    index('ingestion_failures_sync_run_idx').on(table.syncRunId),
    index('ingestion_failures_opportunity_idx').on(table.opportunityId)
  ]
)
