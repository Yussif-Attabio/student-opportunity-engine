export class SourceFetchError extends Error {
  readonly retryable: boolean
  readonly statusCode: number | null
  readonly retryAfterSeconds: number | null

  constructor(
    message: string,
    options: {
      retryable: boolean
      statusCode?: number
      retryAfterSeconds?: number
      cause?: unknown
    }
  ) {
    super(message, { cause: options.cause })
    this.name = 'SourceFetchError'
    this.retryable = options.retryable
    this.statusCode = options.statusCode ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

export class SourceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SourceValidationError'
  }
}

export class SourceSyncAlreadyRunningError extends Error {
  constructor(sourceId: string) {
    super(`A synchronization is already running for source ${sourceId}`)
    this.name = 'SourceSyncAlreadyRunningError'
  }
}
