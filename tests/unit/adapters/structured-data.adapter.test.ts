import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { StructuredDataAdapter } from '../../../server/ingestion/adapters/structured-data.adapter.js'
import type {
  HtmlHttpClient,
  HtmlPage
} from '../../../server/ingestion/page-http-client.js'
import { createSource } from './test-helpers.js'

const fixturePath = fileURLToPath(
  new URL('../../fixtures/structured-data/jobs.html', import.meta.url)
)

class MockHtmlHttpClient implements HtmlHttpClient {
  readonly calls: Array<{ url: URL; approvedHosts: readonly string[] }> = []

  constructor(private readonly page: HtmlPage) {}

  async getHtml(url: URL, approvedHosts: readonly string[]) {
    this.calls.push({ url, approvedHosts })
    return this.page
  }
}

describe('StructuredDataAdapter', () => {
  it('normalizes supported JobPosting fields and sanitizes descriptions', async () => {
    const html = await readFile(fixturePath, 'utf8')
    const client = new MockHtmlHttpClient({
      html,
      finalUrl: 'https://careers.example.com/jobs'
    })
    const adapter = new StructuredDataAdapter(client)
    const source = {
      ...createSource('STRUCTURED_DATA', 'careers.example.com'),
      organizationName: 'Example Labs',
      careersUrl: 'https://careers.example.com/jobs'
    }

    const validation = await adapter.validateSource(source)
    const raw = await adapter.fetchOpportunities(source)
    const normalized = await adapter.normalize(raw[0]!, source)

    expect(validation.valid).toBe(true)
    expect(raw).toHaveLength(1)
    expect(normalized.externalId).toBe('structured-123')
    expect(normalized.organizationName).toBe('Example Labs')
    expect(normalized.descriptionHtml).not.toContain('script')
    expect(normalized.descriptionHtml).not.toContain('onerror')
    expect(normalized.opportunityType).toBe('INTERNSHIP')
    expect(normalized.employmentType).toBe('INTERN')
    expect(normalized.remoteStatus).toBe('REMOTE')
    expect(normalized.locations).toContain('Seattle, WA, US')
    expect(normalized.salaryMinimum).toBe('25')
    expect(normalized.salaryPeriod).toBe('HOUR')
    expect(normalized.applicationUrl).toBe(
      'https://careers.example.com/jobs/software-engineering-intern'
    )
    expect(client.calls[0]?.approvedHosts).toEqual(['careers.example.com'])
    expect(client.calls).toHaveLength(1)
  })

  it('rejects source identifiers that do not match the careers host', async () => {
    const client = new MockHtmlHttpClient({
      html: '',
      finalUrl: 'https://careers.example.com/jobs'
    })
    const adapter = new StructuredDataAdapter(client)
    const source = {
      ...createSource('STRUCTURED_DATA', 'other.example.com'),
      careersUrl: 'https://careers.example.com/jobs'
    }

    expect((await adapter.validateSource(source)).valid).toBe(false)
    expect(client.calls).toHaveLength(0)
  })

  it('leaves malformed JobPosting records for per-job normalization failure handling', async () => {
    const client = new MockHtmlHttpClient({
      html: `
        <script type="application/ld+json">
          [
            {"@type":"JobPosting","title":"Valid Intern","url":"/valid"},
            {"@type":"JobPosting","description":"Missing title","url":"/invalid"}
          ]
        </script>
      `,
      finalUrl: 'https://careers.example.com/jobs'
    })
    const adapter = new StructuredDataAdapter(client)
    const source = {
      ...createSource('STRUCTURED_DATA', 'careers.example.com'),
      careersUrl: 'https://careers.example.com/jobs'
    }

    const raw = await adapter.fetchOpportunities(source)

    expect(raw).toHaveLength(2)
    await expect(adapter.normalize(raw[1]!, source)).rejects.toThrow()
  })
})
