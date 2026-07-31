import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { unescoCareersScraper } from '../../../server/ingestion/custom-scrapers/unesco-careers.scraper.js'

const fixture = (name: string) =>
  readFile(
    fileURLToPath(
      new URL(`../../fixtures/custom-scraper/${name}`, import.meta.url)
    ),
    'utf8'
  )

describe('UNESCO careers scraper', () => {
  it('extracts only robots-allowed job detail paths', async () => {
    const html = await fixture('unesco-listing.html')
    expect(
      unescoCareersScraper.validateListing(
        html,
        unescoCareersScraper.listingUrl
      )
    ).toBe(true)
    const urls = unescoCareersScraper.extractDetailUrls(
      html,
      unescoCareersScraper.listingUrl
    )

    expect(urls).toEqual([
      'https://careers.unesco.org/job/Multiple-INTERNSHIP-Culture-Sector/1347730257/',
      'https://careers.unesco.org/job/Paris-INTERNSHIP-Internal-Oversight/1347780957/'
    ])
  })

  it('normalizes stable detail-page fields without following apply links', async () => {
    const opportunity = unescoCareersScraper.extractOpportunity(
      await fixture('unesco-detail.html'),
      'https://careers.unesco.org/job/Multiple-INTERNSHIP-Culture-Sector/1347730257/'
    )

    expect(opportunity.externalId).toBe('1347730257')
    expect(opportunity.title).toBe('INTERNSHIP: Culture Sector')
    expect(opportunity.descriptionText).toContain('UNESCO culture programmes')
    expect(opportunity.locations).toEqual(['Paris'])
    expect(opportunity.country).toBe('France')
    expect(opportunity.applicationDeadline).toBe('31 December 2026')
    expect(opportunity.applicationUrl).toBe(
      'https://careers.unesco.org/job/Multiple-INTERNSHIP-Culture-Sector/1347730257/'
    )
  })
})
