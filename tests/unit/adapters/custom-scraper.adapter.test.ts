import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { CustomScraperAdapter } from '../../../server/ingestion/adapters/custom-scraper.adapter.js'
import type { CustomScraperDefinition } from '../../../server/ingestion/custom-scrapers/contracts.js'
import { CustomScraperRegistry } from '../../../server/ingestion/custom-scrapers/registry.js'
import type {
  HtmlHttpClient,
  HtmlPage
} from '../../../server/ingestion/page-http-client.js'
import { createSource } from './test-helpers.js'

const fixture = (name: string) =>
  readFile(
    fileURLToPath(
      new URL(`../../fixtures/custom-scraper/${name}`, import.meta.url)
    ),
    'utf8'
  )

const text = (html: string, className: string) =>
  html.match(new RegExp(`class="${className}"[^>]*>(?:<[^>]+>)?([^<]+)`))?.[1]?.trim() ??
  ''

const definition: CustomScraperDefinition = {
  id: 'example-careers',
  organizationName: 'Example Careers',
  listingUrl: 'https://careers.example.org/careers',
  approvedHosts: ['careers.example.org'],
  maxJobs: 10,
  crawlDelayMs: 100,
  validateListing: (html) => html.includes('class="opening"'),
  extractDetailUrls: (html, pageUrl) =>
    [...html.matchAll(/class="opening"\s+href="([^"]+)"/g)].map((match) =>
      new URL(match[1]!, pageUrl).toString()
    ),
  extractOpportunity: (html, pageUrl) => ({
    title: html.match(/<h1>([^<]+)<\/h1>/)?.[1] ?? '',
    descriptionHtml:
      html.match(/<div class="description">([\s\S]*?)<\/div>/)?.[1] ?? '',
    locations: [text(html, 'location')],
    country: text(html, 'location').includes('Canada') ? 'Canada' : 'United States',
    applicationUrl: new URL(
      html.match(/class="apply"\s+href="([^"]+)"/)?.[1] ?? pageUrl,
      pageUrl
    ).toString()
  })
}

class FixtureClient implements HtmlHttpClient {
  readonly calls: string[] = []

  constructor(private readonly pages: Map<string, HtmlPage>) {}

  async getHtml(url: URL, approvedHosts: readonly string[]) {
    this.calls.push(url.toString())
    expect(approvedHosts).toEqual(['careers.example.org'])
    const page = this.pages.get(url.toString())
    if (!page) throw new Error('Missing fixture page')
    return page
  }
}

const source = () => ({
  ...createSource('CUSTOM_SCRAPER', 'example-careers'),
  organizationName: 'Example Careers',
  careersUrl: definition.listingUrl
})

describe('CustomScraperAdapter', () => {
  it('crawls only registered approved detail pages and reuses validation results', async () => {
    const client = new FixtureClient(
      new Map([
        [
          definition.listingUrl,
          { html: await fixture('listing.html'), finalUrl: definition.listingUrl }
        ],
        [
          'https://careers.example.org/careers/jobs/finance-intern',
          {
            html: await fixture('finance-intern.html'),
            finalUrl: 'https://careers.example.org/careers/jobs/finance-intern'
          }
        ],
        [
          'https://careers.example.org/careers/jobs/policy-fellow',
          {
            html: await fixture('policy-fellow.html'),
            finalUrl: 'https://careers.example.org/careers/jobs/policy-fellow'
          }
        ]
      ])
    )
    const wait = vi.fn(async () => undefined)
    const adapter = new CustomScraperAdapter(
      client,
      new CustomScraperRegistry([definition]),
      wait
    )

    const validation = await adapter.validateSource(source())
    const raw = await adapter.fetchOpportunities(source())
    const normalized = await adapter.normalize(raw[0]!, source())

    expect(validation.valid).toBe(true)
    expect(raw).toHaveLength(2)
    expect(client.calls).toHaveLength(3)
    expect(client.calls).not.toContain('https://unapproved.example.net/job')
    expect(wait).toHaveBeenCalledOnce()
    expect(normalized.title).toBe('Finance Intern')
    expect(normalized.opportunityType).toBe('INTERNSHIP')
    expect(normalized.country).toBe('Canada')
    expect(normalized.applicationUrl).toBe(
      'https://careers.example.org/careers/jobs/finance-intern/apply'
    )
    expect(normalized.rawSourceData).not.toHaveProperty('__html')
  })

  it('rejects unregistered identifiers and listing URL changes', async () => {
    const client = new FixtureClient(new Map())
    const adapter = new CustomScraperAdapter(
      client,
      new CustomScraperRegistry([definition])
    )
    expect(
      (
        await adapter.validateSource({
          ...source(),
          sourceIdentifier: 'unknown'
        })
      ).valid
    ).toBe(false)
    expect(
      (
        await adapter.validateSource({
          ...source(),
          careersUrl: 'https://careers.example.org/other'
        })
      ).valid
    ).toBe(false)
    expect(client.calls).toHaveLength(0)
  })

  it('isolates a failed detail page for per-job failure handling', async () => {
    const client = new FixtureClient(
      new Map([
        [
          definition.listingUrl,
          { html: await fixture('listing.html'), finalUrl: definition.listingUrl }
        ],
        [
          'https://careers.example.org/careers/jobs/finance-intern',
          {
            html: await fixture('finance-intern.html'),
            finalUrl: 'https://careers.example.org/careers/jobs/finance-intern'
          }
        ]
      ])
    )
    const adapter = new CustomScraperAdapter(
      client,
      new CustomScraperRegistry([definition]),
      async () => undefined
    )

    const validation = await adapter.validateSource(source())
    const raw = await adapter.fetchOpportunities(source())

    expect(validation.valid).toBe(true)
    expect(raw).toHaveLength(2)
    await expect(adapter.normalize(raw[1]!, source())).rejects.toThrow(
      'Missing fixture page'
    )
  })

  it('accepts a recognized listing with no current student jobs', async () => {
    const emptyDefinition = {
      ...definition,
      validateListing: () => true,
      extractDetailUrls: () => []
    }
    const client = new FixtureClient(
      new Map([
        [
          definition.listingUrl,
          {
            html: '<html><title>Recognized careers</title></html>',
            finalUrl: definition.listingUrl
          }
        ]
      ])
    )
    const adapter = new CustomScraperAdapter(
      client,
      new CustomScraperRegistry([emptyDefinition])
    )

    const validation = await adapter.validateSource(source())
    const raw = await adapter.fetchOpportunities(source())

    expect(validation.valid).toBe(true)
    expect(validation.metadata?.publishedJobs).toBe(0)
    expect(raw).toEqual([])
  })

  it('rejects a listing whose registered structure is no longer recognized', async () => {
    const brokenDefinition = {
      ...definition,
      validateListing: () => false
    }
    const client = new FixtureClient(
      new Map([
        [
          definition.listingUrl,
          { html: '<html></html>', finalUrl: definition.listingUrl }
        ]
      ])
    )
    const adapter = new CustomScraperAdapter(
      client,
      new CustomScraperRegistry([brokenDefinition])
    )

    expect((await adapter.validateSource(source())).valid).toBe(false)
  })
})
