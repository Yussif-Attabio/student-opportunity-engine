import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import {
  careerFieldEnum,
  classificationStatusEnum,
  educationLevelEnum,
  employmentTypeEnum,
  experienceLevelEnum,
  opportunityTypeEnum,
  remoteStatusEnum,
  salaryPeriodEnum,
  sourceTypeEnum,
  sponsorshipStatusEnum
} from './enums.js'
import { opportunitySources } from './opportunity-sources.js'

export const opportunities = pgTable(
  'opportunities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalId: text('external_id').notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => opportunitySources.id, { onDelete: 'restrict' }),
    sourceType: sourceTypeEnum('source_type').notNull(),
    organizationName: text('organization_name').notNull(),
    organizationSlug: text('organization_slug').notNull(),
    organizationLogoUrl: text('organization_logo_url'),
    title: text('title').notNull(),
    descriptionText: text('description_text'),
    descriptionHtml: text('description_html'),
    studentFacingSummary: text('student_facing_summary'),
    opportunityType: opportunityTypeEnum('opportunity_type').notNull().default('UNKNOWN'),
    employmentType: employmentTypeEnum('employment_type').notNull().default('UNKNOWN'),
    experienceLevel: experienceLevelEnum('experience_level').notNull().default('UNKNOWN'),
    careerField: careerFieldEnum('career_field').notNull().default('UNKNOWN'),
    departments: text('departments').array().notNull().default(sql`ARRAY[]::text[]`),
    teams: text('teams').array().notNull().default(sql`ARRAY[]::text[]`),
    locations: text('locations').array().notNull().default(sql`ARRAY[]::text[]`),
    city: text('city'),
    state: text('state'),
    country: text('country'),
    remoteStatus: remoteStatusEnum('remote_status').notNull().default('UNKNOWN'),
    salaryMinimum: numeric('salary_minimum', { precision: 14, scale: 2 }),
    salaryMaximum: numeric('salary_maximum', { precision: 14, scale: 2 }),
    salaryCurrency: char('salary_currency', { length: 3 }),
    salaryPeriod: salaryPeriodEnum('salary_period'),
    applicationUrl: text('application_url').notNull(),
    canonicalApplicationUrl: text('canonical_application_url').notNull(),
    sourceUrl: text('source_url').notNull(),
    datePosted: timestamp('date_posted', { withTimezone: true }),
    applicationDeadline: timestamp('application_deadline', { withTimezone: true }),
    studentEligible: boolean('student_eligible'),
    studentEligibilityConfidence: real('student_eligibility_confidence'),
    educationLevels: educationLevelEnum('education_levels')
      .array()
      .notNull()
      .default(sql`ARRAY[]::education_level[]`),
    eligibleGraduationYears: integer('eligible_graduation_years')
      .array()
      .notNull()
      .default(sql`ARRAY[]::integer[]`),
    majors: text('majors').array().notNull().default(sql`ARRAY[]::text[]`),
    requiredSkills: text('required_skills').array().notNull().default(sql`ARRAY[]::text[]`),
    preferredSkills: text('preferred_skills').array().notNull().default(sql`ARRAY[]::text[]`),
    sponsorshipStatus: sponsorshipStatusEnum('sponsorship_status')
      .notNull()
      .default('UNKNOWN'),
    classificationStatus: classificationStatusEnum('classification_status')
      .notNull()
      .default('PENDING'),
    classifierVersion: text('classifier_version'),
    classifiedAt: timestamp('classified_at', { withTimezone: true }),
    contentHash: char('content_hash', { length: 64 }).notNull(),
    fingerprint: char('fingerprint', { length: 64 }).notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    missedSuccessfulSyncs: integer('missed_successful_syncs').notNull().default(0),
    rawSourceData: jsonb('raw_source_data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('opportunities_source_external_uidx').on(table.sourceId, table.externalId),
    uniqueIndex('opportunities_canonical_url_uidx').on(table.canonicalApplicationUrl),
    index('opportunities_fingerprint_idx').on(table.fingerprint),
    index('opportunities_content_hash_idx').on(table.contentHash),
    index('opportunities_active_student_date_idx').on(
      table.isActive,
      table.studentEligible,
      table.datePosted
    ),
    index('opportunities_type_active_idx').on(table.opportunityType, table.isActive),
    index('opportunities_field_active_idx').on(table.careerField, table.isActive),
    index('opportunities_country_active_idx').on(table.country, table.isActive),
    index('opportunities_remote_active_idx').on(table.remoteStatus, table.isActive),
    index('opportunities_source_active_idx').on(table.sourceId, table.isActive),
    index('opportunities_locations_gin_idx').using('gin', table.locations),
    index('opportunities_majors_gin_idx').using('gin', table.majors),
    index('opportunities_required_skills_gin_idx').using('gin', table.requiredSkills),
    index('opportunities_search_idx').using(
      'gin',
      sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.organizationName}, '') || ' ' || coalesce(${table.descriptionText}, ''))`
    )
  ]
)
