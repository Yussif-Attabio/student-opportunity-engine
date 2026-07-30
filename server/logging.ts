import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'authorization',
      'headers.authorization',
      'token',
      'accessToken',
      'apiKey',
      'resume',
      'descriptionText',
      'descriptionHtml',
      'rawSourceData'
    ],
    censor: '[REDACTED]'
  }
})
