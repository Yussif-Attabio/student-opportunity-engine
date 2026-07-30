import type { OpportunitySourceAdapter } from './contracts.js'

export class AdapterRegistry {
  private readonly adapters = new Map<string, OpportunitySourceAdapter>()

  constructor(adapters: OpportunitySourceAdapter[]) {
    for (const adapter of adapters) {
      if (this.adapters.has(adapter.sourceType)) {
        throw new Error(`Duplicate adapter registered for ${adapter.sourceType}`)
      }
      this.adapters.set(adapter.sourceType, adapter)
    }
  }

  get(sourceType: string): OpportunitySourceAdapter {
    const adapter = this.adapters.get(sourceType)
    if (!adapter) throw new Error(`No adapter registered for source type ${sourceType}`)
    return adapter
  }
}
