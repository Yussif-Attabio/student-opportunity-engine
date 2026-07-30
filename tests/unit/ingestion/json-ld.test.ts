import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractJobPostingsFromHtml } from '../../../server/ingestion/json-ld.js'

const fixturePath = fileURLToPath(
  new URL('../../fixtures/structured-data/jobs.html', import.meta.url)
)

describe('JSON-LD job extraction', () => {
  it('finds JobPosting records in nested graphs without executing page scripts', async () => {
    const html = await readFile(fixturePath, 'utf8')
    const result = extractJobPostingsFromHtml(html)

    expect(result.jobPostings).toHaveLength(1)
    expect(result.jobPostings[0]?.title).toBe('Software Engineering Intern')
    expect(result.parseErrors).toHaveLength(1)
  })

  it('supports top-level arrays and ignores unrelated structured data', () => {
    const result = extractJobPostingsFromHtml(`
      <script type="application/ld+json">
        [
          {"@type":"BreadcrumbList","name":"Careers"},
          {"@type":"JobPosting","title":"Research Fellow"}
        ]
      </script>
    `)

    expect(result.jobPostings.map(({ title }) => title)).toEqual([
      'Research Fellow'
    ])
  })

  it('recognizes absolute schema.org JobPosting type IRIs', () => {
    const result = extractJobPostingsFromHtml(`
      <script type="application/ld+json">
        {"@type":"https://schema.org/JobPosting","title":"Data Intern"}
      </script>
    `)

    expect(result.jobPostings[0]?.title).toBe('Data Intern')
  })
})
