import type { CustomScraperDefinition } from './contracts.js'
import { CustomScraperRegistry } from './registry.js'
import { unescoCareersScraper } from './unesco-careers.scraper.js'

const customScrapers: CustomScraperDefinition[] = [unescoCareersScraper]

export const createCustomScraperRegistry = () =>
  new CustomScraperRegistry(customScrapers)
