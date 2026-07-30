import type { Opportunity, OpportunityType } from '../src/types.js'

interface GreenhouseJob {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string }
  updated_at?: string
  content?: string
  departments?: Array<{ name?: string }>
}

interface LeverJob {
  id: string
  text: string
  hostedUrl: string
  createdAt?: number
  descriptionPlain?: string
  categories?: {
    location?: string
    team?: string
    department?: string
    commitment?: string
  }
  salaryRange?: {
    min?: number
    max?: number
    currency?: string
    interval?: string
  }
}

interface UsaJobsItem {
  MatchedObjectDescriptor: {
    PositionID: string
    PositionTitle: string
    OrganizationName: string
    DepartmentName?: string
    PositionLocationDisplay?: string
    PositionURI: string
    QualificationSummary?: string
    PublicationStartDate?: string
    ApplicationCloseDate?: string
    PositionSchedule?: Array<{ Name?: string }>
    PositionRemuneration?: Array<{
      MinimumRange?: string
      MaximumRange?: string
      Description?: string
    }>
  }
}

export interface JobsFeed {
  opportunities: Opportunity[]
  providers: string[]
  warnings: string[]
  fetchedAt: string
}

const greenhouseBoards = [
  { token: 'stripe', company: 'Stripe' },
  { token: 'airbnb', company: 'Airbnb' },
  { token: 'datadog', company: 'Datadog' },
  { token: 'cloudflare', company: 'Cloudflare' },
  { token: 'figma', company: 'Figma' },
  { token: 'robinhood', company: 'Robinhood' },
  { token: 'spacex', company: 'SpaceX' },
  { token: 'janestreet', company: 'Jane Street' },
  { token: 'roblox', company: 'Roblox' },
  { token: 'gusto', company: 'Gusto' }
]

const leverSites = [{ site: 'palantir', company: 'Palantir' }]
const studentRolePattern =
  /\b(?:intern|internship|apprentice|apprenticeship)\b|new grad|university graduate|entry[- ]level|early career/i
const skillKeywords = [
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'SQL',
  'Java',
  'C++',
  'Machine Learning',
  'Data Analysis',
  'Communication',
  'Leadership',
  'Project Management',
  'Cloud',
  'AWS'
]

let cachedFeed: { expiresAt: number; feed: JobsFeed } | null = null

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()

const truncate = (value: string, length = 420) =>
  value.length <= length ? value : `${value.slice(0, length).trim()}...`

const classifyType = (title: string): OpportunityType =>
  /\b(?:intern|internship)\b/i.test(title) ? 'internship' : 'job'

const inferRoleTags = (title: string) => [
  ...(/\b(?:intern|internship)\b/i.test(title) ? ['internship'] : []),
  ...(/new grad|university graduate|entry[- ]level|early career/i.test(title)
    ? ['new-grad']
    : []),
  ...(/\b(?:apprentice|apprenticeship)\b/i.test(title) ? ['apprenticeship'] : [])
]

const inferSkills = (text: string) =>
  skillKeywords.filter((skill) => text.toLowerCase().includes(skill.toLowerCase())).slice(0, 6)

const inferMajors = (text: string) => {
  const normalized = text.toLowerCase()
  const majors: string[] = []
  if (/software|engineer|computer|developer|data|machine learning/.test(normalized)) {
    majors.push('Computer Science', 'Software Engineering')
  }
  if (/finance|account|business|sales|operations/.test(normalized)) {
    majors.push('Business', 'Finance')
  }
  if (/design|product|ux|user experience/.test(normalized)) {
    majors.push('Design')
  }
  return majors.length > 0 ? [...new Set(majors)] : ['All Majors']
}

const formatSalary = (salary?: LeverJob['salaryRange']) => {
  if (!salary?.min && !salary?.max) return undefined
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: salary.currency || 'USD',
    maximumFractionDigits: 0
  })
  const range = [salary.min, salary.max]
    .filter((value): value is number => typeof value === 'number')
    .map((value) => formatter.format(value))
    .join(' - ')
  return salary.interval ? `${range} ${salary.interval}` : range
}

const fetchJson = async <T>(url: string, headers?: HeadersInit): Promise<T> => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000)
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json() as Promise<T>
}

const fetchGreenhouse = async (token: string, company: string): Promise<Opportunity[]> => {
  const data = await fetchJson<{ jobs: GreenhouseJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
  )
  return data.jobs
    .filter((job) => studentRolePattern.test(job.title))
    .slice(0, 25)
    .map((job) => {
      const description = stripHtml(job.content)
      const text = `${job.title} ${description}`
      return {
        id: `greenhouse-${token}-${job.id}`,
        title: job.title,
        type: classifyType(job.title),
        source: company,
        location: job.location?.name || 'Location not listed',
        deadline: '',
        description: truncate(description || `View the full ${company} job description.`),
        requiredSkills: inferSkills(text),
        relatedMajors: inferMajors(text),
        tags: [
          'live',
          'greenhouse',
          ...inferRoleTags(job.title),
          ...(job.departments ?? []).map((department) => department.name || '').filter(Boolean)
        ],
        applicationStep: `Review the role and apply on ${company}'s official careers site.`,
        applicationUrl: job.absolute_url,
        postedDate: job.updated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)
      }
    })
}

