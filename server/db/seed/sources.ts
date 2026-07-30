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
  }
]
