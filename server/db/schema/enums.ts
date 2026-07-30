import { pgEnum } from 'drizzle-orm/pg-core'

export const sourceTypeEnum = pgEnum('source_type', [
  'GREENHOUSE',
  'LEVER',
  'ASHBY',
  'ADZUNA',
  'STRUCTURED_DATA',
  'CUSTOM_SCRAPER',
  'CUSTOM_API',
  'RSS',
  'MANUAL'
])

export const sourceStatusEnum = pgEnum('source_status', [
  'PENDING',
  'HEALTHY',
  'DEGRADED',
  'FAILING',
  'DISABLED'
])

export const syncRunStatusEnum = pgEnum('sync_run_status', [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'PARTIAL'
])

export const opportunityTypeEnum = pgEnum('opportunity_type', [
  'INTERNSHIP',
  'NEW_GRAD_JOB',
  'CO_OP',
  'FELLOWSHIP',
  'SCHOLARSHIP',
  'RESEARCH',
  'APPRENTICESHIP',
  'CAMPUS_PROGRAM',
  'ROTATIONAL_PROGRAM',
  'JOB',
  'UNKNOWN'
])

export const employmentTypeEnum = pgEnum('employment_type', [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'TEMPORARY',
  'INTERN',
  'VOLUNTEER',
  'UNKNOWN'
])

export const experienceLevelEnum = pgEnum('experience_level', [
  'STUDENT',
  'ENTRY_LEVEL',
  'NEW_GRAD',
  'MID_LEVEL',
  'SENIOR',
  'LEAD',
  'MANAGER',
  'EXECUTIVE',
  'UNKNOWN'
])

export const remoteStatusEnum = pgEnum('remote_status', [
  'REMOTE',
  'HYBRID',
  'ONSITE',
  'FLEXIBLE',
  'UNKNOWN'
])

export const careerFieldEnum = pgEnum('career_field', [
  'TECHNOLOGY',
  'ENGINEERING',
  'BUSINESS',
  'FINANCE_ACCOUNTING',
  'HEALTHCARE',
  'MARKETING_COMMUNICATIONS',
  'DESIGN_CREATIVE',
  'EDUCATION',
  'SCIENCE_RESEARCH',
  'LAW_GOVERNMENT_POLICY',
  'OPERATIONS_LOGISTICS',
  'HOSPITALITY',
  'SKILLED_TRADES',
  'OTHER',
  'UNKNOWN'
])

export const salaryPeriodEnum = pgEnum('salary_period', [
  'HOUR',
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR',
  'ONE_TIME',
  'UNKNOWN'
])

export const classificationStatusEnum = pgEnum('classification_status', [
  'PENDING',
  'IN_PROGRESS',
  'SUCCEEDED',
  'FAILED',
  'SKIPPED'
])

export const sponsorshipStatusEnum = pgEnum('sponsorship_status', [
  'AVAILABLE',
  'NOT_AVAILABLE',
  'RESTRICTED',
  'NOT_STATED',
  'UNKNOWN'
])

export const educationLevelEnum = pgEnum('education_level', [
  'HIGH_SCHOOL',
  'ASSOCIATE',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
  'OTHER',
  'UNKNOWN'
])

export const failureKindEnum = pgEnum('failure_kind', [
  'SOURCE_VALIDATION',
  'SOURCE_FETCH',
  'NORMALIZATION',
  'UPSERT',
  'CLASSIFICATION',
  'QUEUE_DELIVERY'
])

export const failureStatusEnum = pgEnum('failure_status', [
  'OPEN',
  'RETRYING',
  'RESOLVED',
  'ABANDONED'
])
