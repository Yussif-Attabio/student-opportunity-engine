import { describe, expect, it } from 'vitest'
import {
  inferCareerField,
  normalizeCountry
} from '../../../server/ingestion/opportunity-taxonomy.js'

const classify = (
  title: string,
  departments: string[] = [],
  descriptionText: string | null = null
) =>
  inferCareerField({
    title,
    departments,
    teams: [],
    descriptionText
  })

describe('opportunity taxonomy', () => {
  it('distinguishes technology from other student career fields', () => {
    expect(classify('Software Engineering Intern')).toBe('TECHNOLOGY')
    expect(classify('Mechanical Engineering Intern')).toBe('ENGINEERING')
    expect(classify('Audit Intern', ['Accounting & Finance Jobs'])).toBe(
      'FINANCE_ACCOUNTING'
    )
    expect(classify('Accounting Intern')).toBe('FINANCE_ACCOUNTING')
    expect(classify('Clinical Research Intern', ['Healthcare'])).toBe('HEALTHCARE')
    expect(classify('Public Policy Fellow')).toBe('LAW_GOVERNMENT_POLICY')
    expect(classify('Fellowship, Reproductive Freedom Project')).toBe(
      'LAW_GOVERNMENT_POLICY'
    )
    expect(classify('Marketing Communications Intern')).toBe(
      'MARKETING_COMMUNICATIONS'
    )
  })

  it('normalizes explicit country codes and common location formats', () => {
    expect(normalizeCountry('US', [])).toBe('United States')
    expect(normalizeCountry('U.S.', [])).toBe('United States')
    expect(normalizeCountry('FR', [])).toBe('France')
    expect(normalizeCountry(null, ['Toronto, ON'])).toBe('Canada')
    expect(normalizeCountry(null, ['New York, NY'])).toBe('United States')
    expect(normalizeCountry(null, ['London, England'])).toBe('United Kingdom')
    expect(normalizeCountry(null, ['Kigali, Rwanda'])).toBe('Rwanda')
    expect(normalizeCountry(null, ['Remote'])).toBeNull()
  })
})
