import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  or,
  sql,
  type SQL
} from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import { opportunities } from '../db/schema/opportunities.js'
import type { OpportunityFilters } from './filters.js'

type Database = ReturnType<typeof getDatabase>

export class InvalidOpportunityCursorError extends Error {
  constructor() {
    super('Invalid opportunity cursor')
    this.name = 'InvalidOpportunityCursorError'
  }
}

const sortTimestamp = sql<Date | string>`coalesce(${opportunities.datePosted}, ${opportunities.firstSeenAt})`

const decodeCursor = (cursor: string | undefined) => {
  if (!cursor) return null
  const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
    timestamp?: unknown
    id?: unknown
  }
  if (typeof parsed.timestamp !== 'string' || typeof parsed.id !== 'string') {
    throw new InvalidOpportunityCursorError()
  }
  const timestamp = new Date(parsed.timestamp)
  if (Number.isNaN(timestamp.getTime())) throw new InvalidOpportunityCursorError()
  return { timestamp: timestamp.toISOString(), id: parsed.id }
}

const encodeCursor = (timestampValue: Date | string, id: string) => {
  const timestamp =
    timestampValue instanceof Date ? timestampValue : new Date(timestampValue)
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('Opportunity sort timestamp is invalid')
  }
  return Buffer.from(
    JSON.stringify({ timestamp: timestamp.toISOString(), id })
  ).toString('base64url')
}

export const publicOpportunitySelection = {
  id: opportunities.id,
  organizationName: opportunities.organizationName,
  organizationSlug: opportunities.organizationSlug,
  organizationLogoUrl: opportunities.organizationLogoUrl,
  title: opportunities.title,
  descriptionText: opportunities.descriptionText,
  descriptionHtml: opportunities.descriptionHtml,
  studentFacingSummary: opportunities.studentFacingSummary,
  opportunityType: opportunities.opportunityType,
  employmentType: opportunities.employmentType,
  experienceLevel: opportunities.experienceLevel,
  careerField: opportunities.careerField,
  departments: opportunities.departments,
  teams: opportunities.teams,
  locations: opportunities.locations,
  city: opportunities.city,
  state: opportunities.state,
  country: opportunities.country,
  remoteStatus: opportunities.remoteStatus,
  salaryMinimum: opportunities.salaryMinimum,
  salaryMaximum: opportunities.salaryMaximum,
  salaryCurrency: opportunities.salaryCurrency,
  salaryPeriod: opportunities.salaryPeriod,
  applicationUrl: opportunities.applicationUrl,
  sourceUrl: opportunities.sourceUrl,
  sourceType: opportunities.sourceType,
  datePosted: opportunities.datePosted,
  applicationDeadline: opportunities.applicationDeadline,
  studentEligible: opportunities.studentEligible,
  studentEligibilityConfidence: opportunities.studentEligibilityConfidence,
  educationLevels: opportunities.educationLevels,
  eligibleGraduationYears: opportunities.eligibleGraduationYears,
  majors: opportunities.majors,
  requiredSkills: opportunities.requiredSkills,
  preferredSkills: opportunities.preferredSkills,
  sponsorshipStatus: opportunities.sponsorshipStatus,
  firstSeenAt: opportunities.firstSeenAt,
  updatedAt: opportunities.updatedAt
}

export const queryOpportunities = async (
  database: Database,
  filters: OpportunityFilters
) => {
  const conditions: SQL[] = [eq(opportunities.isActive, true)]
  if (filters.keyword) {
    const search = `%${filters.keyword}%`
    conditions.push(
      or(
        ilike(opportunities.title, search),
        ilike(opportunities.organizationName, search),
        ilike(opportunities.descriptionText, search)
      )!
    )
  }
  if (filters.opportunityType) {
    conditions.push(eq(opportunities.opportunityType, filters.opportunityType))
  }
  if (filters.company) {
    conditions.push(ilike(opportunities.organizationName, `%${filters.company}%`))
  }
  if (filters.location) {
    conditions.push(
      sql`array_to_string(${opportunities.locations}, ' ') ilike ${`%${filters.location}%`}`
    )
  }
  if (filters.country) {
    conditions.push(eq(opportunities.country, filters.country))
  }
  if (filters.careerField) {
    conditions.push(eq(opportunities.careerField, filters.careerField))
  }
  if (filters.remoteStatus) {
    conditions.push(eq(opportunities.remoteStatus, filters.remoteStatus))
  }
  if (filters.major) {
    conditions.push(sql`${opportunities.majors} @> ARRAY[${filters.major}]::text[]`)
  }
  if (filters.graduationYear) {
    conditions.push(
      sql`${filters.graduationYear} = any(${opportunities.eligibleGraduationYears})`
    )
  }
  if (filters.skills.length > 0) {
    conditions.push(
      sql`(${opportunities.requiredSkills} || ${opportunities.preferredSkills}) && ${filters.skills}::text[]`
    )
  }
  if (filters.datePostedAfter) {
    conditions.push(gte(opportunities.datePosted, filters.datePostedAfter))
  }
  if (filters.studentEligible) {
    const eligible = filters.studentEligible === 'true'
    conditions.push(eq(opportunities.studentEligible, eligible))
    if (eligible) {
      conditions.push(
        or(
          eq(opportunities.classificationStatus, 'SUCCEEDED'),
          inArray(opportunities.opportunityType, [
            'INTERNSHIP',
            'NEW_GRAD_JOB',
            'CO_OP',
            'FELLOWSHIP',
            'SCHOLARSHIP',
            'RESEARCH',
            'APPRENTICESHIP',
            'CAMPUS_PROGRAM',
            'ROTATIONAL_PROGRAM'
          ])
        )!
      )
    }
  }
  if (filters.sponsorshipStatus) {
    conditions.push(eq(opportunities.sponsorshipStatus, filters.sponsorshipStatus))
  }

  const cursor = decodeCursor(filters.cursor)
  if (cursor) {
    conditions.push(
      or(
        lt(sortTimestamp, cursor.timestamp),
        and(eq(sortTimestamp, cursor.timestamp), lt(opportunities.id, cursor.id))
      )!
    )
  }

  const rows = await database
    .select({ ...publicOpportunitySelection, sortTimestamp })
    .from(opportunities)
    .where(and(...conditions))
    .orderBy(desc(sortTimestamp), desc(opportunities.id))
    .limit(filters.limit + 1)
  const hasMore = rows.length > filters.limit
  const items = hasMore ? rows.slice(0, filters.limit) : rows
  const last = items[items.length - 1]

  return {
    items: items.map(({ sortTimestamp: rowSortTimestamp, ...item }) => {
      void rowSortTimestamp
      return item
    }),
    nextCursor:
      hasMore && last ? encodeCursor(last.sortTimestamp, last.id) : null
  }
}
