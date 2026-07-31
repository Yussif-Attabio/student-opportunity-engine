import type {
  NormalizedOpportunity,
  OpportunitySource,
  OpportunitySourceAdapter,
  RawOpportunity,
  ValidationResult
} from '../contracts.js'
import type { CustomScraperRegistry } from '../custom-scrapers/registry.js'
import {
  htmlToText,
  inferOpportunityType,
  parseDate,
  sanitizeDescriptionHtml,
  slugify
} from '../normalization-helpers.js'
import type { HtmlHttpClient } from '../page-http-client.js'
import { stableHash } from '../stable-hash.js'

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

const uniqueStrings = (values: readonly string[] | undefined) =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))]

export class CustomScraperAdapter implements OpportunitySourceAdapter {
  readonly sourceType = 'CUSTOM_SCRAPER' as const
  private readonly validatedJobs = new Map<string, RawOpportunity[]>()

  constructor(
    private readonly httpClient: HtmlHttpClient,
    private readonly scrapers: CustomScraperRegistry,
    private readonly wait: (milliseconds: number) => Promise<void> = sleep
  ) {}

  async validateSource(source: OpportunitySource): Promise<ValidationResult> {
    if (source.sourceType !== this.sourceType) {
      return { valid: false, errors: ['Source type must be CUSTOM_SCRAPER'] }
    }
    const scraper = this.scrapers.get(source.sourceIdentifier)
    if (!scraper) {
      return { valid: false, errors: ['Custom scraper is not registered'] }
    }
    if (source.organizationName !== scraper.organizationName) {
      return {
        valid: false,
        errors: ['Organization name must match the registered scraper']
      }
    }
    let careersUrl: string
    try {
      careersUrl = new URL(source.careersUrl).toString()
    } catch {
      return { valid: false, errors: ['Careers URL is invalid'] }
    }
    if (careersUrl !== new URL(scraper.listingUrl).toString()) {
      return {
        valid: false,
        errors: ['Careers URL must match the registered scraper listing URL']
      }
    }

    try {
      const jobs = await this.crawl(scraper)
      const validJobs = jobs.filter(({ data }) => !('__crawlError' in data))
      if (jobs.length > 0 && validJobs.length === 0) {
        return { valid: false, errors: ['Custom scraper returned no valid jobs'] }
      }
      this.validatedJobs.set(source.id, jobs)
      return {
        valid: true,
        errors: [],
        metadata: {
          publishedJobs: validJobs.length,
          failedJobs: jobs.length - validJobs.length,
          scraperId: scraper.id
        }
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : 'Custom scraper validation failed'
        ]
      }
    }
  }

  async fetchOpportunities(source: OpportunitySource): Promise<RawOpportunity[]> {
    const scraper = this.scrapers.get(source.sourceIdentifier)
    if (!scraper) throw new Error('Custom scraper is not registered')
    const cached = this.validatedJobs.get(source.id)
    this.validatedJobs.delete(source.id)
    return cached ?? this.crawl(scraper)
  }

  async normalize(
    rawOpportunity: RawOpportunity,
    source: OpportunitySource
  ): Promise<NormalizedOpportunity> {
    if ('__crawlError' in rawOpportunity.data) {
      throw new Error(String(rawOpportunity.data.__crawlError))
    }
    const scraper = this.scrapers.get(source.sourceIdentifier)
    if (!scraper) throw new Error('Custom scraper is not registered')
    const detailUrl = String(rawOpportunity.data.__detailUrl)
    const html = String(rawOpportunity.data.__html)
    const scraped = scraper.extractOpportunity(html, detailUrl)
    const title = scraped.title.trim()
    if (!title) throw new Error('Scraped opportunity title is empty')
    const applicationUrl = new URL(
      scraped.applicationUrl ?? detailUrl,
      detailUrl
    )
    if (
      applicationUrl.protocol !== 'https:' ||
      !scraper.approvedHosts.includes(applicationUrl.hostname.toLowerCase())
    ) {
      throw new Error('Scraped application URL is not on an approved host')
    }
    const descriptionHtml = sanitizeDescriptionHtml(scraped.descriptionHtml)
    const descriptionText =
      scraped.descriptionText?.trim() || htmlToText(descriptionHtml)

    return {
      externalId: scraped.externalId?.trim() || stableHash(detailUrl),
      sourceId: source.id,
      sourceType: this.sourceType,
      organizationName: source.organizationName,
      organizationSlug: slugify(source.organizationName),
      organizationLogoUrl: null,
      title,
      descriptionText,
      descriptionHtml,
      opportunityType: inferOpportunityType(title, scraped.employmentType),
      employmentType: scraped.employmentType ?? 'UNKNOWN',
      departments: uniqueStrings(scraped.departments),
      teams: uniqueStrings(scraped.teams),
      locations: uniqueStrings(scraped.locations),
      city: scraped.city?.trim() || null,
      state: scraped.state?.trim() || null,
      country: scraped.country?.trim() || null,
      remoteStatus: scraped.remoteStatus ?? 'UNKNOWN',
      salaryMinimum: null,
      salaryMaximum: null,
      salaryCurrency: null,
      salaryPeriod: null,
      applicationUrl: applicationUrl.toString(),
      sourceUrl: detailUrl,
      datePosted: parseDate(scraped.datePosted),
      applicationDeadline: parseDate(scraped.applicationDeadline),
      rawSourceData: {
        scraperId: scraper.id,
        detailUrl
      }
    }
  }

  private async crawl(
    scraper: NonNullable<ReturnType<CustomScraperRegistry['get']>>
  ): Promise<RawOpportunity[]> {
    const listing = await this.httpClient.getHtml(
      new URL(scraper.listingUrl),
      scraper.approvedHosts
    )
    if (!scraper.validateListing(listing.html, listing.finalUrl)) {
      throw new Error('Custom scraper listing-page structure is no longer recognized')
    }
    const resolvedDetailUrls = scraper
      .extractDetailUrls(listing.html, listing.finalUrl)
      .flatMap((value) => {
        try {
          return [new URL(value, listing.finalUrl)]
        } catch {
          return []
        }
      })
      .filter(
        (url) =>
          url.protocol === 'https:' &&
          scraper.approvedHosts.includes(url.hostname.toLowerCase())
      )
      .map((url) => url.toString())
    const detailUrls = [...new Set(resolvedDetailUrls)].slice(0, scraper.maxJobs)
    const jobs: RawOpportunity[] = []
    for (const [index, detailUrl] of detailUrls.entries()) {
      if (index > 0) await this.wait(scraper.crawlDelayMs)
      try {
        const detail = await this.httpClient.getHtml(
          new URL(detailUrl),
          scraper.approvedHosts
        )
        const scraped = scraper.extractOpportunity(detail.html, detail.finalUrl)
        jobs.push({
          externalId: scraped.externalId?.trim() || stableHash(detail.finalUrl),
          data: {
            __detailUrl: detail.finalUrl,
            __html: detail.html
          }
        })
      } catch (error) {
        jobs.push({
          externalId: stableHash(detailUrl),
          data: {
            __detailUrl: detailUrl,
            __crawlError:
              error instanceof Error ? error.message : 'Job detail crawl failed'
          }
        })
      }
    }
    return jobs
  }
}
