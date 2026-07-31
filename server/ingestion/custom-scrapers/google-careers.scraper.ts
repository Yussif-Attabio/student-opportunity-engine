import { htmlToText } from '../normalization-helpers.js'
import type { CustomScraperDefinition } from './contracts.js'
import {
  attribute,
  elementHtml,
  elementText,
  firstElement,
  findElements,
  parseHtml,
  type HtmlElement
} from './html.js'

const detailPathPattern = /^\/jobs\/results\/(\d+)-[a-z0-9-]+\/?$/
const studentSlugPattern =
  /(?:^|-)(?:intern|internship|student|apprentice|apprenticeship|new-grad|graduate)(?:-|$)/i
const approvedDetailHosts = new Set(['careers.google.com', 'www.google.com'])

const hasClass = (element: HtmlElement, className: string) =>
  (attribute(element, 'class') ?? '').split(/\s+/).includes(className)

const decodeXmlText = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

const isApprovedDetailUrl = (url: URL) =>
  approvedDetailHosts.has(url.hostname.toLowerCase()) &&
  detailPathPattern.test(url.pathname) &&
  studentSlugPattern.test(url.pathname)

const applicationDeadline = (description: string) => {
  const value = description.match(
    /application window is open until ([A-Z][a-z]+ \d{1,2}, \d{4})/i
  )?.[1]
  if (!value) return null
  const parsed = new Date(`${value} 23:59:59 UTC`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const countryForLocations = (locations: readonly string[]) => {
  if (locations.some((location) => /,\s*USA$/i.test(location))) {
    return 'United States'
  }
  if (locations.some((location) => /,\s*Canada$/i.test(location))) {
    return 'Canada'
  }
  if (locations.some((location) => /,\s*Switzerland$/i.test(location))) {
    return 'Switzerland'
  }
  return null
}

export const googleCareersScraper: CustomScraperDefinition = {
  id: 'google-careers-sitemap',
  organizationName: 'Google',
  listingUrl:
    'https://www.google.com/about/careers/applications/jobs/sitemap.xml',
  listingFormat: 'XML',
  approvedHosts: ['www.google.com', 'careers.google.com'],
  maxJobs: 25,
  crawlDelayMs: 500,

  validateListing(xml, pageUrl) {
    const url = new URL(pageUrl)
    return (
      url.hostname === 'www.google.com' &&
      url.pathname === '/about/careers/applications/jobs/sitemap.xml' &&
      /<urlset(?:\s|>)/i.test(xml)
    )
  },

  extractDetailUrls(xml) {
    const urls: string[] = []
    for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
      try {
        const url = new URL(decodeXmlText(match[1]!))
        if (isApprovedDetailUrl(url)) urls.push(url.toString())
      } catch {
        continue
      }
    }
    return urls
  },

  extractOpportunity(html, pageUrl) {
    const page = new URL(pageUrl)
    const externalId = page.pathname.match(
      /^\/about\/careers\/applications\/jobs\/results\/(\d+)-/
    )?.[1]
    const document = parseHtml(html)
    const jobRoot = firstElement(
      document,
      (element) =>
        hasClass(element, 'DkhPwc') &&
        (!externalId || attribute(element, 'data-id') === externalId)
    )
    if (!jobRoot) return { title: '' }

    const titleElement = firstElement(jobRoot, (element) =>
      hasClass(element, 'p1N2lc')
    )
    const descriptionElement = firstElement(jobRoot, (element) =>
      hasClass(element, 'KwJkGe')
    )
    const locationElements = findElements(jobRoot, (element) =>
      hasClass(element, 'r0wTof')
    )
    const locations = locationElements
      .map((element) => elementText(element).replace(/^;\s*/, ''))
      .filter(Boolean)
    const category = findElements(jobRoot, (element) =>
      hasClass(element, 'RP7SMd')
    )
      .map(elementText)
      .find((value) => /intern|apprentice|student/i.test(value))
    const descriptionHtml = descriptionElement
      ? elementHtml(descriptionElement)
      : null
    const descriptionText = htmlToText(descriptionHtml)

    return {
      externalId,
      title: titleElement ? elementText(titleElement) : '',
      descriptionHtml,
      descriptionText,
      employmentType: /\bapprentice(?:ship)?\b/i.test(
        titleElement ? elementText(titleElement) : ''
      )
        ? 'UNKNOWN'
        : 'INTERN',
      teams: category ? [category] : [],
      locations,
      country: countryForLocations(locations),
      remoteStatus: 'UNKNOWN',
      applicationUrl: pageUrl,
      applicationDeadline: applicationDeadline(descriptionText ?? '')
    }
  }
}
