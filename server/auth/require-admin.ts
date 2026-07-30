import { and, eq } from 'drizzle-orm'
import type { getDatabase } from '../db/client.js'
import { adminProfiles } from '../db/schema/admin-profiles.js'
import { verifySessionToken } from './verify-session.js'

type Database = ReturnType<typeof getDatabase>

export const requireAdmin = async (
  database: Database,
  authorization: string | undefined
) => {
  const user = await verifySessionToken(authorization)
  const [admin] = await database
    .select()
    .from(adminProfiles)
    .where(and(eq(adminProfiles.userId, user.id), eq(adminProfiles.active, true)))
    .limit(1)
  if (!admin) throw new Error('Administrator access is required')
  return { user, admin }
}
