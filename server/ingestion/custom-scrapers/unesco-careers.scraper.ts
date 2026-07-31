import { htmlToText } from '../normalization-helpers.js'
import type { CustomScraperDefinition } from './contracts.js'
import {
  attribute,
  elementHtml,
  elementText,
  firstElement,
  findElements,
  parseHtml
} from './html.js'

const detailPathPattern = /^\/job\/[^?#]+\/\d+\/?$/
const studentTitlePattern =
  /\b(intern(?:ship)?|fellows?|fellowship|apprentice(?:ship)?|graduate|student)\b/i

const lineValue = (text: string, label: string) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.match(
    new RegExp(`${escaped}(?:\\s*\\([^)]*\\))?\\s*:\\s*([^\\n]+)`, 'i')
  )?.[1]?.trim() ?? null
}

const normalizedDeadline = (value: string | null) =>
  value
    ?.replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim() || null

const countryForDutyStation = (value: string | null) => {
  if (!value) return null
  if (/\bparis\b/i.test(value)) return 'France'
  return null
}

export const unescoCareersScraper: CustomScraperDefinition = {
  id: 'unesco-careers',
  organizationName: 'UNESCO',
  listingUrl: 'https://careers.unesco.org/search/',
  approvedHosts: ['careers.unesco.org'],
  maxJobs: 25,
  crawlDelayMs: 250,

  validateListing(html, pageUrl) {
    if (new URL(pageUrl).pathname !== '/search/') return false
    const document = parseHtml(html)
    const title = firstElement(document, (element) => element.tagName === 'title')
    return title ? elementText(title).trim() === 'UNESCO Jobs' : false
  },

  extractDetailUrls(html, pageUrl) {
    return findElements(
      parseHtml(html),
      (element) =>
        element.tagName === 'a' && studentTitlePattern.test(elementText(element))
    )
      .map((element) => attribute(element, 'href'))
      .filter((href): href is string => Boolean(href))
      .flatMap((href) => {
        try {
          const url = new URL(href, pageUrl)
          return detailPathPattern.test(url.pathname) && !url.search ? [url.toString()] : []
        } catch {
          return []
        }
      })
  },

  extractOpportunity(html, pageUrl) {
    const document = parseHtml(html)
    const titleElement = firstElement(
      document,
      (element) => attribute(element, 'itemprop') === 'title'
    )
    const descriptionElement = firstElement(
      document,
      (element) => attribute(element, 'itemprop') === 'description'
    )
    const descriptionHtml = descriptionElement
      ? elementHtml(descriptionElement)
      : null
    const descriptionText = htmlToText(descriptionHtml)
    const title = titleElement ? elementText(titleElement) : ''
    const dutyStation = lineValue(descriptionText ?? '', 'Duty Station')
    const deadline = normalizedDeadline(
      lineValue(descriptionText ?? '', 'Application deadline')
    )
    const externalId = new URL(pageUrl).pathname.match(/\/(\d+)\/?$/)?.[1]

    return {
      externalId,
      title,
      descriptionHtml,
      descriptionText,
      employmentType: /\bintern(?:ship)?\b/i.test(title) ? 'INTERN' : 'UNKNOWN',
      departments: ['International Development'],
      locations: dutyStation ? [dutyStation] : [],
      country: countryForDutyStation(dutyStation),
      remoteStatus: 'UNKNOWN',
      applicationUrl: pageUrl,
      applicationDeadline: deadline
    }
  }
}
