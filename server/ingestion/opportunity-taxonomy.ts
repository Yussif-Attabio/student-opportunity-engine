export const careerFields = [
  'TECHNOLOGY',
  'ENGINEERING',
  'BUSINESS',
  'FINANCE_ACCOUNTING',
  'HEALTHCARE',
  'MARKETING_COMMUNICATIONS',
  'DESIGN_CREATIVE',
  'EDUCATION',
  'SCIENCE_RESEARCH',
  'LAW_GOVERNMENT_POLICY',
  'OPERATIONS_LOGISTICS',
  'HOSPITALITY',
  'SKILLED_TRADES',
  'OTHER',
  'UNKNOWN'
] as const

export type CareerField = (typeof careerFields)[number]

const contains = (text: string, pattern: RegExp) => pattern.test(text)

export const inferCareerField = (input: {
  title: string
  departments: string[]
  teams: string[]
  descriptionText: string | null
}): CareerField => {
  const primary = `${input.title} ${input.departments.join(' ')} ${input.teams.join(' ')}`
    .toLowerCase()
  const text = `${primary} ${input.descriptionText ?? ''}`.toLowerCase()

  if (
    contains(
      primary,
      /\b(software|developer|data scientist|data engineer|machine learning|cyber|information technology|it support|product manager|technical product|cloud|devops|site reliability|security engineer)\b/
    )
  ) return 'TECHNOLOGY'
  if (
    contains(
      primary,
      /\b(mechanical|civil|electrical|chemical|industrial|manufacturing|aerospace|structural|hardware|robotics|engineering)\b/
    )
  ) return 'ENGINEERING'
  if (
    contains(
      primary,
      /\b(nurs\w*|medical|clinical|health\w*|pharmac\w*|therapy|therapist|patient|dental|physician|veterinary|social work)\b/
    )
  ) return 'HEALTHCARE'
  if (
    contains(
      primary,
      /\b(finance|financial|account\w*|audit\w*|tax|banking|investment|treasury|actuari\w*|underwrit\w*)\b/
    )
  ) return 'FINANCE_ACCOUNTING'
  if (
    contains(
      primary,
      /\b(marketing|communications?|public relations|advertis\w*|brand|content|social media|journalis\w*|editorial)\b/
    )
  ) return 'MARKETING_COMMUNICATIONS'
  if (
    contains(
      primary,
      /\b(design|designer|creative|art director|animation|illustrat\w*|fashion|photograph\w*|video production|ux|user experience)\b/
    )
  ) return 'DESIGN_CREATIVE'
  if (
    contains(
      primary,
      /\b(education|teacher|teaching|school|curriculum|academic|student services|instruction|tutor|learning)\b/
    )
  ) return 'EDUCATION'
  if (
    contains(
      primary,
      /\b(research|scientist|science|laboratory|lab assistant|biology|chemist|chemistry|physics|geology|environmental)\b/
    )
  ) return 'SCIENCE_RESEARCH'
  if (
    contains(
      primary,
      /\b(legal|law|attorney|paralegal|government|public policy|policy analyst|legislative|public affairs|compliance|civil liberties|human rights|racial justice|reproductive freedom|freedom of religion)\b/
    )
  ) return 'LAW_GOVERNMENT_POLICY'
  if (
    contains(
      primary,
      /\b(operations|logistics|supply chain|procurement|warehouse|transportation|quality assurance|project coordinator)\b/
    )
  ) return 'OPERATIONS_LOGISTICS'
  if (
    contains(
      primary,
      /\b(hospitality|hotel|restaurant|food service|culinary|tourism|guest service|event planning)\b/
    )
  ) return 'HOSPITALITY'
  if (
    contains(
      primary,
      /\b(electrician|plumber|carpenter|welder|technician|mechanic|construction|machinist|hvac|maintenance)\b/
    )
  ) return 'SKILLED_TRADES'
  if (
    contains(
      primary,
      /\b(business|sales|human resources|recruit\w*|people operations|strategy|consult\w*|customer success|administrat\w*|real estate)\b/
    )
  ) return 'BUSINESS'

  return contains(text, /\b(intern|student|graduate|apprentice|fellow)\b/)
    ? 'OTHER'
    : 'UNKNOWN'
}

const countryAliases: Array<[string, RegExp]> = [
  ['United States', /\b(united states|u\.?s\.?a\.?|us)\b/i],
  ['Canada', /\bcanada\b/i],
  ['United Kingdom', /\b(united kingdom|u\.?k\.?|england|scotland|wales|northern ireland)\b/i],
  ['Australia', /\baustralia\b/i],
  ['India', /\bindia\b/i],
  ['Germany', /\bgermany\b/i],
  ['France', /\bfrance\b/i],
  ['Ireland', /\bireland\b/i],
  ['Netherlands', /\bnetherlands\b/i],
  ['Spain', /\bspain\b/i],
  ['Poland', /\bpoland\b/i],
  ['Singapore', /\bsingapore\b/i],
  ['Brazil', /\bbrazil\b/i],
  ['Mexico', /\bmexico\b/i],
  ['Rwanda', /\brwanda\b/i],
  ['Kenya', /\bkenya\b/i],
  ['Burundi', /\bburundi\b/i],
  ['Uganda', /\buganda\b/i],
  ['Malawi', /\bmalawi\b/i],
  ['Zambia', /\bzambia\b/i],
  ['Tanzania', /\btanzania\b/i],
  ['Ethiopia', /\bethiopia\b/i],
  ['Nigeria', /\bnigeria\b/i]
]

const countryCodeNames: Record<string, string> = {
  US: 'United States',
  USA: 'United States',
  CA: 'Canada',
  CAN: 'Canada',
  GB: 'United Kingdom',
  GBR: 'United Kingdom',
  UK: 'United Kingdom',
  AU: 'Australia',
  AUS: 'Australia',
  IN: 'India',
  IND: 'India',
  DE: 'Germany',
  DEU: 'Germany',
  FR: 'France',
  FRA: 'France',
  IE: 'Ireland',
  IRL: 'Ireland',
  NL: 'Netherlands',
  NLD: 'Netherlands',
  ES: 'Spain',
  ESP: 'Spain',
  PL: 'Poland',
  POL: 'Poland',
  SG: 'Singapore',
  SGP: 'Singapore',
  BR: 'Brazil',
  BRA: 'Brazil',
  MX: 'Mexico',
  MEX: 'Mexico'
}

const usStatePattern =
  /(?:,\s*|\b)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)(?:\b|$)/i
const canadianProvincePattern =
  /(?:,\s*|\b)(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)(?:\b|$)/i

export const normalizeCountry = (
  country: string | null,
  locations: string[]
): string | null => {
  const explicit = country?.trim()
  if (explicit) {
    const codeName = countryCodeNames[explicit.replace(/[^A-Za-z]/g, '').toUpperCase()]
    if (codeName) return codeName
    const alias = countryAliases.find(([, pattern]) => pattern.test(explicit))
    return alias?.[0] ?? explicit
  }

  const location = locations.join(' ')
  const alias = countryAliases.find(([, pattern]) => pattern.test(location))
  if (alias) return alias[0]
  if (usStatePattern.test(location)) return 'United States'
  if (canadianProvincePattern.test(location)) return 'Canada'
  return null
}
