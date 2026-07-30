import { useCallback, useEffect, useRef, useState } from 'react'
import { sampleOpportunities } from '../data/opportunities'
import type { CareerField, Opportunity } from '../types'

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
  careerField: CareerField
  departments: string[]
  teams: string[]
  locations: string[]
  country: string | null
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

interface OpportunityFeedFilters {
  country?: string
  careerField?: CareerField
}

const DESCRIPTION_SUMMARY_MAX_LENGTH = 280

const summarizeDescription = (value: string | null) => {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'See the official posting for details.'
  if (normalized.length <= DESCRIPTION_SUMMARY_MAX_LENGTH) return normalized

  const excerpt = normalized.slice(0, DESCRIPTION_SUMMARY_MAX_LENGTH + 1)
  const sentenceEnd = Math.max(
    excerpt.lastIndexOf('. '),
    excerpt.lastIndexOf('! '),
    excerpt.lastIndexOf('? ')
  )
  if (sentenceEnd >= DESCRIPTION_SUMMARY_MAX_LENGTH / 2) {
    return excerpt.slice(0, sentenceEnd + 1)
  }

  const wordEnd = excerpt.lastIndexOf(' ')
  const end =
    wordEnd >= DESCRIPTION_SUMMARY_MAX_LENGTH / 2
      ? wordEnd
      : DESCRIPTION_SUMMARY_MAX_LENGTH
  return `${excerpt.slice(0, end).trimEnd()}…`
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
  country: opportunity.country ?? undefined,
  careerField: opportunity.careerField,
  deadline: opportunity.applicationDeadline ?? '',
  description: summarizeDescription(
    opportunity.studentFacingSummary ?? opportunity.descriptionText
  ),
  fullDescription:
    opportunity.descriptionText ??
    opportunity.studentFacingSummary ??
    'See the official posting for details.',
  requiredSkills: opportunity.requiredSkills,
  relatedMajors: opportunity.majors,
  tags: [
    ...opportunity.departments,
    ...opportunity.teams,
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

export const useOpportunities = (filters: OpportunityFeedFilters = {}) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(sampleOpportunities)
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const activeRequest = useRef<AbortController | null>(null)

  const loadOpportunities = useCallback(async (forceRefresh = false) => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)
    try {
      const persistedItems: PersistedOpportunity[] = []
      let cursor: string | null = null
      let persistedFeedAvailable = false

      const seenCursors = new Set<string>()
      do {
        const params = new URLSearchParams({
          limit: '100',
          studentEligible: 'true'
        })
        if (cursor) params.set('cursor', cursor)
        if (filters.country) params.set('country', filters.country)
        if (filters.careerField) params.set('careerField', filters.careerField)
        if (forceRefresh) params.set('refresh', String(Date.now()))

        const persistedResponse = await fetch(`/api/opportunities?${params}`, {
          signal: controller.signal
        })
        if (!persistedResponse.ok) break
        persistedFeedAvailable = true
        const persisted =
          (await persistedResponse.json()) as PersistedOpportunityResponse
        if (!Array.isArray(persisted.items)) break
        persistedItems.push(...persisted.items)
        cursor = persisted.nextCursor
        if (cursor && seenCursors.has(cursor)) break
        if (cursor) seenCursors.add(cursor)
      } while (cursor)

      if (persistedItems.length > 0) {
        if (activeRequest.current !== controller) return
        if (!filters.country && !filters.careerField) {
          setAvailableCountries([
            ...new Set(
              persistedItems
                .map(({ country }) => country)
                .filter((country): country is string => Boolean(country))
            )
          ].sort())
        }
        setOpportunities(persistedItems.map(mapPersistedOpportunity))
        setProviders([
          ...new Set(persistedItems.map(({ organizationName }) => organizationName))
        ])
        setWarnings([])
        setUsingFallback(false)
        return
      }
      if (persistedFeedAvailable && (filters.country || filters.careerField)) {
        if (activeRequest.current !== controller) return
        setOpportunities([])
        setProviders([])
        setWarnings([])
        setUsingFallback(false)
        return
      }

      const compatibilityResponse = await fetch(
        `/api/jobs${forceRefresh ? '?refresh=1' : ''}`,
        { signal: controller.signal }
      )
      if (!compatibilityResponse.ok) {
        throw new Error(`Jobs API returned ${compatibilityResponse.status}`)
      }
      const feed = (await compatibilityResponse.json()) as JobsFeedResponse
      if (!Array.isArray(feed.opportunities) || feed.opportunities.length === 0) {
        throw new Error('No live jobs were returned')
      }
      if (activeRequest.current !== controller) return
      setOpportunities(feed.opportunities)
      setProviders(Array.isArray(feed.providers) ? feed.providers : [])
      setWarnings([
        'The persisted feed is not configured yet; using the live compatibility feed.',
        ...(Array.isArray(feed.warnings) ? feed.warnings : [])
      ])
      setUsingFallback(false)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (activeRequest.current !== controller) return
      setOpportunities(sampleOpportunities)
      setProviders([])
      setWarnings(['Live providers are unavailable. Showing sample opportunities.'])
      setUsingFallback(true)
    } finally {
      if (activeRequest.current === controller) setLoading(false)
    }
  }, [filters.careerField, filters.country])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadOpportunities()
    }, 0)
    return () => {
      window.clearTimeout(timeout)
      const request = activeRequest.current
      request?.abort()
      if (activeRequest.current === request) activeRequest.current = null
    }
  }, [loadOpportunities])

  return {
    opportunities,
    availableCountries,
    providers,
    warnings,
    loading,
    usingFallback,
    refresh: () => loadOpportunities(true)
  }
}
