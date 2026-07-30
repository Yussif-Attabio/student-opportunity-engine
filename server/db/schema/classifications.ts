import {
  char,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import { classificationStatusEnum } from './enums.js'
import { opportunities } from './opportunities.js'

export interface ClassificationEvidence {
  field: string
  snippet: string
  explicit: boolean
}

export const opportunityClassifications = pgTable(
  'opportunity_classifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'cascade' }),
    status: classificationStatusEnum('status').notNull().default('PENDING'),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    classifierVersion: text('classifier_version').notNull(),
    promptVersion: text('prompt_version').notNull(),
    model: text('model').notNull(),
    confidence: real('confidence'),
    evidence: jsonb('evidence').$type<ClassificationEvidence[]>().notNull().default([]),
    result: jsonb('result').$type<Record<string, unknown>>(),
    rawResponse: jsonb('raw_response').$type<Record<string, unknown>>(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('opportunity_classifications_version_hash_uidx').on(
      table.opportunityId,
      table.classifierVersion,
      table.contentHash
    ),
    index('opportunity_classifications_status_created_idx').on(table.status, table.createdAt),
    index('opportunity_classifications_opportunity_idx').on(table.opportunityId)
  ]
)
