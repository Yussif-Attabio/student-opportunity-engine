import { z } from 'zod'

const evidenceSchema = z
  .object({
    snippet: z.string().trim().min(1).max(300),
    explicit: z.boolean()
  })
  .strict()

const classifiedValue = <T extends z.ZodType>(value: T) =>
  z
    .object({
      value,
      confidence: z.number().min(0).max(1),
      evidence: z.array(evidenceSchema).max(8)
    })
    .strict()

export const classificationResponseSchema = z
  .object({
    studentEligible: classifiedValue(z.boolean().nullable()),
    opportunityType: classifiedValue(
      z.enum([
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
    ),
    experienceLevel: classifiedValue(
      z.enum([
        'STUDENT',
        'ENTRY_LEVEL',
        'NEW_GRAD',
        'MID_LEVEL',
        'SENIOR',
        'LEAD',
        'MANAGER',
        'EXECUTIVE',
        'UNKNOWN'
      ])
    ),
    educationLevels: classifiedValue(
      z.array(
        z.enum([
          'HIGH_SCHOOL',
          'ASSOCIATE',
          'BACHELOR',
          'MASTER',
          'DOCTORATE',
          'OTHER',
          'UNKNOWN'
        ])
      )
    ),
    eligibleGraduationYears: classifiedValue(
      z.array(z.number().int().min(2000).max(2200))
    ),
    majors: classifiedValue(z.array(z.string().trim().min(1).max(100)).max(30)),
    requiredSkills: classifiedValue(
      z.array(z.string().trim().min(1).max(100)).max(50)
    ),
    preferredSkills: classifiedValue(
      z.array(z.string().trim().min(1).max(100)).max(50)
    ),
    remoteStatus: classifiedValue(
      z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE', 'UNKNOWN'])
    ),
    sponsorshipStatus: classifiedValue(
      z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'RESTRICTED', 'NOT_STATED', 'UNKNOWN'])
    ),
    applicationDeadline: classifiedValue(
      z.iso.datetime({ offset: true }).nullable()
    ),
    studentFacingSummary: z.string().trim().min(1).max(500)
  })
  .strict()
  .superRefine((classification, context) => {
    if (
      classification.applicationDeadline.value &&
      !classification.applicationDeadline.evidence.some((item) => item.explicit)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['applicationDeadline', 'evidence'],
        message: 'A deadline requires explicit evidence'
      })
    }
  })

export type ClassificationResponse = z.infer<typeof classificationResponseSchema>
