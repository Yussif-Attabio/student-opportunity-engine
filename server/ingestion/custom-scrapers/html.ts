import {
  defaultTreeAdapter,
  parse,
  serialize,
  type DefaultTreeAdapterTypes
} from 'parse5'

export type HtmlElement = DefaultTreeAdapterTypes.Element

const childrenOf = (node: DefaultTreeAdapterTypes.Node) =>
  defaultTreeAdapter.isElementNode(node) ||
  node.nodeName === '#document' ||
  node.nodeName === '#document-fragment'
    ? node.childNodes
    : []

export const parseHtml = (html: string) => parse(html)

export const attribute = (element: HtmlElement, name: string) =>
  element.attrs.find((item) => item.name.toLowerCase() === name.toLowerCase())
    ?.value ?? null

export const findElements = (
  node: DefaultTreeAdapterTypes.Node,
  predicate: (element: HtmlElement) => boolean
): HtmlElement[] => {
  const results: HtmlElement[] = []
  if (defaultTreeAdapter.isElementNode(node) && predicate(node)) {
    results.push(node)
  }
  for (const child of childrenOf(node)) {
    results.push(...findElements(child, predicate))
  }
  return results
}

export const firstElement = (
  node: DefaultTreeAdapterTypes.Node,
  predicate: (element: HtmlElement) => boolean
) => findElements(node, predicate)[0] ?? null

export const elementText = (node: DefaultTreeAdapterTypes.Node): string => {
  if (defaultTreeAdapter.isTextNode(node)) return node.value
  return childrenOf(node).map(elementText).join(' ').replace(/\s+/g, ' ').trim()
}

export const elementHtml = (element: HtmlElement) => serialize(element)
