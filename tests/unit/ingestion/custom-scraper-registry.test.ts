import { describe, expect, it } from 'vitest'
import type { CustomScraperDefinition } from '../../../server/ingestion/custom-scrapers/contracts.js'
import { CustomScraperRegistry } from '../../../server/ingestion/custom-scrapers/registry.js'

const definition = (
  overrides: Partial<CustomScraperDefinition> = {}
): CustomScraperDefinition => ({
  id: 'approved-careers',
  organizationName: 'Approved Careers',
  listingUrl: 'https://careers.example.org/jobs',
  approvedHosts: ['careers.example.org'],
  maxJobs: 25,
  crawlDelayMs: 250,
  validateListing: () => true,
  extractDetailUrls: () => [],
  extractOpportunity: () => ({ title: 'Intern' }),
  ...overrides
})

describe('CustomScraperRegistry', () => {
  it('registers only bounded HTTPS scraper definitions', () => {
    expect(new CustomScraperRegistry([definition()]).get('approved-careers')).not.toBeNull()
    expect(
      () =>
        new CustomScraperRegistry([
          definition({ listingUrl: 'http://careers.example.org/jobs' })
        ])
    ).toThrow('Unsafe custom scraper configuration')
    expect(
      () => new CustomScraperRegistry([definition({ maxJobs: 26 })])
    ).toThrow('Unsafe custom scraper configuration')
    expect(
      () => new CustomScraperRegistry([definition({ crawlDelayMs: 0 })])
    ).toThrow('Unsafe custom scraper configuration')
  })

  it('rejects duplicate and malformed identifiers', () => {
    expect(
      () => new CustomScraperRegistry([definition(), definition()])
    ).toThrow('Duplicate custom scraper identifier')
    expect(
      () => new CustomScraperRegistry([definition({ id: '../arbitrary' })])
    ).toThrow('Invalid custom scraper identifier')
  })
})
