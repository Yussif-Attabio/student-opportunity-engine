import { describe, expect, it } from 'vitest'
import type { Opportunity, StudentProfile } from '../../../src/types.js'
import { calculateMatch, getMatchColor, getMatchLabel } from '../../../src/utils/matching.js'

const makeProfile = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  id: 'student-1',
  name: 'Jordan',
  school: 'State University',
  major: 'Computer Science',
  year: 'junior',
  interests: [],
  skills: [],
  preferredOpportunityTypes: [],
  locationPreference: 'Any',
  availability: '',
  shortTermGoal: '',
  longTermGoal: '',
  savedOpportunities: [],
  ...overrides
})

const makeOpportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: 'opp-1',
  title: 'Software Engineering Intern',
  type: 'internship',
  source: 'Acme Corp',
  location: 'Remote',
  deadline: '',
  description: '',
  requiredSkills: [],
  relatedMajors: [],
  tags: [],
  applicationStep: '',
  postedDate: '2026-07-30',
  ...overrides
})

describe('calculateMatch', () => {
  it('awards full credit and a matching reason when the opportunity type is preferred', () => {
    const profile = makeProfile({ preferredOpportunityTypes: ['internship'] })
    const opportunity = makeOpportunity({ type: 'internship' })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('internship is on your list')
  })

  it('gives only partial credit when the opportunity type is not preferred', () => {
    const withPreferredType = calculateMatch(
      makeOpportunity({ type: 'internship' }),
      makeProfile({ preferredOpportunityTypes: ['internship'] })
    )
    const withoutPreferredType = calculateMatch(
      makeOpportunity({ type: 'internship' }),
      makeProfile({ preferredOpportunityTypes: ['scholarship'] })
    )

    expect(withoutPreferredType.matchScore).toBeLessThan(withPreferredType.matchScore)
    expect(withoutPreferredType.matchReasons).not.toContain('internship is on your list')
  })

  it('matches "All Majors" opportunities regardless of the student\'s major', () => {
    const profile = makeProfile({ major: 'Biology' })
    const opportunity = makeOpportunity({ relatedMajors: ['All Majors'] })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('Great for Biology students')
  })

  it('matches a major case-insensitively', () => {
    const profile = makeProfile({ major: 'computer science' })
    const opportunity = makeOpportunity({ relatedMajors: ['Computer Science'] })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('Great for computer science students')
  })

  it('does not credit a major that is absent from relatedMajors', () => {
    const profile = makeProfile({ major: 'Biology' })
    const opportunity = makeOpportunity({ relatedMajors: ['Computer Science'] })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).not.toContain('Great for Biology students')
  })

  it('only counts exact (case-insensitive) skill matches toward the score', () => {
    const profile = makeProfile({ skills: ['Python', 'SQL'] })
    const opportunity = makeOpportunity({ requiredSkills: ['python', 'sql', 'excel'] })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('You have 2 required skills')
  })

  it('credits a resume highlight that only partially overlaps a required skill as a reason, not a skill match', () => {
    const profile = makeProfile({ skills: [] })
    const opportunity = makeOpportunity({ requiredSkills: ['python'] })

    const { matchReasons } = calculateMatch(opportunity, profile, ['python programming'])

    expect(matchReasons).toContain('Matches resume highlight: python')
    expect(matchReasons).not.toContain('You have 1 required skill')
  })

  it('counts an exact resume-highlight match as a skill match', () => {
    const profile = makeProfile({ skills: [] })
    const opportunity = makeOpportunity({ requiredSkills: ['python'] })

    const { matchReasons } = calculateMatch(opportunity, profile, ['python'])

    expect(matchReasons).toContain('You have 1 required skill')
  })

  it('matches interests against opportunity tags', () => {
    const profile = makeProfile({ interests: ['fintech'] })
    const opportunity = makeOpportunity({ tags: ['fintech', 'remote'] })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('Aligns with your interests: fintech')
  })

  it('treats "Any" as matching every location', () => {
    const profile = makeProfile({ locationPreference: 'Any' })
    const opportunity = makeOpportunity({ location: 'Berlin, Germany' })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('Located in your preferred area')
  })

  it('treats "On Campus" opportunities as always matching location', () => {
    const profile = makeProfile({ locationPreference: 'Boston' })
    const opportunity = makeOpportunity({ location: 'On Campus' })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toContain('Located in your preferred area')
  })

  it('does not match an unrelated location preference', () => {
    const profile = makeProfile({ locationPreference: 'Boston' })
    const opportunity = makeOpportunity({ location: 'Berlin, Germany' })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).not.toContain('Located in your preferred area')
  })

  it('computes an exact weighted score across matched categories', () => {
    const profile = makeProfile({
      preferredOpportunityTypes: ['internship'], // +25
      major: 'Biology', // no match: +0
      skills: ['python'], // 1 of 2 required skills: +10
      interests: ['fintech'], // 1 of 2 tags: +10
      locationPreference: 'Boston' // +15
    })
    const opportunity = makeOpportunity({
      type: 'internship',
      relatedMajors: ['Computer Science'],
      requiredSkills: ['python', 'sql'],
      tags: ['fintech', 'remote'],
      location: 'Boston, MA'
    })

    const { matchScore } = calculateMatch(opportunity, profile)

    expect(matchScore).toBe(25 + 0 + 10 + 10 + 15)
  })

  it('caps matchReasons at 3 even when more categories match', () => {
    const profile = makeProfile({
      preferredOpportunityTypes: ['internship'],
      major: 'Computer Science',
      skills: ['python'],
      interests: ['fintech'],
      locationPreference: 'Boston'
    })
    const opportunity = makeOpportunity({
      type: 'internship',
      relatedMajors: ['Computer Science'],
      requiredSkills: ['python'],
      tags: ['fintech'],
      location: 'Boston, MA'
    })

    const { matchReasons } = calculateMatch(opportunity, profile)

    expect(matchReasons).toHaveLength(3)
    expect(matchReasons).not.toContain('Located in your preferred area')
  })

  it('never returns a score above 100', () => {
    const profile = makeProfile({
      preferredOpportunityTypes: ['internship'],
      major: 'Computer Science',
      skills: ['python', 'sql'],
      interests: ['fintech', 'remote'],
      locationPreference: 'Boston'
    })
    const opportunity = makeOpportunity({
      type: 'internship',
      relatedMajors: ['Computer Science'],
      requiredSkills: ['python', 'sql'],
      tags: ['fintech', 'remote'],
      location: 'Boston, MA'
    })

    const { matchScore } = calculateMatch(opportunity, profile)

    expect(matchScore).toBeLessThanOrEqual(100)
  })
})

describe('getMatchColor', () => {
  it.each([
    [100, '#388e3c'],
    [80, '#388e3c'],
    [79, '#7cb342'],
    [60, '#7cb342'],
    [59, '#f57c00'],
    [40, '#f57c00'],
    [39, '#9ca3af'],
    [0, '#9ca3af']
  ])('returns %s color for a score of %i', (score, expectedColor) => {
    expect(getMatchColor(score)).toBe(expectedColor)
  })
})

describe('getMatchLabel', () => {
  it.each([
    [100, 'Excellent'],
    [80, 'Excellent'],
    [79, 'Good'],
    [60, 'Good'],
    [59, 'Fair'],
    [40, 'Fair'],
    [39, 'Low'],
    [0, 'Low']
  ])('returns %s label for a score of %i', (score, expectedLabel) => {
    expect(getMatchLabel(score)).toBe(expectedLabel)
  })
})