const fetchLever = async (site: string, company: string): Promise<Opportunity[]> => {
  const jobs = await fetchJson<LeverJob[]>(
    `https://api.lever.co/v0/postings/${site}?mode=json`
  )
  return jobs
    .filter((job) => studentRolePattern.test(job.text))
    .slice(0, 25)
    .map((job) => {
      const description = stripHtml(job.descriptionPlain)
      const text = `${job.text} ${description} ${job.categories?.team || ''}`
      return {
        id: `lever-${site}-${job.id}`,
        title: job.text,
        type: classifyType(job.text),
        source: company,
        location: job.categories?.location || 'Location not listed',
        deadline: '',
        description: truncate(description || `View the full ${company} job description.`),
        requiredSkills: inferSkills(text),
        relatedMajors: inferMajors(text),
        tags: [
          'live',
          'lever',
          ...inferRoleTags(job.text),
          job.categories?.team,
          job.categories?.department,
          job.categories?.commitment
        ].filter((tag): tag is string => Boolean(tag)),
        applicationStep: `Review the role and apply on ${company}'s official careers site.`,
        applicationUrl: job.hostedUrl,
        postedDate: job.createdAt
          ? new Date(job.createdAt).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        compensation: formatSalary(job.salaryRange)
      }
    })
}

const fetchUsaJobs = async (): Promise<Opportunity[]> => {
  const apiKey = process.env.USAJOBS_API_KEY
  const userAgent = process.env.USAJOBS_USER_AGENT
  if (!apiKey || !userAgent) return []

  const data = await fetchJson<{ SearchResult?: { SearchResultItems?: UsaJobsItem[] } }>(
    'https://data.usajobs.gov/api/search?Keyword=student%20internship&ResultsPerPage=50',
    {
      'Authorization-Key': apiKey,
      'User-Agent': userAgent,
      Host: 'data.usajobs.gov'
    }
  )

  return (data.SearchResult?.SearchResultItems ?? []).map(({ MatchedObjectDescriptor: job }) => {
    const description = stripHtml(job.QualificationSummary)
    const text = `${job.PositionTitle} ${description}`
    const remuneration = job.PositionRemuneration?.[0]
    const compensation =
      remuneration?.MinimumRange || remuneration?.MaximumRange
        ? `${remuneration.MinimumRange || ''} - ${remuneration.MaximumRange || ''} ${remuneration.Description || ''}`.trim()
        : undefined
    return {
      id: `usajobs-${job.PositionID}`,
      title: job.PositionTitle,
      type: classifyType(job.PositionTitle),
      source: job.OrganizationName || job.DepartmentName || 'U.S. Federal Government',
      location: job.PositionLocationDisplay || 'Location varies',
      deadline: job.ApplicationCloseDate?.slice(0, 10) || '',
      description: truncate(description || 'View the full federal job announcement.'),
      requiredSkills: inferSkills(text),
      relatedMajors: inferMajors(text),
      tags: ['live', 'USAJOBS', 'federal', 'student', ...inferRoleTags(job.PositionTitle)],
      applicationStep: 'Review eligibility and apply through the official USAJOBS announcement.',
      applicationUrl: job.PositionURI,
      postedDate:
        job.PublicationStartDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      compensation,
      duration: job.PositionSchedule?.map((schedule) => schedule.Name).filter(Boolean).join(', ')
    }
  })
}

export const getJobsFeed = async (forceRefresh = false): Promise<JobsFeed> => {
  if (!forceRefresh && cachedFeed && cachedFeed.expiresAt > Date.now()) {
    return cachedFeed.feed
  }

  const providers = [
    ...greenhouseBoards.map(({ token, company }) => ({
      name: `Greenhouse: ${company}`,
      fetch: () => fetchGreenhouse(token, company)
    })),
    ...leverSites.map(({ site, company }) => ({
      name: `Lever: ${company}`,
      fetch: () => fetchLever(site, company)
    })),
    ...(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT
      ? [{ name: 'USAJOBS', fetch: fetchUsaJobs }]
      : [])
  ]

  const results = await Promise.allSettled(providers.map((provider) => provider.fetch()))
  const warnings: string[] = []
  const successfulProviders: string[] = []
  const opportunities = results.flatMap((result, index) => {
    const provider = providers[index]
    if (!provider) return []
    if (result.status === 'fulfilled') {
      successfulProviders.push(provider.name)
      return result.value
    }
    warnings.push(`${provider.name} is temporarily unavailable.`)
    return []
  })

  const feed: JobsFeed = {
    opportunities,
    providers: successfulProviders,
    warnings,
    fetchedAt: new Date().toISOString()
  }
  cachedFeed = { feed, expiresAt: Date.now() + 10 * 60 * 1000 }
  return feed
}
