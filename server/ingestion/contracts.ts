import type { opportunitySources } from '../db/schema/opportunity-sources.js'

export type OpportunitySource = typeof opportunitySources.$inferSelect

export interface ValidationResult {
  valid: boolean
  errors: string[]
  metadata?: Record<string, unknown>
}

export interface RawOpportunity {
  externalId: string
  data: Record<string, unknown>
}

export type NormalizedOpportunityType =
  | 'INTERNSHIP'
  | 'NEW_GRAD_JOB'
  | 'CO_OP'
  | 'FELLOWSHIP'
  | 'SCHOLARSHIP'
  | 'RESEARCH'
  | 'APPRENTICESHIP'
  | 'CAMPUS_PROGRAM'
  | 'ROTATIONAL_PROGRAM'
  | 'JOB'
  | 'UNKNOWN'

export type NormalizedEmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY'
  | 'INTERN'
  | 'VOLUNTEER'
  | 'UNKNOWN'

export type NormalizedRemoteStatus =
  | 'REMOTE'
  | 'HYBRID'
  | 'ONSITE'
  | 'FLEXIBLE'
  | 'UNKNOWN'

export interface NormalizedOpportunity {
  externalId: string
  sourceId: string
  sourceType: OpportunitySource['sourceType']
  organizationName: string
  organizationSlug: string
  organizationLogoUrl: string | null
  title: string
  descriptionText: string | null
  descriptionHtml: string | null
  opportunityType: NormalizedOpportunityType
  employmentType: NormalizedEmploymentType
  departments: string[]
  locations: string[]
  city: string | null
  state: string | null
  country: string | null
  remoteStatus: NormalizedRemoteStatus
  salaryMinimum: string | null
  salaryMaximum: string | null
  salaryCurrency: string | null
  salaryPeriod: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ONE_TIME' | 'UNKNOWN' | null
  applicationUrl: string
  sourceUrl: string
  datePosted: Date | null
  applicationDeadline: Date | null
  rawSourceData: Record<string, unknown>
}

export interface OpportunitySourceAdapter {
  readonly sourceType: OpportunitySource['sourceType']
  validateSource(source: OpportunitySource): Promise<ValidationResult>
  fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]>
  normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity>
}
