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
  sanitizeDescriptionHtml,
  slugify,
  validateSourceIdentifier
} from '../normalization-helpers.js'

const leverJobSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    hostedUrl: z.string().url(),
    applyUrl: z.string().url().optional(),
    description: z.string().optional(),
    descriptionPlain: z.string().optional(),
    workplaceType: z.string().optional(),
    country: z.string().optional(),
    categories: z
      .object({
        location: z.string().optional(),
        allLocations: z.array(z.string()).optional(),
        commitment: z.string().optional(),
        team: z.string().optional(),
        department: z.string().optional()
      })
      .optional(),
    salaryRange: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        currency: z.string().optional(),
        interval: z.string().optional()
      })
      .optional()
  })
  .passthrough()

const leverResponseSchema = z.array(leverJobSchema)

const normalizeSalaryPeriod = (
  value: string | undefined
): NormalizedOpportunity['salaryPeriod'] => {
  const normalized = value?.toLowerCase() ?? ''
  if (normalized.includes('hour')) return 'HOUR'
  if (normalized.includes('day')) return 'DAY'
  if (normalized.includes('week')) return 'WEEK'
  if (normalized.includes('month')) return 'MONTH'
  if (normalized.includes('year') || normalized.includes('annual')) return 'YEAR'
  return value ? 'UNKNOWN' : null
}

export class LeverAdapter implements OpportunitySourceAdapter {
  readonly sourceType = 'LEVER' as const

  constructor(private readonly httpClient: JsonHttpClient) {}

  async validateSource(source: OpportunitySource): Promise<ValidationResult> {
    if (source.sourceType !== this.sourceType) {
      return { valid: false, errors: ['Source type must be LEVER'] }
    }
    if (!validateSourceIdentifier(source.sourceIdentifier)) {
      return { valid: false, errors: ['Invalid Lever site identifier'] }
    }

    try {
      const firstPage = await this.fetchPage(source, 0, 1)
      return { valid: true, errors: [], metadata: { hasPublishedJobs: firstPage.length > 0 } }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Lever validation failed']
      }
    }
  }

  async fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]> {
    const pageSize = 100
    const jobs: z.infer<typeof leverJobSchema>[] = []

    for (let page = 0; page < 100; page += 1) {
      const batch = await this.fetchPage(source, page * pageSize, pageSize)
      jobs.push(...batch)
      if (batch.length < pageSize) break
      if (page === 99) throw new Error('Lever pagination exceeded 10,000 postings')
    }

    return jobs.map((job) => ({
      externalId: job.id,
      data: job as Record<string, unknown>
    }))
  }

  async normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity> {
    const job = leverJobSchema.parse(rawOpportunity.data)
    const descriptionHtml = sanitizeDescriptionHtml(job.description)
    const locations = [
      ...(job.categories?.allLocations ?? []),
      ...(job.categories?.location ? [job.categories.location] : [])
    ]
      .map((location) => location.trim())
      .filter((location, index, values) => location && values.indexOf(location) === index)

    return {
      externalId: job.id,
      sourceId: source.id,
      sourceType: this.sourceType,
      organizationName: source.organizationName,
      organizationSlug: slugify(source.organizationName),
      organizationLogoUrl: null,
      title: job.text.trim(),
      descriptionText: job.descriptionPlain?.trim() || htmlToText(descriptionHtml),
      descriptionHtml,
      opportunityType: inferOpportunityType(job.text, job.categories?.commitment),
      employmentType: normalizeEmploymentType(job.categories?.commitment),
      departments: [job.categories?.department].filter(
        (value): value is string => Boolean(value)
      ),
      teams: [job.categories?.team].filter(
        (value): value is string => Boolean(value)
      ),
      locations,
      city: null,
      state: null,
      country: job.country ?? null,
      remoteStatus: normalizeRemoteStatus(job.workplaceType),
      salaryMinimum:
        typeof job.salaryRange?.min === 'number' ? String(job.salaryRange.min) : null,
      salaryMaximum:
        typeof job.salaryRange?.max === 'number' ? String(job.salaryRange.max) : null,
      salaryCurrency: job.salaryRange?.currency?.slice(0, 3).toUpperCase() ?? null,
      salaryPeriod: normalizeSalaryPeriod(job.salaryRange?.interval),
      applicationUrl: job.applyUrl ?? job.hostedUrl,
      sourceUrl: job.hostedUrl,
      datePosted: null,
      applicationDeadline: null,
      rawSourceData: rawOpportunity.data
    }
  }

  private async fetchPage(source: OpportunitySource, skip: number, limit: number) {
    if (!validateSourceIdentifier(source.sourceIdentifier)) {
      throw new Error('Invalid Lever site identifier')
    }
    const region = source.metadata.region === 'EU' ? 'api.eu.lever.co' : 'api.lever.co'
    const url = new URL(
      `https://${region}/v0/postings/${encodeURIComponent(source.sourceIdentifier)}`
    )
    url.searchParams.set('mode', 'json')
    url.searchParams.set('skip', String(skip))
    url.searchParams.set('limit', String(limit))
    return leverResponseSchema.parse(await this.httpClient.getJson<unknown>(url))
  }
}
