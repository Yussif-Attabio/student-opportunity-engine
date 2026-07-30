import { SourceFetchError } from './errors.js'

export interface JsonHttpClient {
  getJson<T>(url: URL): Promise<T>
}

const allowedProviderHosts = new Set([
  'boards-api.greenhouse.io',
  'api.lever.co',
  'api.eu.lever.co',
  'api.ashbyhq.com'
])

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const readLimitedBody = async (response: Response, maxBytes: number) => {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new SourceFetchError(`Provider response exceeded ${maxBytes} bytes`, {
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
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new SourceFetchError(`Provider response exceeded ${maxBytes} bytes`, {
        retryable: false,
        statusCode: response.status
      })
    }
    body += decoder.decode(value, { stream: true })
  }

  return body + decoder.decode()
}

export class AllowlistedJsonHttpClient implements JsonHttpClient {
  private readonly timeoutMs: number
  private readonly maxResponseBytes: number

  constructor(options: { timeoutMs?: number; maxResponseBytes?: number } = {}) {
    this.timeoutMs =
      options.timeoutMs ??
      parsePositiveInteger(process.env.SOURCE_FETCH_TIMEOUT_MS, 10_000)
    this.maxResponseBytes =
      options.maxResponseBytes ??
      parsePositiveInteger(process.env.SOURCE_MAX_RESPONSE_BYTES, 10 * 1024 * 1024)
  }

  async getJson<T>(url: URL): Promise<T> {
    if (url.protocol !== 'https:' || !allowedProviderHosts.has(url.hostname)) {
      throw new SourceFetchError(`Provider host is not allowlisted: ${url.hostname}`, {
        retryable: false
      })
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs)
      })
    } catch (error) {
      throw new SourceFetchError(`Provider request failed for ${url.hostname}`, {
        retryable: true,
        cause: error
      })
    }

    if (!response.ok) {
      const retryAfter = Number(response.headers.get('retry-after'))
      throw new SourceFetchError(
        `Provider returned ${response.status} ${response.statusText}`,
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

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('application/json')) {
      throw new SourceFetchError(`Provider returned unsupported content type: ${contentType}`, {
        retryable: false,
        statusCode: response.status
      })
    }

    const body = await readLimitedBody(response, this.maxResponseBytes)
    try {
      return JSON.parse(body) as T
    } catch (error) {
      throw new SourceFetchError('Provider returned invalid JSON', {
        retryable: false,
        statusCode: response.status,
        cause: error
      })
    }
  }
}
