import { defaultTreeAdapter, parse, type DefaultTreeAdapterTypes } from 'parse5'

export interface JobPostingExtraction {
  jobPostings: Record<string, unknown>[]
  parseErrors: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isJobPostingType = (value: unknown) =>
  value === 'JobPosting' ||
  value === 'https://schema.org/JobPosting' ||
  value === 'http://schema.org/JobPosting'

const isJobPosting = (value: Record<string, unknown>) => {
  const type = value['@type']
  return isJobPostingType(type) ||
    (Array.isArray(type) && type.some(isJobPostingType))
}

const collectJobPostings = (
  value: unknown,
  jobPostings: Record<string, unknown>[]
) => {
  if (Array.isArray(value)) {
    for (const item of value) collectJobPostings(item, jobPostings)
    return
  }
  if (!isRecord(value)) return
  if (isJobPosting(value)) {
    jobPostings.push(value)
    return
  }
  for (const nested of Object.values(value)) {
    collectJobPostings(nested, jobPostings)
  }
}

const nodeText = (node: DefaultTreeAdapterTypes.Node): string => {
  if (defaultTreeAdapter.isTextNode(node)) return node.value
  if (!defaultTreeAdapter.isElementNode(node) &&
      node.nodeName !== '#document' &&
      node.nodeName !== '#document-fragment') {
    return ''
  }
  return node.childNodes.map(nodeText).join('')
}

const collectJsonLdScripts = (
  node: DefaultTreeAdapterTypes.Node,
  scripts: string[]
) => {
  if (defaultTreeAdapter.isElementNode(node)) {
    const type = node.attrs
      .find(({ name }) => name.toLowerCase() === 'type')
      ?.value.toLowerCase()
    if (node.tagName.toLowerCase() === 'script' && type === 'application/ld+json') {
      scripts.push(nodeText(node))
      return
    }
  }
  if (
    defaultTreeAdapter.isElementNode(node) ||
    node.nodeName === '#document' ||
    node.nodeName === '#document-fragment'
  ) {
    for (const child of node.childNodes) collectJsonLdScripts(child, scripts)
  }
}

export const extractJobPostingsFromHtml = (html: string): JobPostingExtraction => {
  const scripts: string[] = []
  collectJsonLdScripts(parse(html), scripts)

  const jobPostings: Record<string, unknown>[] = []
  const parseErrors: string[] = []
  for (const [index, script] of scripts.entries()) {
    try {
      collectJobPostings(JSON.parse(script.replace(/^\uFEFF/, '').trim()), jobPostings)
    } catch (error) {
      parseErrors.push(
        `JSON-LD script ${index + 1}: ${
          error instanceof Error ? error.message : 'invalid JSON'
        }`
      )
    }
  }
  return { jobPostings, parseErrors }
}
