import { z } from 'zod'

export const syncSourceMessageSchema = z.object({
  sourceId: z.uuid()
})

export const classifyOpportunityMessageSchema = z.object({
  opportunityId: z.uuid(),
  force: z.boolean().default(false)
})

export type SyncSourceMessage = z.infer<typeof syncSourceMessageSchema>
export type ClassifyOpportunityMessage = z.infer<
  typeof classifyOpportunityMessageSchema
>
