import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const adminProfiles = pgTable('admin_profiles', {
  userId: uuid('user_id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})
