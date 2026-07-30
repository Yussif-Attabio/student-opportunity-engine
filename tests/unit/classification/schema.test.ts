import { describe, expect, it } from 'vitest'
import { classificationResponseSchema } from '../../../server/classification/schema.js'

const field = <T>(value: T, explicit = true) => ({
  value,
  confidence: 0.9,
  evidence: [{ snippet: 'Evidence from posting', explicit }]
})

const validResponse = {
  studentEligible: field(true),
  opportunityType: field('INTERNSHIP'),
  experienceLevel: field('STUDENT'),
  educationLevels: field(['BACHELOR']),
  eligibleGraduationYears: field([2027]),
  majors: field(['Computer Science']),
  requiredSkills: field(['TypeScript']),
  preferredSkills: field([]),
  remoteStatus: field('HYBRID'),
  sponsorshipStatus: field('UNKNOWN', false),
  applicationDeadline: field('2027-01-15T23:59:00Z'),
  studentFacingSummary: 'A supported internship summary.'
}

describe('classification response schema', () => {
  it('accepts a complete evidence-backed response', () => {
    expect(classificationResponseSchema.parse(validResponse).studentEligible.value).toBe(
      true
    )
  })

  it('rejects invented deadlines without explicit evidence', () => {
    const response = {
      ...validResponse,
      applicationDeadline: field('2027-01-15T23:59:00Z', false)
    }
    expect(classificationResponseSchema.safeParse(response).success).toBe(false)
  })

  it('rejects unknown keys and invalid confidence values', () => {
    const response = {
      ...validResponse,
      studentEligible: { ...validResponse.studentEligible, confidence: 2 },
      inventedField: true
    }
    expect(classificationResponseSchema.safeParse(response).success).toBe(false)
  })
})
