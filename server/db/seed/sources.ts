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
