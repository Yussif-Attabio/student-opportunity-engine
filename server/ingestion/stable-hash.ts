import { createHash } from 'node:crypto'
import { canonicalizeApplicationUrl } from './canonical-url.js'

const normalizeText = (value: string | null): string | null =>
  value?.normalize('NFKC').replace(/\s+/g, ' ').trim() || null

export const stableHash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

export const normalizeFingerprintPart = (value: string): string =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const createOpportunityFingerprint = (input: {
  organizationName: string
  title: string
  locations: string[]
  employmentType: string
}): string =>
  stableHash({
    organization: normalizeFingerprintPart(input.organizationName),
    title: normalizeFingerprintPart(input.title),
    locations: [...new Set(input.locations.map(normalizeFingerprintPart))]
      .filter(Boolean)
      .sort(),
    employmentType: input.employmentType
  })

export const createOpportunityContentHash = (input: {
  organizationName: string
  title: string
  descriptionText: string | null
  descriptionHtml: string | null
  opportunityType: string
  employmentType: string
  departments: string[]
  teams: string[]
  locations: string[]
  city: string | null
  state: string | null
  country: string | null
  remoteStatus: string
  salaryMinimum: string | null
  salaryMaximum: string | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  applicationUrl: string
  datePosted: Date | null
  applicationDeadline: Date | null
}): string =>
  stableHash({
    organizationName: normalizeText(input.organizationName),
    title: normalizeText(input.title),
    descriptionText: normalizeText(input.descriptionText),
    descriptionHtml: normalizeText(input.descriptionHtml),
    opportunityType: input.opportunityType,
    employmentType: input.employmentType,
    departments: input.departments.map((value) => normalizeText(value)).filter(Boolean).sort(),
    teams: input.teams.map((value) => normalizeText(value)).filter(Boolean).sort(),
    locations: input.locations.map((value) => normalizeText(value)).filter(Boolean).sort(),
    city: normalizeText(input.city),
    state: normalizeText(input.state),
    country: normalizeText(input.country),
    remoteStatus: input.remoteStatus,
    salaryMinimum: input.salaryMinimum,
    salaryMaximum: input.salaryMaximum,
    salaryCurrency: input.salaryCurrency,
    salaryPeriod: input.salaryPeriod,
    applicationUrl: canonicalizeApplicationUrl(input.applicationUrl),
    datePosted: input.datePosted?.toISOString() ?? null,
    applicationDeadline: input.applicationDeadline?.toISOString() ?? null
  })
