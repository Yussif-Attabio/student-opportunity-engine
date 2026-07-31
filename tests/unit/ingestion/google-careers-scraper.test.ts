import { describe, expect, it } from 'vitest'
import { googleCareersScraper } from '../../../server/ingestion/custom-scrapers/google-careers.scraper.js'

const sitemap = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://careers.google.com/jobs/results/132362676918461126-student-researcher/</loc></url>
  <url><loc>https://careers.google.com/jobs/results/135233176434811590-apprenticeship-in-application-development/</loc></url>
  <url><loc>https://careers.google.com/jobs/results/126151456276259526-senior-international-growth-consultant/</loc></url>
  <url><loc>https://careers.google.com/jobs/results/123724535613530822-internal-communications-manager/</loc></url>
  <url><loc>https://example.com/jobs/results/1-student-researcher/</loc></url>
</urlset>`

const detail = `<html><body>
<div class="DkhPwc" data-id="132362676918461126">
  <h2 class="p1N2lc">Student Researcher, BS/MS, Fall 2026</h2>
  <div class="op1BBf">
    <span class="RP7SMd">Google</span>
    <span><span class="r0wTof">Mountain View, CA, USA</span><span class="r0wTof">New York, NY, USA</span></span>
    <span class="RP7SMd">Intern &amp; Apprentice</span>
  </div>
  <div class="KwJkGe">
    <p>The application window is open until November 27, 2026.</p>
    <h3>Minimum qualifications:</h3>
    <ul><li>Currently enrolled in a degree program.</li></ul>
  </div>
</div>
</body></html>`

describe('Google careers scraper', () => {
  it('uses only exact student and apprenticeship slugs from the official sitemap', () => {
    expect(
      googleCareersScraper.validateListing(
        sitemap,
        googleCareersScraper.listingUrl
      )
    ).toBe(true)
    expect(
      googleCareersScraper.extractDetailUrls(
        sitemap,
        googleCareersScraper.listingUrl
      )
    ).toEqual([
      'https://careers.google.com/jobs/results/132362676918461126-student-researcher/',
      'https://careers.google.com/jobs/results/135233176434811590-apprenticeship-in-application-development/'
    ])
  })

  it('extracts static detail content without internal APIs or apply links', () => {
    const opportunity = googleCareersScraper.extractOpportunity(
      detail,
      'https://www.google.com/about/careers/applications/jobs/results/132362676918461126-student-researcher/'
    )

    expect(opportunity).toMatchObject({
      externalId: '132362676918461126',
      title: 'Student Researcher, BS/MS, Fall 2026',
      employmentType: 'INTERN',
      locations: ['Mountain View, CA, USA', 'New York, NY, USA'],
      country: 'United States',
      applicationDeadline: '2026-11-27T23:59:59.000Z'
    })
    expect(opportunity.descriptionText).toContain('Currently enrolled')
    expect(opportunity.applicationUrl).toContain('/jobs/results/')
  })
})
