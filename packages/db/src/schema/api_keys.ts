import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'
import { users } from './users.js'

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  key_hash: varchar('key_hash', { length: 255 }).notNull(),
  key_prefix: varchar('key_prefix', { length: 10 }).notNull(),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  created_by: uuid('created_by')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
})

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [apiKeys.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [apiKeys.created_by],
    references: [users.id],
  }),
}))

export type ApiKey = InferSelectModel<typeof apiKeys>
export type NewApiKey = InferInsertModel<typeof apiKeys>
