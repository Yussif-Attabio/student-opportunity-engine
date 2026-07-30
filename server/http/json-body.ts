import type { VercelRequest } from '@vercel/node'

export const parseJsonBody = (request: VercelRequest): unknown => {
  if (request.body === null || request.body === undefined || request.body === '') return {}
  if (typeof request.body === 'string') return JSON.parse(request.body) as unknown
  return request.body as unknown
}
