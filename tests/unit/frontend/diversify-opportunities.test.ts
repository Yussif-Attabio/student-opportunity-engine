import { describe, expect, it } from 'vitest'
import type { CareerField, Opportunity } from '../../../src/types.js'
import { diversifyOpportunities } from '../../../src/utils/diversifyOpportunities.js'

const opportunity = (
  id: string,
  careerField: CareerField,
  score: number
): Opportunity & { score: number } => ({
  id,
  careerField,
  score,
  title: id,
  type: 'internship',
  source: 'Example',
  location: 'Remote',
  deadline: '',
  description: '',
  requiredSkills: [],
  relatedMajors: [],
  tags: [],
  applicationStep: '',
  postedDate: '2026-07-30'
})

describe('diverse opportunity ordering', () => {
  it('rotates career fields while retaining score order within each field', () => {
    const input = [
      opportunity('tech-1', 'TECHNOLOGY', 90),
      opportunity('tech-2', 'TECHNOLOGY', 80),
      opportunity('tech-3', 'TECHNOLOGY', 70),
      opportunity('health-1', 'HEALTHCARE', 85),
      opportunity('finance-1', 'FINANCE_ACCOUNTING', 75)
    ]
    const scores = new Map(input.map(({ id, score }) => [id, score]))

    expect(
      diversifyOpportunities(input, (item) => scores.get(item.id) ?? 0).map(
        ({ id }) => id
      )
    ).toEqual(['tech-1', 'health-1', 'finance-1', 'tech-2', 'tech-3'])
  })
})
