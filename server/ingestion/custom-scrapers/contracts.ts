import type {
  NormalizedEmploymentType,
  NormalizedRemoteStatus
} from '../contracts.js'

export interface ScrapedOpportunity {
  externalId?: string
  title: string
  descriptionHtml?: string | null
  descriptionText?: string | null
  employmentType?: NormalizedEmploymentType
  departments?: string[]
  teams?: string[]
  locations?: string[]
  city?: string | null
  state?: string | null
  country?: string | null
  remoteStatus?: NormalizedRemoteStatus
  applicationUrl?: string
  datePosted?: string | null
  applicationDeadline?: string | null
}

export interface CustomScraperDefinition {
  id: string
  organizationName: string
  listingUrl: string
  approvedHosts: readonly string[]
  maxJobs: number
  crawlDelayMs: number
  validateListing(html: string, pageUrl: string): boolean
  extractDetailUrls(html: string, pageUrl: string): string[]
  extractOpportunity(html: string, pageUrl: string): ScrapedOpportunity
}
