import { isIP } from 'node:net'
import { z } from 'zod'
import type {
  NormalizedOpportunity,
  OpportunitySource,
  OpportunitySourceAdapter,
  RawOpportunity,
  ValidationResult
} from '../contracts.js'
import { extractJobPostingsFromHtml } from '../json-ld.js'
import {
  htmlToText,
  inferOpportunityType,
  normalizeEmploymentType,
  normalizeRemoteStatus,
  parseDate,
  sanitizeDescriptionHtml,
  slugify
} from '../normalization-helpers.js'
import type { HtmlHttpClient } from '../page-http-client.js'
import { stableHash } from '../stable-hash.js'

const jobPostingSchema = z
  .object({
    '@type': z.union([z.string(), z.array(z.string())]),
    title: z.string().trim().min(1),
    description: z.unknown().optional(),
    identifier: z.unknown().optional(),
    url: z.string().trim().optional(),
    datePosted: z.string().nullish(),
    validThrough: z.string().nullish(),
    employmentType: z.union([z.string(), z.array(z.string())]).nullish(),
    hiringOrganization: z.unknown().optional(),
    jobLocation: z.unknown().optional(),
    applicantLocationRequirements: z.unknown().optional(),
    jobLocationType: z.unknown().optional(),
    baseSalary: z.unknown().optional()
  })
  .passthrough()

const hostnamePattern =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stringsFrom = (value: unknown): string[] => {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(stringsFrom)
  if (!isRecord(value)) return []
  return stringsFrom(value.name ?? value.value ?? value.text)
}

const firstString = (value: unknown) => stringsFrom(value)[0] ?? null

const identifierFrom = (value: unknown) => {
  if (!isRecord(value)) return firstString(value)
  return firstString(value.value) ?? firstString(value.name)
}

