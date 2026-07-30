import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isPublicIpAddress,
  SafeHtmlHttpClient,
  type PageFetch
} from '../../../server/ingestion/page-http-client.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

const publicResolver = async () => [
  { address: '93.184.216.34', family: 4 as const }
]
const mockFetchRequest: PageFetch = async (input, init) => {
  const response = await globalThis.fetch(input, init)
  const body = response.body
  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: response.headers,
    body: body
      ? {
          getReader: () => {
            const reader = body.getReader()
            return {
              read: () => reader.read(),
              cancel: () => reader.cancel()
            }
          },
          cancel: () => body.cancel()
        }
      : null
  }
}

describe('SafeHtmlHttpClient', () => {
  it('rejects private, loopback, metadata, and documentation addresses', async () => {
    expect(isPublicIpAddress('10.0.0.1')).toBe(false)
    expect(isPublicIpAddress('127.0.0.1')).toBe(false)
    expect(isPublicIpAddress('169.254.169.254')).toBe(false)
    expect(isPublicIpAddress('192.0.2.1')).toBe(false)
    expect(isPublicIpAddress('::1')).toBe(false)
    expect(isPublicIpAddress('93.184.216.34')).toBe(true)

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const client = new SafeHtmlHttpClient({
      resolveHost: async () => [{ address: '127.0.0.1', family: 4 }],
      fetchRequest: mockFetchRequest
    })

    await expect(
      client.getHtml(
        new URL('https://careers.example.com/jobs'),
        ['careers.example.com']
      )
    ).rejects.toThrow('non-public address')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('enforces robots.txt before requesting a career page', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response('User-agent: *\nDisallow: /jobs', {
        status: 200,
        headers: { 'content-type': 'text/plain' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const client = new SafeHtmlHttpClient({
      resolveHost: publicResolver,
      fetchRequest: mockFetchRequest
    })

    await expect(
      client.getHtml(
        new URL('https://careers.example.com/jobs'),
        ['careers.example.com']
      )
    ).rejects.toThrow('disallowed by robots.txt')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects redirects to hosts outside the explicit allowlist', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(
        new Response('', {
          status: 302,
          headers: { location: 'https://internal.example.net/jobs' }
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    const client = new SafeHtmlHttpClient({
      resolveHost: publicResolver,
      fetchRequest: mockFetchRequest
    })

    await expect(
      client.getHtml(
        new URL('https://careers.example.com/jobs'),
        ['careers.example.com']
      )
    ).rejects.toThrow('not approved')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('limits page size and sends an identifying User-Agent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(
        new Response('<html>too large</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    const client = new SafeHtmlHttpClient({
      resolveHost: publicResolver,
      maxResponseBytes: 5,
      userAgent: 'StudentOpportunityEngineBot/1.0',
      fetchRequest: mockFetchRequest
    })

    await expect(
      client.getHtml(
        new URL('https://careers.example.com/jobs'),
        ['careers.example.com']
      )
    ).rejects.toThrow('exceeded 5 bytes')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'User-Agent': 'StudentOpportunityEngineBot/1.0'
    })
  })

  it('returns allowed HTML after checking robots policy', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('User-agent: *\nAllow: /jobs', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        })
      )
      .mockResolvedValueOnce(
        new Response('<html>jobs</html>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
      )
    vi.stubGlobal('fetch', fetchMock)
    const client = new SafeHtmlHttpClient({
      resolveHost: publicResolver,
      fetchRequest: mockFetchRequest
    })

    await expect(
      client.getHtml(
        new URL('https://careers.example.com/jobs'),
        ['careers.example.com']
      )
    ).resolves.toMatchObject({
      html: '<html>jobs</html>',
      finalUrl: 'https://careers.example.com/jobs'
    })
  })
})
