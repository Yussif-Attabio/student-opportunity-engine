import { describe, expect, it } from 'vitest'
import { countries } from '../../../src/data/countries.js'

describe('country filter options', () => {
  it('contains a complete unique alphabetical country list', () => {
    expect(countries.length).toBeGreaterThanOrEqual(195)
    expect(new Set(countries).size).toBe(countries.length)
    expect([...countries].sort((left, right) => left.localeCompare(right))).toEqual(
      countries
    )
    expect(countries).toEqual(
      expect.arrayContaining([
        'Canada',
        'Ghana',
        'India',
        'Nigeria',
        'United Kingdom',
        'United States'
      ])
    )
  })
})
