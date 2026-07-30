import { afterEach, describe, expect, it, vi } from 'vitest'
import { SourceFetchError } from '../../../server/ingestion/errors.js'
import { AllowlistedJsonHttpClient } from '../../../server/ingestion/http-client.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AllowlistedJsonHttpClient', () => {
  it('rejects non-provider hosts without making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const client = new AllowlistedJsonHttpClient()

    await expect(client.getJson(new URL('https://example.com/jobs'))).rejects.toBeInstanceOf(
      SourceFetchError
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects non-JSON provider responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
      )
    )
    const client = new AllowlistedJsonHttpClient()

    await expect(
      client.getJson(new URL('https://api.ashbyhq.com/posting-api/job-board/test'))
    ).rejects.toMatchObject({ retryable: false })
  })

  it('enforces the response-size limit while streaming', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ jobs: ['too large'] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
    )
    const client = new AllowlistedJsonHttpClient({ maxResponseBytes: 5 })

    await expect(
      client.getJson(new URL('https://boards-api.greenhouse.io/v1/boards/test/jobs'))
    ).rejects.toMatchObject({ retryable: false })
  })

  it('marks rate limits and server errors as retryable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('', {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '10' }
        })
      )
    )
    const client = new AllowlistedJsonHttpClient()

    await expect(
      client.getJson(new URL('https://api.lever.co/v0/postings/test'))
    ).rejects.toMatchObject({
      retryable: true,
      statusCode: 429,
      retryAfterSeconds: 10
    })
  })
})
