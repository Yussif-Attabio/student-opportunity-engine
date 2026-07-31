import { z } from 'zod'

export const sourceTypeSchema = z.enum([
  'GREENHOUSE',
  'LEVER',
  'ASHBY',
  'ADZUNA',
  'STRUCTURED_DATA',
  'CUSTOM_SCRAPER',
  'CUSTOM_API',
  'RSS',
  'MANUAL'
])

export const implementedSourceTypes = [
  'GREENHOUSE',
  'LEVER',
  'ASHBY',
  'ADZUNA',
  'STRUCTURED_DATA',
  'CUSTOM_SCRAPER'
] as const

export const isImplementedSourceType = (
  value: string
): value is (typeof implementedSourceTypes)[number] =>
  (implementedSourceTypes as readonly string[]).includes(value)

export const createSourceSchema = z.object({
  organizationName: z.string().trim().min(1).max(200),
  sourceType: sourceTypeSchema,
  sourceIdentifier: z.string().trim().min(1).max(128),
  careersUrl: z.string().url().startsWith('https://'),
  enabled: z.boolean().default(true),
  syncFrequencyMinutes: z.number().int().min(15).max(43_200).default(360),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export const updateSourceSchema = createSourceSchema.partial()

export type CreateSourceInput = z.infer<typeof createSourceSchema>
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>
