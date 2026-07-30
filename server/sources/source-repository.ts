import { and, asc, eq, lte, or } from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import { opportunitySources } from '../db/schema/opportunity-sources.js'
import type { CreateSourceInput, UpdateSourceInput } from './source-input.js'

type Database = ReturnType<typeof getDatabase>

export class SourceRepository {
  constructor(private readonly database: Database) {}

  async create(input: CreateSourceInput) {
    const [source] = await this.database
      .insert(opportunitySources)
      .values({
        ...input,
        nextSyncAt: input.enabled ? new Date() : null,
        status: input.enabled ? 'PENDING' : 'DISABLED'
      })
      .returning()
    if (!source) throw new Error('Failed to create opportunity source')
    return source
  }

  async getById(id: string) {
    const [source] = await this.database
      .select()
      .from(opportunitySources)
      .where(eq(opportunitySources.id, id))
      .limit(1)
    return source ?? null
  }

  async list() {
    return this.database
      .select()
      .from(opportunitySources)
      .orderBy(asc(opportunitySources.organizationName))
  }

  async listDue(now = new Date(), limit = 100) {
    return this.database
      .select()
      .from(opportunitySources)
      .where(
        and(
          eq(opportunitySources.enabled, true),
          or(
            lte(opportunitySources.nextSyncAt, now),
            eq(opportunitySources.status, 'PENDING')
          )
        )
      )
      .orderBy(asc(opportunitySources.nextSyncAt))
      .limit(limit)
  }

  async update(id: string, input: UpdateSourceInput) {
    const [source] = await this.database
      .update(opportunitySources)
      .set({
        ...input,
        status: input.enabled === false ? 'DISABLED' : undefined,
        nextSyncAt: input.enabled === true ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(opportunitySources.id, id))
      .returning()
    return source ?? null
  }
}
