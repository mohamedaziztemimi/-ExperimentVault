import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'
import { users } from './users.js'

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'editor', 'viewer'] })
      .notNull()
      .default('viewer'),
    invited_by: uuid('invited_by').references(() => users.id),
    joined_at: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceUserUnique: unique().on(t.workspace_id, t.user_id),
  }),
)

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.user_id],
    references: [users.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceMembers.invited_by],
    references: [users.id],
  }),
}))

export type WorkspaceMember = InferSelectModel<typeof workspaceMembers>
export type NewWorkspaceMember = InferInsertModel<typeof workspaceMembers>
