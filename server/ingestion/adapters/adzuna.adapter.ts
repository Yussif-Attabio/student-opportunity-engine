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
  slugify
} from '../normalization-helpers.js'

const adzunaJobSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    title: z.string().min(1),
    description: z.string().nullish(),
    redirect_url: z.string().url(),
    created: z.string().nullish(),
    salary_min: z.number().nullish(),
    salary_max: z.number().nullish(),
    contract_time: z.string().nullish(),
    contract_type: z.string().nullish(),
    company: z.object({ display_name: z.string().nullish() }).nullish(),
    category: z.object({ label: z.string().nullish() }).nullish(),
    location: z
      .object({
        display_name: z.string().nullish(),
        area: z.array(z.string()).nullish()
      })
      .nullish()
  })
  .passthrough()

const adzunaResponseSchema = z.object({
  count: z.number().int().nonnegative().optional(),
  results: z.array(adzunaJobSchema)
})

const countryCodePattern = /^[a-z]{2}$/

const readBoundedInteger = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
) =>
  typeof value === 'number' && Number.isInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback

const credentials = () => {
  const appId = process.env.ADZUNA_APP_ID?.trim()
  const appKey = process.env.ADZUNA_APP_KEY?.trim()
  if (!appId || !appKey) {
    throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY are required')
  }
  return { appId, appKey }
}

export class AdzunaAdapter implements OpportunitySourceAdapter {
  readonly sourceType = 'ADZUNA' as const

  constructor(private readonly httpClient: JsonHttpClient) {}

  async validateSource(source: OpportunitySource): Promise<ValidationResult> {
    if (source.sourceType !== this.sourceType) {
      return { valid: false, errors: ['Source type must be ADZUNA'] }
    }
    if (!countryCodePattern.test(source.sourceIdentifier)) {
      return { valid: false, errors: ['Adzuna source identifier must be a two-letter country code'] }
    }

    try {
      const response = await this.fetchPage(source, 1, 1)
      return {
        valid: true,
        errors: [],
        metadata: { availableJobs: response.count ?? response.results.length }
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Adzuna validation failed']
      }
    }
  }

  async fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]> {
    const pageSize = 50
    const maxPages = readBoundedInteger(source.metadata.maxPages, 5, 1, 5)
    const jobs: z.infer<typeof adzunaJobSchema>[] = []

    for (let page = 1; page <= maxPages; page += 1) {
      const response = await this.fetchPage(source, page, pageSize)
      jobs.push(...response.results)
      if (
        response.results.length < pageSize ||
        (response.count !== undefined && jobs.length >= response.count)
      ) {
        break
      }
    }

    return jobs.map((job) => ({
      externalId: String(job.id),
      data: job as Record<string, unknown>
    }))
  }

  async normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity> {
    const job = adzunaJobSchema.parse(rawOpportunity.data)
    const organizationName = job.company?.display_name?.trim() || 'Employer not listed'
    const location = job.location?.display_name?.trim()
    const employmentLabel = [job.contract_time, job.contract_type]
      .filter(Boolean)
      .join(' ')
    const descriptionText = htmlToText(job.description)
    const remoteText = `${job.title} ${location ?? ''} ${job.description ?? ''}`

    return {
      externalId: String(job.id),
      sourceId: source.id,
      sourceType: this.sourceType,
      organizationName,
      organizationSlug: slugify(organizationName),
      organizationLogoUrl: null,
      title: job.title.trim(),
      descriptionText,
      descriptionHtml: null,
      opportunityType: inferOpportunityType(job.title, employmentLabel),
      employmentType: normalizeEmploymentType(employmentLabel),
      departments: job.category?.label ? [job.category.label] : [],
      teams: [],
      locations: location ? [location] : [],
      city: null,
      state: null,
      country: job.location?.area?.[0] ?? source.sourceIdentifier.toUpperCase(),
      remoteStatus: normalizeRemoteStatus(remoteText),
      salaryMinimum:
        typeof job.salary_min === 'number' ? String(job.salary_min) : null,
      salaryMaximum:
        typeof job.salary_max === 'number' ? String(job.salary_max) : null,
      salaryCurrency:
        typeof source.metadata.currency === 'string'
          ? source.metadata.currency.slice(0, 3).toUpperCase()
          : null,
      salaryPeriod:
        typeof job.salary_min === 'number' || typeof job.salary_max === 'number'
          ? 'YEAR'
          : null,
      applicationUrl: job.redirect_url,
      sourceUrl: job.redirect_url,
      datePosted: parseDate(job.created),
      applicationDeadline: null,
      rawSourceData: rawOpportunity.data
    }
  }

  private async fetchPage(
    source: OpportunitySource,
    page: number,
    resultsPerPage: number
  ) {
    if (!countryCodePattern.test(source.sourceIdentifier)) {
      throw new Error('Invalid Adzuna country code')
    }
    const { appId, appKey } = credentials()
    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/${source.sourceIdentifier}/search/${page}`
    )
    url.searchParams.set('app_id', appId)
    url.searchParams.set('app_key', appKey)
    url.searchParams.set('results_per_page', String(resultsPerPage))
    url.searchParams.set('sort_by', 'date')
    url.searchParams.set(
      'max_days_old',
      String(readBoundedInteger(source.metadata.maxDaysOld, 30, 1, 90))
    )
    if (typeof source.metadata.query === 'string' && source.metadata.query.trim()) {
      url.searchParams.set('what', source.metadata.query.trim())
    }
    return adzunaResponseSchema.parse(await this.httpClient.getJson<unknown>(url))
  }
}
