import { z } from 'zod'
import { careerFields } from '../ingestion/opportunity-taxonomy.js'

const singleQueryValue = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().optional()
)

const optionalInteger = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.coerce.number().int().min(minimum).max(maximum).optional()
  )

export const opportunityFiltersSchema = z.object({
  keyword: singleQueryValue,
  opportunityType: singleQueryValue.pipe(
    z
      .enum([
        'INTERNSHIP',
        'NEW_GRAD_JOB',
        'CO_OP',
        'FELLOWSHIP',
        'SCHOLARSHIP',
        'RESEARCH',
        'APPRENTICESHIP',
        'CAMPUS_PROGRAM',
        'ROTATIONAL_PROGRAM',
        'JOB',
        'UNKNOWN'
      ])
      .optional()
  ),
  company: singleQueryValue,
  location: singleQueryValue,
  country: singleQueryValue.pipe(z.string().trim().min(1).max(100).optional()),
  careerField: singleQueryValue.pipe(z.enum(careerFields).optional()),
  remoteStatus: singleQueryValue.pipe(
    z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE', 'UNKNOWN']).optional()
  ),
  major: singleQueryValue,
  graduationYear: optionalInteger(2000, 2200),
  skills: singleQueryValue.transform((value) =>
    value
      ? value
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
      : []
  ),
  datePostedAfter: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.coerce.date().optional()
  ),
  studentEligible: singleQueryValue.pipe(z.enum(['true', 'false']).optional()),
  sponsorshipStatus: singleQueryValue.pipe(
    z
      .enum(['AVAILABLE', 'NOT_AVAILABLE', 'RESTRICTED', 'NOT_STATED', 'UNKNOWN'])
      .optional()
  ),
  cursor: singleQueryValue,
  limit: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.coerce.number().int().min(1).max(100).default(25)
  )
})

export type OpportunityFilters = z.infer<typeof opportunityFiltersSchema>
