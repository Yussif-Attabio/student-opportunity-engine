import { describe, expect, it } from 'vitest'
import { evaluateDeterministicEligibility } from '../../../server/ingestion/deterministic-eligibility.js'

describe('deterministic eligibility', () => {
  it('recognizes strong student indicators in the full posting', () => {
    const result = evaluateDeterministicEligibility(
      'Software Engineer',
      'Our early career rotational program welcomes new graduates.'
    )
    expect(result.studentEligible).toBe(true)
    expect(result.positiveIndicators).toContain('new graduate')
  })

  it('does not reject a posting from title alone', () => {
    const result = evaluateDeterministicEligibility(
      'Senior Research Program',
      'This fellowship is open to student researchers.'
    )
    expect(result.studentEligible).not.toBe(false)
  })

  it('rejects only when multiple strong negative indicators agree', () => {
    const result = evaluateDeterministicEligibility(
      'Principal Engineering Manager',
      'Requires 5+ years of experience.'
    )
    expect(result.studentEligible).toBe(false)
  })
})
