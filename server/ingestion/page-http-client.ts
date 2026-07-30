import { lookup } from 'node:dns/promises'
import { createRequire } from 'node:module'
import { BlockList, isIP, type LookupFunction } from 'node:net'
import { Agent, type Dispatcher, fetch as undiciFetch } from 'undici'
import { SourceFetchError } from './errors.js'
import { getJobSyncUserAgent } from './user-agent.js'

interface RobotsPolicy {
  isAllowed(url: string, userAgent?: string): boolean | undefined
}

const robotsParser = createRequire(import.meta.url)('robots-parser') as (
  url: string,
  robotsText: string
) => RobotsPolicy

export interface HtmlPage {
  html: string
  finalUrl: string
}

export interface HtmlHttpClient {
  getHtml(url: URL, approvedHosts: readonly string[]): Promise<HtmlPage>
}

interface ResolvedAddress {
  address: string
  family: 4 | 6
}

type HostResolver = (hostname: string) => Promise<readonly ResolvedAddress[]>
interface PinnedFetchInit {
  method: 'GET'
  redirect: 'manual'
  headers: Record<string, string>
  signal: AbortSignal
  dispatcher: Dispatcher
}

interface PageResponseBody {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>
    cancel(): Promise<void>
  }
  cancel(): Promise<void>
}

interface PageResponse {
  status: number
  statusText: string
  ok: boolean
  headers: { get(name: string): string | null }
  body: PageResponseBody | null
}

export type PageFetch = (
  input: string | URL,
  init: PinnedFetchInit
) => Promise<PageResponse>

interface PageHttpClientOptions {
  timeoutMs?: number
  maxResponseBytes?: number
  maxRobotsBytes?: number
  maxRedirects?: number
  userAgent?: string
  resolveHost?: HostResolver
  fetchRequest?: PageFetch
}

interface TextResponse {
  status: number
  contentType: string
  body: string
  finalUrl: URL
}

const blockedAddresses = new BlockList()

blockedAddresses.addSubnet('0.0.0.0', 8, 'ipv4')
blockedAddresses.addSubnet('10.0.0.0', 8, 'ipv4')
blockedAddresses.addSubnet('100.64.0.0', 10, 'ipv4')
blockedAddresses.addSubnet('127.0.0.0', 8, 'ipv4')
blockedAddresses.addSubnet('169.254.0.0', 16, 'ipv4')
blockedAddresses.addSubnet('172.16.0.0', 12, 'ipv4')
blockedAddresses.addSubnet('192.0.0.0', 24, 'ipv4')
blockedAddresses.addSubnet('192.0.2.0', 24, 'ipv4')
blockedAddresses.addSubnet('192.168.0.0', 16, 'ipv4')
blockedAddresses.addSubnet('198.18.0.0', 15, 'ipv4')
blockedAddresses.addSubnet('198.51.100.0', 24, 'ipv4')
blockedAddresses.addSubnet('203.0.113.0', 24, 'ipv4')
blockedAddresses.addSubnet('224.0.0.0', 4, 'ipv4')
blockedAddresses.addSubnet('240.0.0.0', 4, 'ipv4')
blockedAddresses.addSubnet('::', 128, 'ipv6')
blockedAddresses.addSubnet('::1', 128, 'ipv6')
blockedAddresses.addSubnet('100::', 64, 'ipv6')
blockedAddresses.addSubnet('2001:db8::', 32, 'ipv6')
blockedAddresses.addSubnet('fc00::', 7, 'ipv6')
blockedAddresses.addSubnet('fe80::', 10, 'ipv6')
blockedAddresses.addSubnet('ff00::', 8, 'ipv6')

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeHost = (value: string) => value.trim().toLowerCase().replace(/\.$/, '')

export const isPublicIpAddress = (address: string) => {
  const family = isIP(address)
  if (family === 4) return !blockedAddresses.check(address, 'ipv4')
  if (family === 6) return !blockedAddresses.check(address, 'ipv6')
  return false
}

const defaultResolver: HostResolver = async (hostname) => {
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  return addresses
    .filter(
      (item): item is typeof item & { family: 4 | 6 } =>
        item.family === 4 || item.family === 6
    )
    .map(({ address, family }) => ({ address, family }))
}

const createPinnedDispatcher = (addresses: readonly ResolvedAddress[]) => {
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    const requestedFamily =
      options.family === 4 || options.family === 6 ? options.family : 0
    const candidates = requestedFamily
      ? addresses.filter(({ family }) => family === requestedFamily)
      : addresses
    if (candidates.length === 0) {
      const error = new Error('No validated address matches the requested family')
      Object.assign(error, { code: 'ENOTFOUND' })
      callback(error, [])
      return
    }
    if (options.all) {
      callback(null, [...candidates])
      return
    }
    const selected = candidates[0]!
    callback(null, selected.address, selected.family)
  }
  return new Agent({
    connect: {
      lookup: pinnedLookup
    }
  })
}

const readLimitedBody = async (response: PageResponse, maxBytes: number) => {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new SourceFetchError(`Page response exceeded ${maxBytes} bytes`, {
      retryable: false,
      statusCode: response.status
    })
  }
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let body = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new SourceFetchError(`Page response exceeded ${maxBytes} bytes`, {
        retryable: false,
        statusCode: response.status
      })
    }
    body += decoder.decode(value, { stream: true })
  }
  return body + decoder.decode()
}

export class SafeHtmlHttpClient implements HtmlHttpClient {
  private readonly timeoutMs: number
  private readonly maxResponseBytes: number
  private readonly maxRobotsBytes: number
  private readonly maxRedirects: number
  private readonly userAgent: string
  private readonly resolveHost: HostResolver
  private readonly fetchRequest: PageFetch
  private readonly robotsCache = new Map<string, Promise<string>>()

