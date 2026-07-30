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
  sanitizeDescriptionHtml,
  slugify,
  validateSourceIdentifier
} from '../normalization-helpers.js'

const greenhouseJobSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().min(1),
    absolute_url: z.string().url(),
    updated_at: z.string().optional(),
    content: z.string().optional(),
    location: z.object({ name: z.string().optional() }).optional(),
    departments: z.array(z.object({ name: z.string().optional() }).passthrough()).optional()
  })
  .passthrough()

const greenhouseResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema)
})

export class GreenhouseAdapter implements OpportunitySourceAdapter {
  readonly sourceType = 'GREENHOUSE' as const

  constructor(private readonly httpClient: JsonHttpClient) {}

  async validateSource(source: OpportunitySource): Promise<ValidationResult> {
    if (source.sourceType !== this.sourceType) {
      return { valid: false, errors: ['Source type must be GREENHOUSE'] }
    }
    if (!validateSourceIdentifier(source.sourceIdentifier)) {
      return { valid: false, errors: ['Invalid Greenhouse board token'] }
    }

    try {
      const response = await this.fetchBoard(source)
      return { valid: true, errors: [], metadata: { publishedJobs: response.jobs.length } }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Greenhouse validation failed']
      }
    }
  }

  async fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]> {
    const response = await this.fetchBoard(source)
    return response.jobs.map((job) => ({
      externalId: String(job.id),
      data: job as Record<string, unknown>
    }))
  }

  async normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity> {
    const job = greenhouseJobSchema.parse(rawOpportunity.data)
    const descriptionHtml = sanitizeDescriptionHtml(job.content)
    const location = job.location?.name?.trim()

    return {
      externalId: String(job.id),
      sourceId: source.id,
      sourceType: this.sourceType,
      organizationName: source.organizationName,
      organizationSlug: slugify(source.organizationName),
      organizationLogoUrl: null,
      title: job.title.trim(),
      descriptionText: htmlToText(descriptionHtml),
      descriptionHtml,
      opportunityType: inferOpportunityType(job.title),
      employmentType: 'UNKNOWN',
      departments: (job.departments ?? [])
        .map((department) => department.name?.trim())
        .filter((name): name is string => Boolean(name)),
      locations: location ? [location] : [],
      city: null,
      state: null,
      country: null,
      remoteStatus: 'UNKNOWN',
      salaryMinimum: null,
      salaryMaximum: null,
      salaryCurrency: null,
      salaryPeriod: null,
      applicationUrl: job.absolute_url,
      sourceUrl: job.absolute_url,
      datePosted: null,
      applicationDeadline: null,
      rawSourceData: rawOpportunity.data
    }
  }

  private async fetchBoard(source: OpportunitySource) {
    if (!validateSourceIdentifier(source.sourceIdentifier)) {
      throw new Error('Invalid Greenhouse board token')
    }
    const url = new URL(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.sourceIdentifier)}/jobs`
    )
    url.searchParams.set('content', 'true')
    return greenhouseResponseSchema.parse(
      await this.httpClient.getJson<unknown>(url)
    )
  }
}
