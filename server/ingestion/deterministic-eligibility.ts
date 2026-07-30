export interface DeterministicEligibility {
  studentEligible: boolean | null
  confidence: number | null
  positiveIndicators: string[]
  negativeIndicators: string[]
}

const POSITIVE_INDICATORS = [
  'intern',
  'internship',
  'co-op',
  'new graduate',
  'university graduate',
  'early career',
  'entry level',
  'apprentice',
  'fellowship',
  'student researcher',
  'campus program',
  'rotational program',
  'zero to two years',
  '0-2 years'
]

const NEGATIVE_INDICATORS = [
  'senior',
  'staff',
  'principal',
  'director',
  'manager',
  'five or more years',
  '5+ years',
  'executive',
  'vice president'
]

export const evaluateDeterministicEligibility = (
  title: string,
  descriptionText: string | null
): DeterministicEligibility => {
  const content = `${title}\n${descriptionText ?? ''}`.toLowerCase()
  const positiveIndicators = POSITIVE_INDICATORS.filter((indicator) =>
    content.includes(indicator)
  )
  const negativeIndicators = NEGATIVE_INDICATORS.filter((indicator) =>
    content.includes(indicator)
  )
  const score = positiveIndicators.length - negativeIndicators.length

  if (score >= 1 && positiveIndicators.length > negativeIndicators.length) {
    return {
      studentEligible: true,
      confidence: Math.min(0.95, 0.65 + positiveIndicators.length * 0.08),
      positiveIndicators,
      negativeIndicators
    }
  }
  if (score <= -2 && negativeIndicators.length >= 2) {
    return {
      studentEligible: false,
      confidence: Math.min(0.9, 0.6 + negativeIndicators.length * 0.08),
      positiveIndicators,
      negativeIndicators
    }
  }
  return {
    studentEligible: null,
    confidence: null,
    positiveIndicators,
    negativeIndicators
  }
}
