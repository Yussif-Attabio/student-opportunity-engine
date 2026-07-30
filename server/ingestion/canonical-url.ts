const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'gh_src',
  'lever-origin',
  'lever-source',
  'source',
  'ref',
  'referrer'
])

export const canonicalizeApplicationUrl = (value: string): string => {
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Application URL must use HTTP or HTTPS')
  }

  url.protocol = 'https:'
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  if (url.port === '80' || url.port === '443') url.port = ''
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')

  const retained = [...url.searchParams.entries()]
    .filter(([key]) => {
      const normalized = key.toLowerCase()
      return !normalized.startsWith('utm_') && !TRACKING_PARAMETERS.has(normalized)
    })
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      `${leftKey}=${leftValue}`.localeCompare(`${rightKey}=${rightValue}`)
    )

  url.search = ''
  for (const [key, parameterValue] of retained) {
    url.searchParams.append(key, parameterValue)
  }
  return url.toString()
}
