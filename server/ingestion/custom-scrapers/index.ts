import type { CustomScraperDefinition } from './contracts.js'
import { googleCareersScraper } from './google-careers.scraper.js'
import { CustomScraperRegistry } from './registry.js'
import { unescoCareersScraper } from './unesco-careers.scraper.js'

const customScrapers: CustomScraperDefinition[] = [
  googleCareersScraper,
  unescoCareersScraper
]

export const createCustomScraperRegistry = () =>
  new CustomScraperRegistry(customScrapers)
