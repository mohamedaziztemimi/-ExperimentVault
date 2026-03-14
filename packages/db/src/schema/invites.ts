import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'
import { users } from './users.js'

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  invited_by: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] })
    .notNull()
    .default('viewer'),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  accepted_at: timestamp('accepted_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const invitesRelations = relations(invites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [invites.workspace_id],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [invites.invited_by],
    references: [users.id],
  }),
}))

export type Invite = InferSelectModel<typeof invites>
export type NewInvite = InferInsertModel<typeof invites>
