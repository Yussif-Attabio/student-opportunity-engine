import { useCallback, useEffect, useState } from 'react'
import { sampleOpportunities } from '../data/opportunities'
import type { Opportunity } from '../types'

interface JobsFeedResponse {
  opportunities: Opportunity[]
  providers: string[]
  warnings: string[]
  fetchedAt: string
}

interface PersistedOpportunity {
  id: string
  organizationName: string
  sourceType: string
  title: string
  descriptionText: string | null
  studentFacingSummary: string | null
  opportunityType: string
  departments: string[]
  locations: string[]
  remoteStatus: string
  applicationUrl: string
  applicationDeadline: string | null
  datePosted: string | null
  firstSeenAt: string
  requiredSkills: string[]
  majors: string[]
  salaryMinimum: string | null
  salaryMaximum: string | null
  salaryCurrency: string | null
  salaryPeriod: string | null
}

interface PersistedOpportunityResponse {
  items: PersistedOpportunity[]
  nextCursor: string | null
}

const toOpportunityType = (type: string): Opportunity['type'] => {
  if (type === 'INTERNSHIP' || type === 'CO_OP') return 'internship'
  if (type === 'FELLOWSHIP') return 'fellowship'
  if (type === 'SCHOLARSHIP') return 'scholarship'
  if (type === 'RESEARCH') return 'research'
  return 'job'
}

const formatCompensation = (opportunity: PersistedOpportunity) => {
  if (!opportunity.salaryMinimum && !opportunity.salaryMaximum) return undefined
  const range = [opportunity.salaryMinimum, opportunity.salaryMaximum]
    .filter(Boolean)
    .join(' – ')
  return `${opportunity.salaryCurrency ?? ''} ${range}${
    opportunity.salaryPeriod ? ` / ${opportunity.salaryPeriod.toLowerCase()}` : ''
  }`.trim()
}

const mapPersistedOpportunity = (
  opportunity: PersistedOpportunity
): Opportunity => ({
  id: opportunity.id,
  title: opportunity.title,
  type: toOpportunityType(opportunity.opportunityType),
  source: opportunity.organizationName,
  location: opportunity.locations.join(', ') || 'Location not listed',
  deadline: opportunity.applicationDeadline ?? '',
  description:
    opportunity.studentFacingSummary ??
    opportunity.descriptionText ??
    'See the official posting for details.',
  requiredSkills: opportunity.requiredSkills,
  relatedMajors: opportunity.majors,
  tags: [
    ...opportunity.departments,
    opportunity.remoteStatus !== 'UNKNOWN'
      ? opportunity.remoteStatus.toLowerCase()
      : ''
  ].filter(Boolean),
  applicationStep: 'Apply on the employer’s official application page.',
  applicationUrl: opportunity.applicationUrl,
  attribution:
    opportunity.sourceType === 'ADZUNA'
      ? { label: 'Jobs by Adzuna', url: 'https://www.adzuna.com/' }
      : undefined,
  postedDate: opportunity.datePosted ?? opportunity.firstSeenAt,
  compensation: formatCompensation(opportunity)
})

export const useOpportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(sampleOpportunities)
  const [providers, setProviders] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  const loadOpportunities = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    try {
      const persistedResponse = await fetch(
        `/api/opportunities?limit=100&studentEligible=true${
          forceRefresh ? `&refresh=${Date.now()}` : ''
        }`
      )
      if (persistedResponse.ok) {
        const persisted =
          (await persistedResponse.json()) as PersistedOpportunityResponse
        if (Array.isArray(persisted.items) && persisted.items.length > 0) {
          setOpportunities(persisted.items.map(mapPersistedOpportunity))
          setProviders([
            ...new Set(persisted.items.map(({ organizationName }) => organizationName))
          ])
          setWarnings([])
          setUsingFallback(false)
          return
        }
      }

      const compatibilityResponse = await fetch(
        `/api/jobs${forceRefresh ? '?refresh=1' : ''}`
      )
      if (!compatibilityResponse.ok) {
        throw new Error(`Jobs API returned ${compatibilityResponse.status}`)
      }
      const feed = (await compatibilityResponse.json()) as JobsFeedResponse
      if (!Array.isArray(feed.opportunities) || feed.opportunities.length === 0) {
        throw new Error('No live jobs were returned')
      }
      setOpportunities(feed.opportunities)
      setProviders(Array.isArray(feed.providers) ? feed.providers : [])
      setWarnings([
        'The persisted feed is not configured yet; using the live compatibility feed.',
        ...(Array.isArray(feed.warnings) ? feed.warnings : [])
      ])
      setUsingFallback(false)
    } catch {
      setOpportunities(sampleOpportunities)
      setProviders([])
      setWarnings(['Live providers are unavailable. Showing sample opportunities.'])
      setUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadOpportunities()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadOpportunities])

  return {
    opportunities,
    providers,
    warnings,
    loading,
    usingFallback,
    refresh: () => loadOpportunities(true)
  }
}
