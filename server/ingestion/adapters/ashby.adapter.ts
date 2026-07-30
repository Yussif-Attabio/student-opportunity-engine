import { createHash } from 'node:crypto'
import { z } from 'zod'
import type {
  NormalizedOpportunity,
  OpportunitySource,
  OpportunitySourceAdapter,
  RawOpportunity,
  ValidationResult
} from '../contracts.js'
import type { JsonHttpClient } from '../http-client.js'
import {
  htmlToText,
  inferOpportunityType,
  normalizeEmploymentType,
  normalizeRemoteStatus,
  parseDate,
  sanitizeDescriptionHtml,
  slugify,
  validateSourceIdentifier
} from '../normalization-helpers.js'

const ashbyAddressSchema = z
  .object({
    postalAddress: z
      .object({
        addressLocality: z.string().nullish(),
        addressRegion: z.string().nullish(),
        addressCountry: z.string().nullish()
      })
      .nullish()
  })
  .nullish()

const compensationComponentSchema = z
  .object({
    compensationType: z.string().nullish(),
    interval: z.string().nullish(),
    currencyCode: z.string().nullish(),
    minValue: z.number().nullish(),
    maxValue: z.number().nullish()
  })
  .passthrough()

const ashbyJobSchema = z
  .object({
    title: z.string().min(1),
    location: z.string().nullish(),
    secondaryLocations: z
      .array(z.object({ location: z.string().nullish() }).passthrough())
      .nullish(),
    department: z.string().nullish(),
    team: z.string().nullish(),
    isListed: z.boolean().nullish(),
    isRemote: z.boolean().nullish(),
    workplaceType: z.string().nullish(),
    descriptionHtml: z.string().nullish(),
    descriptionPlain: z.string().nullish(),
    publishedAt: z.string().nullish(),
    employmentType: z.string().nullish(),
    address: ashbyAddressSchema,
    jobUrl: z.string().url(),
    applyUrl: z.string().url(),
    compensation: z
      .object({
        compensationTiers: z
          .array(
            z
              .object({ components: z.array(compensationComponentSchema).nullish() })
              .passthrough()
          )
          .nullish()
      })
      .passthrough()
      .nullish()
  })
  .passthrough()

const ashbyResponseSchema = z.object({
  jobs: z.array(ashbyJobSchema)
})

const externalIdFromJobUrl = (jobUrl: string) => {
  const url = new URL(jobUrl)
  const pathSegment = url.pathname.split('/').filter(Boolean).at(-1)
  return pathSegment || createHash('sha256').update(url.toString()).digest('hex')
}

const salaryPeriod = (
  interval: string | null | undefined
): NormalizedOpportunity['salaryPeriod'] => {
  const normalized = interval?.toLowerCase() ?? ''
  if (normalized.includes('hour')) return 'HOUR'
  if (normalized.includes('day')) return 'DAY'
  if (normalized.includes('week')) return 'WEEK'
  if (normalized.includes('month')) return 'MONTH'
  if (normalized.includes('year')) return 'YEAR'
  return interval ? 'UNKNOWN' : null
}

export class AshbyAdapter implements OpportunitySourceAdapter {
  readonly sourceType = 'ASHBY' as const

  constructor(private readonly httpClient: JsonHttpClient) {}

  async validateSource(source: OpportunitySource): Promise<ValidationResult> {
    if (source.sourceType !== this.sourceType) {
      return { valid: false, errors: ['Source type must be ASHBY'] }
    }
    if (!validateSourceIdentifier(source.sourceIdentifier)) {
      return { valid: false, errors: ['Invalid Ashby job board name'] }
    }

    try {
      const response = await this.fetchBoard(source)
      return {
        valid: true,
        errors: [],
        metadata: { listedJobs: response.jobs.filter((job) => job.isListed !== false).length }
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Ashby validation failed']
      }
    }
  }

  async fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]> {
    const response = await this.fetchBoard(source)
    return response.jobs
      .filter((job) => job.isListed !== false)
      .map((job) => ({
        externalId: externalIdFromJobUrl(job.jobUrl),
        data: job as Record<string, unknown>
      }))
  }

  async normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity> {
    const job = ashbyJobSchema.parse(rawOpportunity.data)
    const descriptionHtml = sanitizeDescriptionHtml(job.descriptionHtml)
    const locations = [job.location, ...(job.secondaryLocations ?? []).map((item) => item.location)]
      .map((location) => location?.trim())
      .filter((location): location is string => Boolean(location))
    const salary = job.compensation?.compensationTiers
      ?.flatMap((tier) => tier.components ?? [])
      .find((component) => component.compensationType?.toLowerCase() === 'salary')
    const address = job.address?.postalAddress

    return {
      externalId: externalIdFromJobUrl(job.jobUrl),
      sourceId: source.id,
      sourceType: this.sourceType,
      organizationName: source.organizationName,
      organizationSlug: slugify(source.organizationName),
      organizationLogoUrl: null,
      title: job.title.trim(),
      descriptionText: job.descriptionPlain?.trim() || htmlToText(descriptionHtml),
      descriptionHtml,
      opportunityType: inferOpportunityType(job.title, job.employmentType),
      employmentType: normalizeEmploymentType(job.employmentType),
      departments: [job.department, job.team].filter(
        (value): value is string => Boolean(value)
      ),
      locations,
      city: address?.addressLocality ?? null,
      state: address?.addressRegion ?? null,
      country: address?.addressCountry ?? null,
      remoteStatus: normalizeRemoteStatus(job.workplaceType, job.isRemote ?? undefined),
      salaryMinimum: typeof salary?.minValue === 'number' ? String(salary.minValue) : null,
      salaryMaximum: typeof salary?.maxValue === 'number' ? String(salary.maxValue) : null,
      salaryCurrency: salary?.currencyCode?.slice(0, 3).toUpperCase() ?? null,
      salaryPeriod: salaryPeriod(salary?.interval),
      applicationUrl: job.applyUrl,
      sourceUrl: job.jobUrl,
      datePosted: parseDate(job.publishedAt),
      applicationDeadline: null,
      rawSourceData: rawOpportunity.data
    }
  }

  private async fetchBoard(source: OpportunitySource) {
    if (!validateSourceIdentifier(source.sourceIdentifier)) {
      throw new Error('Invalid Ashby job board name')
    }
    const url = new URL(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.sourceIdentifier)}`
    )
    url.searchParams.set('includeCompensation', 'true')
    return ashbyResponseSchema.parse(await this.httpClient.getJson<unknown>(url))
  }
}
