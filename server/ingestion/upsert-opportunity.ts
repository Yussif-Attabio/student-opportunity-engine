import { and, eq, or, sql } from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import { opportunities } from '../db/schema/opportunities.js'
import type { NormalizedOpportunity } from './contracts.js'
import { canonicalizeApplicationUrl } from './canonical-url.js'
import { evaluateDeterministicEligibility } from './deterministic-eligibility.js'
import { inferCareerField, normalizeCountry } from './opportunity-taxonomy.js'
import {
  createOpportunityContentHash,
  createOpportunityFingerprint
} from './stable-hash.js'

type Database = ReturnType<typeof getDatabase>

const AI_CLASSIFIABLE_TYPES = new Set([
  'INTERNSHIP',
  'NEW_GRAD_JOB',
  'CO_OP',
  'FELLOWSHIP',
  'SCHOLARSHIP',
  'RESEARCH',
  'APPRENTICESHIP',
  'CAMPUS_PROGRAM',
  'ROTATIONAL_PROGRAM'
])

export interface OpportunityUpsertResult {
  id: string
  outcome: 'created' | 'updated' | 'unchanged'
  duplicateDetected: boolean
  classificationRequired: boolean
}

export const upsertOpportunity = async (
  database: Database,
  normalized: NormalizedOpportunity,
  now = new Date()
): Promise<OpportunityUpsertResult> => {
  const canonicalApplicationUrl = canonicalizeApplicationUrl(normalized.applicationUrl)
  const fingerprint = createOpportunityFingerprint(normalized)
  const contentHash = createOpportunityContentHash(normalized)
  const careerField = inferCareerField(normalized)
  const country = normalizeCountry(normalized.country, normalized.locations)
  const eligibility = evaluateDeterministicEligibility(
    normalized.title,
    normalized.descriptionText
  )
  const classificationRequired =
    eligibility.positiveIndicators.length > 0 ||
    AI_CLASSIFIABLE_TYPES.has(normalized.opportunityType)

  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${fingerprint}, 0))`
    )

    const candidates = await transaction
      .select({
        id: opportunities.id,
        sourceId: opportunities.sourceId,
        externalId: opportunities.externalId,
        canonicalApplicationUrl: opportunities.canonicalApplicationUrl,
        fingerprint: opportunities.fingerprint,
        contentHash: opportunities.contentHash,
        classificationStatus: opportunities.classificationStatus
      })
      .from(opportunities)
      .where(
        or(
          and(
            eq(opportunities.sourceId, normalized.sourceId),
            eq(opportunities.externalId, normalized.externalId)
          ),
          eq(opportunities.canonicalApplicationUrl, canonicalApplicationUrl),
          eq(opportunities.fingerprint, fingerprint)
        )
      )

    const existing =
      candidates.find(
        (candidate) =>
          candidate.sourceId === normalized.sourceId &&
          candidate.externalId === normalized.externalId
      ) ??
      candidates.find(
        (candidate) => candidate.canonicalApplicationUrl === canonicalApplicationUrl
      ) ??
      candidates.find((candidate) => candidate.fingerprint === fingerprint)

    if (!existing) {
      const [created] = await transaction
        .insert(opportunities)
        .values({
          ...normalized,
          careerField,
          country,
          canonicalApplicationUrl,
          contentHash,
          fingerprint,
          studentEligible: eligibility.studentEligible,
          studentEligibilityConfidence: eligibility.confidence,
          classificationStatus: classificationRequired ? 'PENDING' : 'SKIPPED',
          firstSeenAt: now,
          lastSeenAt: now,
          lastSyncedAt: now,
          isActive: true,
          missedSuccessfulSyncs: 0
        })
        .returning({ id: opportunities.id })
      if (!created) throw new Error('Opportunity insert returned no record')
      return {
        id: created.id,
        outcome: 'created',
        duplicateDetected: false,
        classificationRequired
      }
    }

    const duplicateDetected =
      existing.sourceId !== normalized.sourceId ||
      existing.externalId !== normalized.externalId
    if (duplicateDetected) {
      await transaction
        .update(opportunities)
        .set({
          lastSyncedAt: now,
          updatedAt: now
        })
        .where(eq(opportunities.id, existing.id))
      return {
        id: existing.id,
        outcome: 'unchanged',
        duplicateDetected: true,
        classificationRequired: false
      }
    }

    if (existing.contentHash === contentHash) {
      const shouldQueueClassification =
        classificationRequired &&
        (existing.classificationStatus === 'FAILED' ||
          existing.classificationStatus === 'SKIPPED')
      await transaction
        .update(opportunities)
        .set({
          lastSeenAt: now,
          lastSyncedAt: now,
          isActive: true,
          missedSuccessfulSyncs: 0,
          studentEligible:
            existing.classificationStatus === 'SUCCEEDED'
              ? undefined
              : eligibility.studentEligible,
          studentEligibilityConfidence:
            existing.classificationStatus === 'SUCCEEDED'
              ? undefined
              : eligibility.confidence,
          classificationStatus:
            existing.classificationStatus === 'SUCCEEDED'
              ? undefined
              : shouldQueueClassification
                ? 'PENDING'
                : classificationRequired
                ? existing.classificationStatus
                : 'SKIPPED',
          rawSourceData: normalized.rawSourceData,
          careerField,
          country,
          updatedAt: now
        })
        .where(eq(opportunities.id, existing.id))
      return {
        id: existing.id,
        outcome: 'unchanged',
        duplicateDetected: false,
        classificationRequired: shouldQueueClassification
      }
    }

    await transaction
      .update(opportunities)
      .set({
        ...normalized,
        careerField,
        country,
        canonicalApplicationUrl,
        contentHash,
        fingerprint,
        studentEligible: eligibility.studentEligible,
        studentEligibilityConfidence: eligibility.confidence,
        classificationStatus: classificationRequired ? 'PENDING' : 'SKIPPED',
        classifierVersion: null,
        classifiedAt: null,
        lastSeenAt: now,
        lastSyncedAt: now,
        isActive: true,
        missedSuccessfulSyncs: 0,
        updatedAt: now
      })
      .where(eq(opportunities.id, existing.id))

    return {
      id: existing.id,
      outcome: 'updated',
      duplicateDetected: false,
      classificationRequired
    }
  })
}
