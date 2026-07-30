import { and, eq } from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import {
  opportunityClassifications,
  type ClassificationEvidence
} from '../db/schema/classifications.js'
import { opportunities } from '../db/schema/opportunities.js'
import { logger } from '../logging.js'
import { GroqClassificationClient } from './groq-client.js'
import { buildClassificationPrompt } from './prompt.js'
import {
  classificationResponseSchema,
  type ClassificationResponse
} from './schema.js'
import { CLASSIFICATION_PROMPT_VERSION, getClassifierVersion } from './version.js'

type Database = ReturnType<typeof getDatabase>

const flattenEvidence = (
  classification: ClassificationResponse
): ClassificationEvidence[] => {
  const fields = Object.entries(classification).filter(
    ([field]) => field !== 'studentFacingSummary'
  )
  return fields.flatMap(([field, classified]) => {
    if (
      typeof classified !== 'object' ||
      classified === null ||
      !('evidence' in classified) ||
      !Array.isArray(classified.evidence)
    ) {
      return []
    }
    return classified.evidence.map((item) => ({
      field,
      snippet: item.snippet,
      explicit: item.explicit
    }))
  })
}

export const classifyOpportunity = async (
  database: Database,
  opportunityId: string,
  client = new GroqClassificationClient(),
  force = false
): Promise<'classified' | 'skipped'> => {
  const [opportunity] = await database
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1)
  if (!opportunity) throw new Error(`Opportunity ${opportunityId} was not found`)

  const classifierVersion = getClassifierVersion()
  if (
    opportunity.classificationStatus === 'SUCCEEDED' &&
    opportunity.classifierVersion === classifierVersion &&
    !force
  ) {
    return 'skipped'
  }

  const attemptIdentity = and(
    eq(opportunityClassifications.opportunityId, opportunityId),
    eq(opportunityClassifications.classifierVersion, classifierVersion),
    eq(opportunityClassifications.contentHash, opportunity.contentHash)
  )
  const [existingAttempt] = await database
    .select()
    .from(opportunityClassifications)
    .where(attemptIdentity)
    .limit(1)
  if (existingAttempt?.status === 'SUCCEEDED' && !force) return 'skipped'
  if (existingAttempt?.status === 'IN_PROGRESS') return 'skipped'

  const startedAt = new Date()
  let attemptId = existingAttempt?.id
  if (attemptId) {
    await database
      .update(opportunityClassifications)
      .set({
        status: 'IN_PROGRESS',
        startedAt,
        completedAt: null,
        errorCode: null,
        errorMessage: null,
        updatedAt: startedAt
      })
      .where(eq(opportunityClassifications.id, attemptId))
  } else {
    const [createdAttempt] = await database
      .insert(opportunityClassifications)
      .values({
        opportunityId,
        status: 'IN_PROGRESS',
        contentHash: opportunity.contentHash,
        classifierVersion,
        promptVersion: CLASSIFICATION_PROMPT_VERSION,
        model: client.model,
        startedAt
      })
      .returning({ id: opportunityClassifications.id })
    if (!createdAttempt) throw new Error('Failed to create classification attempt')
    attemptId = createdAttempt.id
  }

  try {
    const rawResponse = await client.classify(buildClassificationPrompt(opportunity))
    const classification = classificationResponseSchema.parse(rawResponse)
    const completedAt = new Date()
    const evidence = flattenEvidence(classification)

    await database.transaction(async (transaction) => {
      await transaction
        .update(opportunityClassifications)
        .set({
          status: 'SUCCEEDED',
          confidence: classification.studentEligible.confidence,
          evidence,
          result: classification,
          rawResponse: classification,
          completedAt,
          updatedAt: completedAt
        })
        .where(eq(opportunityClassifications.id, attemptId))
      await transaction
        .update(opportunities)
        .set({
          studentEligible: classification.studentEligible.value,
          studentEligibilityConfidence: classification.studentEligible.confidence,
          opportunityType: classification.opportunityType.value,
          experienceLevel: classification.experienceLevel.value,
          educationLevels: classification.educationLevels.value,
          eligibleGraduationYears: classification.eligibleGraduationYears.value,
          majors: classification.majors.value,
          requiredSkills: classification.requiredSkills.value,
          preferredSkills: classification.preferredSkills.value,
          remoteStatus: classification.remoteStatus.value,
          sponsorshipStatus: classification.sponsorshipStatus.value,
          applicationDeadline: classification.applicationDeadline.value
            ? new Date(classification.applicationDeadline.value)
            : null,
          studentFacingSummary: classification.studentFacingSummary,
          classificationStatus: 'SUCCEEDED',
          classifierVersion,
          classifiedAt: completedAt,
          updatedAt: completedAt
        })
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.contentHash, opportunity.contentHash)
          )
        )
    })
    logger.info({ opportunityId, classifierVersion }, 'Opportunity classified')
    return 'classified'
  } catch (error) {
    const completedAt = new Date()
    const message =
      error instanceof Error ? error.message.slice(0, 2_000) : 'Classification failed'
    await database
      .update(opportunityClassifications)
      .set({
        status: 'FAILED',
        errorCode: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: message,
        completedAt,
        updatedAt: completedAt
      })
      .where(eq(opportunityClassifications.id, attemptId))
    await database
      .update(opportunities)
      .set({ classificationStatus: 'FAILED', updatedAt: completedAt })
      .where(
        and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.contentHash, opportunity.contentHash)
        )
      )
    logger.error({ opportunityId, error: message }, 'Opportunity classification failed')
    throw error
  }
}
