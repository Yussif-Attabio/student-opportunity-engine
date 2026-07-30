import { AshbyAdapter } from './adapters/ashby.adapter.js'
import { GreenhouseAdapter } from './adapters/greenhouse.adapter.js'
import { LeverAdapter } from './adapters/lever.adapter.js'
import { AdapterRegistry } from './adapter-registry.js'
import { AllowlistedJsonHttpClient } from './http-client.js'

export const createAdapterRegistry = (): AdapterRegistry => {
  const client = new AllowlistedJsonHttpClient()
  return new AdapterRegistry([
    new GreenhouseAdapter(client),
    new LeverAdapter(client),
    new AshbyAdapter(client)
  ])
}