  constructor(options: PageHttpClientOptions = {}) {
    this.timeoutMs =
      options.timeoutMs ??
      positiveInteger(process.env.SOURCE_FETCH_TIMEOUT_MS, 10_000)
    this.maxResponseBytes =
      options.maxResponseBytes ??
      positiveInteger(process.env.SOURCE_HTML_MAX_RESPONSE_BYTES, 2 * 1024 * 1024)
    this.maxRobotsBytes = options.maxRobotsBytes ?? 512 * 1024
    this.maxRedirects = options.maxRedirects ?? 3
    this.userAgent =
      options.userAgent ??
      getJobSyncUserAgent()
    this.resolveHost = options.resolveHost ?? defaultResolver
    this.fetchRequest =
      options.fetchRequest ??
      ((input, init) => undiciFetch(input, init))
  }

  async getHtml(url: URL, approvedHosts: readonly string[]): Promise<HtmlPage> {
    const hosts = new Set(approvedHosts.map(normalizeHost).filter(Boolean))
    if (hosts.size === 0) {
      throw new SourceFetchError('At least one approved page host is required', {
        retryable: false
      })
    }
    const response = await this.requestText(
      new URL(url),
      hosts,
      this.maxResponseBytes,
      this.maxRedirects,
      true
    )
    if (!response.contentType.includes('text/html') &&
        !response.contentType.includes('application/xhtml+xml')) {
      throw new SourceFetchError(
        `Career page returned unsupported content type: ${response.contentType}`,
        { retryable: false, statusCode: response.status }
      )
    }
    return { html: response.body, finalUrl: response.finalUrl.toString() }
  }

  private async requestText(
    url: URL,
    approvedHosts: ReadonlySet<string>,
    maxBytes: number,
    redirectsRemaining: number,
    enforceRobots: boolean
  ): Promise<TextResponse> {
    const addresses = await this.validateDestination(url, approvedHosts)
    if (enforceRobots) await this.assertRobotsAllowed(url, approvedHosts)

    const dispatcher = createPinnedDispatcher(addresses)
    let response: PageResponse
    try {
      response = await this.fetchRequest(url, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
          'User-Agent': this.userAgent
        },
        signal: AbortSignal.timeout(this.timeoutMs),
        dispatcher
      })
    } catch (error) {
      await dispatcher.close()
      throw new SourceFetchError(`Page request failed for ${url.hostname}`, {
        retryable: true,
        cause: error
      })
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        await dispatcher.close()
        throw new SourceFetchError('Page redirect did not include a destination', {
          retryable: false,
          statusCode: response.status
        })
      }
      if (redirectsRemaining <= 0) {
        await dispatcher.close()
        throw new SourceFetchError('Page exceeded the redirect limit', {
          retryable: false,
          statusCode: response.status
        })
      }
      await response.body?.cancel()
      await dispatcher.close()
      return this.requestText(
        new URL(location, url),
        approvedHosts,
        maxBytes,
        redirectsRemaining - 1,
        enforceRobots
      )
    }

    if (!response.ok && !(response.status === 404 && !enforceRobots)) {
      const retryAfter = Number(response.headers.get('retry-after'))
      await response.body?.cancel()
      await dispatcher.close()
      throw new SourceFetchError(
        `Page returned ${response.status} ${response.statusText}`,
        {
          retryable:
            response.status === 408 ||
            response.status === 429 ||
            response.status >= 500,
          statusCode: response.status,
          retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined
        }
      )
    }

    try {
      return {
        status: response.status,
        contentType: response.headers.get('content-type')?.toLowerCase() ?? '',
        body: response.status === 404 ? '' : await readLimitedBody(response, maxBytes),
        finalUrl: url
      }
    } finally {
      await dispatcher.close()
    }
  }

  private async validateDestination(
    url: URL,
    approvedHosts: ReadonlySet<string>
  ): Promise<readonly ResolvedAddress[]> {
    const hostname = normalizeHost(url.hostname)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      !approvedHosts.has(hostname)
    ) {
      throw new SourceFetchError(`Career page destination is not approved: ${hostname}`, {
        retryable: false
      })
    }

    let addresses: readonly ResolvedAddress[]
    try {
      addresses = await this.resolveHost(hostname)
    } catch (error) {
      throw new SourceFetchError(`Could not resolve approved page host: ${hostname}`, {
        retryable: true,
        cause: error
      })
    }
    if (
      addresses.length === 0 ||
      addresses.some(({ address }) => !isPublicIpAddress(address))
    ) {
      throw new SourceFetchError(`Career page host resolved to a non-public address`, {
        retryable: false
      })
    }
    return addresses
  }

  private async assertRobotsAllowed(
    url: URL,
    approvedHosts: ReadonlySet<string>
  ) {
    const origin = url.origin
    let robotsPromise = this.robotsCache.get(origin)
    if (!robotsPromise) {
      robotsPromise = this.requestText(
        new URL('/robots.txt', origin),
        approvedHosts,
        this.maxRobotsBytes,
        this.maxRedirects,
        false
      ).then(({ body }) => body)
      this.robotsCache.set(origin, robotsPromise)
    }

    let robotsText: string
    try {
      robotsText = await robotsPromise
    } catch (error) {
      this.robotsCache.delete(origin)
      throw error
    }
    const robots = robotsParser(`${origin}/robots.txt`, robotsText)
    if (robots.isAllowed(url.toString(), this.userAgent) === false) {
      throw new SourceFetchError('Career page is disallowed by robots.txt', {
        retryable: false
      })
    }
  }
}
