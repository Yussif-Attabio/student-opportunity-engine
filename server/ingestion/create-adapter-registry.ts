import { AshbyAdapter } from './adapters/ashby.adapter.js'
import { AdzunaAdapter } from './adapters/adzuna.adapter.js'
import { GreenhouseAdapter } from './adapters/greenhouse.adapter.js'
import { LeverAdapter } from './adapters/lever.adapter.js'
import { StructuredDataAdapter } from './adapters/structured-data.adapter.js'
import { CustomScraperAdapter } from './adapters/custom-scraper.adapter.js'
import { AdapterRegistry } from './adapter-registry.js'
import { createCustomScraperRegistry } from './custom-scrapers/index.js'
import { AllowlistedJsonHttpClient } from './http-client.js'
import { SafeHtmlHttpClient } from './page-http-client.js'

export const createAdapterRegistry = (): AdapterRegistry => {
  const client = new AllowlistedJsonHttpClient()
  return new AdapterRegistry([
    new GreenhouseAdapter(client),
    new LeverAdapter(client),
    new AshbyAdapter(client),
    new AdzunaAdapter(client),
    new StructuredDataAdapter(new SafeHtmlHttpClient()),
    new CustomScraperAdapter(
      new SafeHtmlHttpClient(),
      createCustomScraperRegistry()
    )
  ])
}
