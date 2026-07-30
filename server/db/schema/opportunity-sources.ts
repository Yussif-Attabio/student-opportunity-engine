import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import { sourceStatusEnum, sourceTypeEnum } from './enums.js'

export const opportunitySources = pgTable(
  'opportunity_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationName: text('organization_name').notNull(),
    sourceType: sourceTypeEnum('source_type').notNull(),
    sourceIdentifier: text('source_identifier').notNull(),
    careersUrl: text('careers_url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    syncFrequencyMinutes: integer('sync_frequency_minutes').notNull().default(360),
    nextSyncAt: timestamp('next_sync_at', { withTimezone: true }),
    lastSuccessfulSyncAt: timestamp('last_successful_sync_at', { withTimezone: true }),
    lastAttemptedSyncAt: timestamp('last_attempted_sync_at', { withTimezone: true }),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    status: sourceStatusEnum('status').notNull().default('PENDING'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('opportunity_sources_type_identifier_uidx').on(
      table.sourceType,
      table.sourceIdentifier
    ),
    index('opportunity_sources_due_idx')
      .on(table.enabled, table.nextSyncAt)
      .where(sql`${table.enabled} = true`),
    index('opportunity_sources_status_idx').on(table.status)
  ]
)
