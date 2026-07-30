import sanitizeHtml from 'sanitize-html'
import type {
  NormalizedEmploymentType,
  NormalizedOpportunityType,
  NormalizedRemoteStatus
} from './contracts.js'

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/

const decodeCodePoint = (value: string, radix: number) => {
  const codePoint = Number.parseInt(value, radix)
  return Number.isInteger(codePoint) &&
    codePoint >= 0 &&
    codePoint <= 0x10ffff &&
    (codePoint < 0xd800 || codePoint > 0xdfff)
    ? String.fromCodePoint(codePoint)
    : '\uFFFD'
}

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_match, value: string) =>
      decodeCodePoint(value, 16)
    )
    .replace(/&#([0-9]+);/g, (_match, value: string) =>
      decodeCodePoint(value, 10)
    )
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')

export const validateSourceIdentifier = (identifier: string) =>
  identifierPattern.test(identifier)

export const sanitizeDescriptionHtml = (value: string | null | undefined) => {
  if (!value) return null
  return sanitizeHtml(decodeHtmlEntities(value), {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'a'
    ],
    allowedAttributes: {
      a: ['href', 'title']
    },
    allowedSchemes: ['https', 'mailto'],
    disallowedTagsMode: 'discard'
  }).trim()
}

export const htmlToText = (value: string | null | undefined) => {
  const sanitized = sanitizeDescriptionHtml(value)
  if (!sanitized) return null
  return sanitized
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|h2|h3|h4)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const parseDate = (value: string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const inferOpportunityType = (
  title: string,
  employmentType?: string | null
): NormalizedOpportunityType => {
  const text = `${title} ${employmentType ?? ''}`.toLowerCase()
  if (/\bco[- ]?op\b/.test(text)) return 'CO_OP'
  if (/\bapprentice(?:ship)?\b/.test(text)) return 'APPRENTICESHIP'
  if (/\b(?:fellows?|fellowships?)\b/.test(text)) return 'FELLOWSHIP'
  if (/\bintern(?:ship)?\b/.test(text)) return 'INTERNSHIP'
  if (/new grad|university graduate/.test(text)) return 'NEW_GRAD_JOB'
  return 'UNKNOWN'
}

export const normalizeEmploymentType = (
  value: string | null | undefined
): NormalizedEmploymentType => {
  const normalized = value?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
  if (normalized.includes('intern')) return 'INTERN'
  if (normalized.includes('fulltime')) return 'FULL_TIME'
  if (normalized.includes('parttime')) return 'PART_TIME'
  if (normalized.includes('contract')) return 'CONTRACT'
  if (normalized.includes('temporary')) return 'TEMPORARY'
  if (normalized.includes('volunteer')) return 'VOLUNTEER'
  return 'UNKNOWN'
}

export const normalizeRemoteStatus = (
  value: string | null | undefined,
  isRemote?: boolean
): NormalizedRemoteStatus => {
  const normalized = value?.toLowerCase() ?? ''
  if (isRemote || normalized.includes('remote')) return 'REMOTE'
  if (normalized.includes('hybrid')) return 'HYBRID'
  if (normalized.includes('on-site') || normalized.includes('onsite')) return 'ONSITE'
  if (normalized.includes('flex')) return 'FLEXIBLE'
  return 'UNKNOWN'
}
