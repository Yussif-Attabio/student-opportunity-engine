import type { VercelRequest } from '@vercel/node'
import { z } from 'zod'

export const getUuidRouteParameter = (request: VercelRequest, name: string): string => {
  const value = request.query[name]
  const parsed = z.uuid().safeParse(Array.isArray(value) ? value[0] : value)
  if (!parsed.success) throw new Error(`Invalid ${name}`)
  return parsed.data
}
