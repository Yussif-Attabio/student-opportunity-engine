import type { CustomScraperDefinition } from './contracts.js'

const identifierPattern = /^[a-z0-9][a-z0-9-]{0,63}$/

export class CustomScraperRegistry {
  private readonly definitions = new Map<string, CustomScraperDefinition>()

  constructor(definitions: readonly CustomScraperDefinition[]) {
    for (const definition of definitions) {
      if (!identifierPattern.test(definition.id)) {
        throw new Error(`Invalid custom scraper identifier: ${definition.id}`)
      }
      if (this.definitions.has(definition.id)) {
        throw new Error(`Duplicate custom scraper identifier: ${definition.id}`)
      }
      const listingUrl = new URL(definition.listingUrl)
      const approvedHosts = new Set(
        definition.approvedHosts.map((host) => host.toLowerCase())
      )
      if (
        listingUrl.protocol !== 'https:' ||
        !approvedHosts.has(listingUrl.hostname.toLowerCase()) ||
        definition.maxJobs < 1 ||
        definition.maxJobs > 25 ||
        definition.crawlDelayMs < 100
      ) {
        throw new Error(`Unsafe custom scraper configuration: ${definition.id}`)
      }
      this.definitions.set(definition.id, {
        ...definition,
        listingUrl: listingUrl.toString(),
        approvedHosts: [...approvedHosts]
      })
    }
  }

  get(identifier: string) {
    return this.definitions.get(identifier) ?? null
  }
}