const approvedHostsFor = (source: OpportunitySource) => {
  const metadataHosts = Array.isArray(source.metadata.allowedHosts)
    ? source.metadata.allowedHosts.filter(
        (value): value is string => typeof value === 'string'
      )
    : []
  return [...new Set([source.sourceIdentifier, ...metadataHosts])]
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

const validApprovedHost = (host: string) =>
  hostnamePattern.test(host) && isIP(host) === 0

const resolvePublicUrl = (value: unknown, baseUrl: string) => {
  if (typeof value !== 'string' || !value.trim()) return baseUrl
  try {
    const url = new URL(value, baseUrl)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : baseUrl
  } catch {
    return baseUrl
  }
}

const organizationDetails = (
  value: unknown,
  fallbackName: string
): { name: string; logoUrl: string | null } => {
  if (!isRecord(value)) return { name: fallbackName, logoUrl: null }
  const name = firstString(value.name) ?? fallbackName
  const logo = isRecord(value.logo) ? value.logo.url : value.logo
  return {
    name,
    logoUrl: typeof logo === 'string' && /^https?:\/\//i.test(logo) ? logo : null
  }
}

interface ParsedLocations {
  labels: string[]
  city: string | null
  state: string | null
  country: string | null
}

const parseLocations = (
  jobLocation: unknown,
  applicantLocations: unknown
): ParsedLocations => {
  const entries = Array.isArray(jobLocation)
    ? jobLocation
    : jobLocation
      ? [jobLocation]
      : []
  let city: string | null = null
  let state: string | null = null
  let country: string | null = null
  const labels: string[] = []

  for (const entry of entries) {
    if (!isRecord(entry)) {
      labels.push(...stringsFrom(entry))
      continue
    }
    const address = isRecord(entry.address) ? entry.address : entry
    const entryCity = firstString(address.addressLocality)
    const entryState = firstString(address.addressRegion)
    const entryCountry = firstString(address.addressCountry)
    city ??= entryCity
    state ??= entryState
    country ??= entryCountry
    const label =
      firstString(entry.name) ??
      [entryCity, entryState, entryCountry].filter(Boolean).join(', ')
    if (label) labels.push(label)
  }
  labels.push(...stringsFrom(applicantLocations))
  return {
    labels: [...new Set(labels)],
    city,
    state,
    country
  }
}

const salaryDetails = (
  value: unknown
): Pick<
  NormalizedOpportunity,
  'salaryMinimum' | 'salaryMaximum' | 'salaryCurrency' | 'salaryPeriod'
> => {
  if (!isRecord(value)) {
    return {
      salaryMinimum: null,
      salaryMaximum: null,
      salaryCurrency: null,
      salaryPeriod: null
    }
  }
  const quantitative = isRecord(value.value) ? value.value : value
  const exactValue =
    typeof quantitative.value === 'number' ? quantitative.value : null
  const minimum =
    typeof quantitative.minValue === 'number' ? quantitative.minValue : exactValue
  const maximum =
    typeof quantitative.maxValue === 'number' ? quantitative.maxValue : exactValue
  const unit = firstString(quantitative.unitText)?.toLowerCase() ?? ''
  const period: NormalizedOpportunity['salaryPeriod'] =
    unit.includes('hour')
      ? 'HOUR'
      : unit.includes('day')
        ? 'DAY'
        : unit.includes('week')
          ? 'WEEK'
          : unit.includes('month')
            ? 'MONTH'
            : unit.includes('year')
              ? 'YEAR'
              : unit
                ? 'UNKNOWN'
                : null
  return {
    salaryMinimum: minimum === null ? null : String(minimum),
    salaryMaximum: maximum === null ? null : String(maximum),
    salaryCurrency: firstString(value.currency)?.slice(0, 3).toUpperCase() ?? null,
    salaryPeriod: period
  }
}

const externalIdFor = (
  job: Record<string, unknown>,
  pageUrl: string
) => {
  const identifier = identifierFrom(job.identifier)
  if (identifier) return identifier
  if (typeof job.url === 'string' && job.url) {
    return stableHash(resolvePublicUrl(job.url, pageUrl))
  }
  return stableHash({
    pageUrl,
    title: firstString(job.title),
    datePosted: firstString(job.datePosted),
    location: job.jobLocation ?? null
  })
}

export class StructuredDataAdapter implements OpportunitySourceAdapter {
  readonly sourceType = 'STRUCTURED_DATA' as const
  private readonly validatedPages = new Map<string, Awaited<ReturnType<HtmlHttpClient['getHtml']>>>()

  constructor(private readonly httpClient: HtmlHttpClient) {}

  async validateSource(source: OpportunitySource): Promise<ValidationResult> {
    if (source.sourceType !== this.sourceType) {
      return { valid: false, errors: ['Source type must be STRUCTURED_DATA'] }
    }
    const approvedHosts = approvedHostsFor(source)
    let careersUrl: URL
    try {
      careersUrl = new URL(source.careersUrl)
    } catch {
      return { valid: false, errors: ['Careers URL is invalid'] }
    }
    if (
      careersUrl.protocol !== 'https:' ||
      careersUrl.hostname.toLowerCase() !== source.sourceIdentifier.toLowerCase() ||
      approvedHosts.some((host) => !validApprovedHost(host))
    ) {
      return {
        valid: false,
        errors: ['Source identifier and approved hosts must be valid public hostnames']
      }
    }
    try {
      const page = await this.httpClient.getHtml(careersUrl, approvedHosts)
      const extraction = extractJobPostingsFromHtml(page.html)
      if (extraction.jobPostings.length === 0) {
        return {
          valid: false,
          errors: [
            extraction.parseErrors[0] ??
              'Career page does not contain JobPosting JSON-LD'
          ]
        }
      }
      this.validatedPages.set(source.id, page)
      return {
        valid: true,
        errors: [],
        metadata: {
          publishedJobs: extraction.jobPostings.length,
          malformedScripts: extraction.parseErrors.length,
          finalUrl: page.finalUrl
        }
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : 'Structured-data validation failed'
        ]
      }
    }
  }

  async fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]> {
    const validatedPage = this.validatedPages.get(source.id)
    this.validatedPages.delete(source.id)
    const page =
      validatedPage ??
      await this.httpClient.getHtml(
        new URL(source.careersUrl),
        approvedHostsFor(source)
      )
    const extraction = extractJobPostingsFromHtml(page.html)
    if (extraction.jobPostings.length === 0) {
      throw new Error(
        extraction.parseErrors[0] ??
          'Career page does not contain JobPosting JSON-LD'
      )
    }
    return extraction.jobPostings.map((data) => ({
      externalId: externalIdFor(data, page.finalUrl),
      data: { ...data, __sourcePageUrl: page.finalUrl }
    }))
  }

  async normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity> {
    const job = jobPostingSchema.parse(rawOpportunity.data)
    const pageUrl =
      typeof rawOpportunity.data.__sourcePageUrl === 'string'
        ? rawOpportunity.data.__sourcePageUrl
        : source.careersUrl
    const descriptionValue = firstString(job.description)
    const descriptionHtml = sanitizeDescriptionHtml(descriptionValue)
    const employmentLabel = stringsFrom(job.employmentType).join(' ')
    const organization = organizationDetails(
      job.hiringOrganization,
      source.organizationName
    )
    const locations = parseLocations(
      job.jobLocation,
      job.applicantLocationRequirements
    )
    const salary = salaryDetails(job.baseSalary)
    const remoteLabel = stringsFrom(job.jobLocationType).join(' ')

    return {
      externalId: externalIdFor(job, pageUrl),
      sourceId: source.id,
      sourceType: this.sourceType,
      organizationName: organization.name,
      organizationSlug: slugify(organization.name),
      organizationLogoUrl: organization.logoUrl,
      title: job.title,
      descriptionText: htmlToText(descriptionHtml),
      descriptionHtml,
      opportunityType: inferOpportunityType(job.title, employmentLabel),
      employmentType: normalizeEmploymentType(employmentLabel),
      departments: [],
      teams: [],
      locations: locations.labels,
      city: locations.city,
      state: locations.state,
      country: locations.country,
      remoteStatus: normalizeRemoteStatus(
        remoteLabel,
        remoteLabel.toUpperCase().includes('TELECOMMUTE')
      ),
      ...salary,
      applicationUrl: resolvePublicUrl(job.url, pageUrl),
      sourceUrl: pageUrl,
      datePosted: parseDate(job.datePosted),
      applicationDeadline: parseDate(job.validThrough),
      rawSourceData: rawOpportunity.data
    }
  }
}
