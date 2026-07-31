import type { CreateSourceInput } from '../../sources/source-input.js'

export const verifiedSeedSources: CreateSourceInput[] = [
  {
    organizationName: 'Stripe',
    sourceType: 'GREENHOUSE',
    sourceIdentifier: 'stripe',
    careersUrl: 'https://stripe.com/jobs',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  },
  {
    organizationName: 'Palantir',
    sourceType: 'LEVER',
    sourceIdentifier: 'palantir',
    careersUrl: 'https://www.palantir.com/careers/',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      region: 'GLOBAL',
      verifiedAt: '2026-07-30',
      publicApiDocumentation: 'https://github.com/lever/postings-api'
    }
  },
  {
    organizationName: 'Ashby',
    sourceType: 'ASHBY',
    sourceIdentifier: 'Ashby',
    careersUrl: 'https://www.ashbyhq.com/careers',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      publicApiDocumentation:
        'https://developers.ashbyhq.com/docs/public-job-posting-api'
    }
  },
  {
    organizationName: 'Anthropic',
    sourceType: 'GREENHOUSE',
    sourceIdentifier: 'anthropic',
    careersUrl: 'https://boards.greenhouse.io/anthropic',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      focus: ['FELLOWSHIP', 'PUBLIC_POLICY', 'RESEARCH'],
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  },
  {
    organizationName: 'One Acre Fund',
    sourceType: 'GREENHOUSE',
    sourceIdentifier: 'oneacrefund',
    careersUrl: 'https://oneacrefund.org/careers/',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      focus: ['AGRICULTURE', 'NONPROFIT', 'COMMUNICATIONS', 'OPERATIONS'],
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  },
  {
    organizationName: 'Human Rights Watch',
    sourceType: 'GREENHOUSE',
    sourceIdentifier: 'humanrightswatch',
    careersUrl: 'https://www.hrw.org/careers',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      focus: ['NONPROFIT', 'PUBLIC_POLICY', 'HUMAN_RIGHTS'],
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  },
  {
    organizationName: 'ProPublica',
    sourceType: 'GREENHOUSE',
    sourceIdentifier: 'propublica',
    careersUrl: 'https://www.propublica.org/jobs',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      focus: ['JOURNALISM', 'MEDIA', 'FELLOWSHIP'],
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  },
  {
    organizationName: 'ACLU',
    sourceType: 'GREENHOUSE',
    sourceIdentifier: 'aclu',
    careersUrl: 'https://www.aclu.org/careers/',
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      focus: ['LAW', 'PUBLIC_POLICY', 'FELLOWSHIP'],
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  },
  {
    organizationName: 'UNESCO',
    sourceType: 'CUSTOM_SCRAPER',
    sourceIdentifier: 'unesco-careers',
    careersUrl: 'https://careers.unesco.org/search/',
    enabled: true,
    syncFrequencyMinutes: 1440,
    metadata: {
      verifiedAt: '2026-07-30',
      robotsVerifiedAt: '2026-07-30',
      approvedHosts: ['careers.unesco.org'],
      focus: ['INTERNATIONAL_DEVELOPMENT', 'EDUCATION', 'CULTURE', 'SCIENCE'],
      collectionMethod: 'SITE_SPECIFIC_STATIC_HTML'
    }
  },
  ...([
    ['Airbnb', 'airbnb', 'https://careers.airbnb.com/'],
    ['Cloudflare', 'cloudflare', 'https://www.cloudflare.com/careers/'],
    ['Datadog', 'datadog', 'https://careers.datadoghq.com/'],
    ['Figma', 'figma', 'https://www.figma.com/careers/'],
    ['Gusto', 'gusto', 'https://gusto.com/about/careers'],
    ['Jane Street', 'janestreet', 'https://www.janestreet.com/join-jane-street/'],
    ['Robinhood', 'robinhood', 'https://careers.robinhood.com/'],
    ['Roblox', 'roblox', 'https://careers.roblox.com/']
  ] as const).map(([organizationName, sourceIdentifier, careersUrl]) => ({
    organizationName,
    sourceType: 'GREENHOUSE' as const,
    sourceIdentifier,
    careersUrl,
    enabled: true,
    syncFrequencyMinutes: 360,
    metadata: {
      verifiedAt: '2026-07-30',
      publicApiDocumentation: 'https://developers.greenhouse.io/job-board.html'
    }
  })),
  {
    organizationName: 'Adzuna United States Internships',
    sourceType: 'ADZUNA',
    sourceIdentifier: 'us',
    careersUrl: 'https://www.adzuna.com/',
    enabled: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    syncFrequencyMinutes: 360,
    metadata: {
      currency: 'USD',
      maxDaysOld: 30,
      maxPages: 5,
      query: 'internship',
      attributionRequired: true,
      publicApiDocumentation: 'https://developer.adzuna.com/docs/search'
    }
  }
]
