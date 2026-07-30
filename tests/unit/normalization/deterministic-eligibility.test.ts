import { describe, expect, it } from 'vitest'
import { evaluateDeterministicEligibility } from '../../../server/ingestion/deterministic-eligibility.js'
import { inferOpportunityType } from '../../../server/ingestion/normalization-helpers.js'

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

  it('does not match intern inside unrelated words', () => {
    const result = evaluateDeterministicEligibility(
      'Mobile Engineer',
      'Internalize best practices while building production systems.'
    )
    expect(result.positiveIndicators).not.toContain('intern')
    expect(result.studentEligible).toBeNull()
  })

  it('recognizes student language used by non-technical fields', () => {
    expect(
      evaluateDeterministicEligibility(
        'Summer Finance Analyst',
        'This program is designed for undergraduate students.'
      ).studentEligible
    ).toBe(true)
    expect(
      evaluateDeterministicEligibility(
        'Clinical Externship',
        'A supervised opportunity for student nurses.'
      ).studentEligible
    ).toBe(true)
    expect(
      evaluateDeterministicEligibility(
        'Local Reporting Network Fellow',
        'Work with editors and senior newsroom leaders.'
      ).studentEligible
    ).toBe(true)
  })

  it('does not approve a senior title from a fellow keyword alone', () => {
    expect(
      evaluateDeterministicEligibility(
        'Senior Research Fellow',
        'Requires extensive professional experience.'
      ).studentEligible
    ).toBeNull()
  })

  it('normalizes fellow and fellows-program titles as fellowships', () => {
    expect(inferOpportunityType('Reporting Fellow')).toBe('FELLOWSHIP')
    expect(inferOpportunityType('Anthropic Fellows Program')).toBe('FELLOWSHIP')
  })
})
