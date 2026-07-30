import { describe, expect, it } from 'vitest'
import { canonicalizeApplicationUrl } from '../../../server/ingestion/canonical-url.js'
import {
  createOpportunityContentHash,
  createOpportunityFingerprint
} from '../../../server/ingestion/stable-hash.js'

describe('opportunity identity', () => {
  it('removes tracking parameters and orders meaningful parameters', () => {
    expect(
      canonicalizeApplicationUrl(
        'http://JOBS.EXAMPLE.COM/role/?utm_source=email&team=eng&id=2#apply'
      )
    ).toBe('https://jobs.example.com/role?id=2&team=eng')
  })

  it('produces the same fingerprint for cosmetic text and location differences', () => {
    const first = createOpportunityFingerprint({
      organizationName: 'Example & Company',
      title: 'Software Engineer - Intern',
      locations: ['New York, NY', 'Remote'],
      opportunityType: 'INTERNSHIP'
    })
    const second = createOpportunityFingerprint({
      organizationName: ' example and company ',
      title: 'SOFTWARE ENGINEER INTERN',
      locations: ['Remote', 'New York NY'],
      opportunityType: 'INTERNSHIP'
    })
    expect(first).toBe(second)
  })

  it('changes the content hash only when material normalized content changes', () => {
    const base = {
      organizationName: 'Example',
      title: 'Intern',
      descriptionText: 'Build software',
      descriptionHtml: '<p>Build software</p>',
      opportunityType: 'INTERNSHIP',
      employmentType: 'INTERN',
      departments: ['Engineering'],
      locations: ['Remote'],
      city: null,
      state: null,
      country: null,
      remoteStatus: 'REMOTE',
      salaryMinimum: null,
      salaryMaximum: null,
      salaryCurrency: null,
      salaryPeriod: null,
      applicationUrl: 'https://example.com/job?utm_source=test',
      datePosted: null,
      applicationDeadline: null
    }
    expect(createOpportunityContentHash(base)).toBe(
      createOpportunityContentHash({
        ...base,
        applicationUrl: 'https://example.com/job?utm_campaign=other'
      })
    )
    expect(createOpportunityContentHash(base)).not.toBe(
      createOpportunityContentHash({ ...base, title: 'New Grad Engineer' })
    )
  })
})
