export interface DeterministicEligibility {
  studentEligible: boolean | null
  confidence: number | null
  positiveIndicators: string[]
  negativeIndicators: string[]
}

const POSITIVE_INDICATORS = [
  { label: 'intern', pattern: /\bintern\b/i },
  { label: 'internship', pattern: /\binternship\b/i },
  { label: 'co-op', pattern: /\bco[- ]op\b/i },
  { label: 'new graduate', pattern: /\bnew graduates?\b/i },
  { label: 'university graduate', pattern: /\buniversity graduates?\b/i },
  { label: 'early career', pattern: /\bearly[- ]career\b/i },
  { label: 'entry level', pattern: /\bentry[- ]level\b/i },
  { label: 'apprentice', pattern: /\bapprentice(?:ship)?\b/i },
  { label: 'fellowship', pattern: /\bfellowship\b/i },
  { label: 'student researcher', pattern: /\bstudent researchers?\b/i },
  { label: 'campus program', pattern: /\bcampus program\b/i },
  { label: 'rotational program', pattern: /\brotational program\b/i },
  { label: 'zero to two years', pattern: /\bzero to two years\b/i },
  { label: '0-2 years', pattern: /\b0\s*(?:-|–|to)\s*2 years\b/i }
]

const NEGATIVE_INDICATORS = [
  { label: 'senior', pattern: /\bsenior\b/i },
  { label: 'staff', pattern: /\bstaff\b/i },
  { label: 'principal', pattern: /\bprincipal\b/i },
  { label: 'director', pattern: /\bdirector\b/i },
  { label: 'manager', pattern: /\bmanagers?\b/i },
  { label: 'five or more years', pattern: /\bfive or more years\b/i },
  { label: '5+ years', pattern: /\b5\+ years\b/i },
  { label: 'executive', pattern: /\bexecutive\b/i },
  { label: 'vice president', pattern: /\bvice president\b/i }
]

export const evaluateDeterministicEligibility = (
  title: string,
  descriptionText: string | null
): DeterministicEligibility => {
  const content = `${title}\n${descriptionText ?? ''}`
  const positiveIndicators = POSITIVE_INDICATORS.filter(({ pattern }) =>
    pattern.test(content)
  ).map(({ label }) => label)
  const negativeIndicators = NEGATIVE_INDICATORS.filter(({ pattern }) =>
    pattern.test(content)
  ).map(({ label }) => label)
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
