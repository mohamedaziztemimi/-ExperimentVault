import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaceMembers } from './workspace_members.js'
import { experiments } from './experiments.js'
import { integrations } from './integrations.js'
import { digestConfigs } from './digest_configs.js'
import { tags } from './tags.js'
import { invites } from './invites.js'
import { apiKeys } from './api_keys.js'

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logo_url: text('logo_url'),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] })
    .notNull()
    .default('free'),
  max_experiments: integer('max_experiments').notNull().default(100),
  max_members: integer('max_members').notNull().default(5),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  members: many(workspaceMembers),
  experiments: many(experiments),
  integrations: many(integrations),
  digestConfig: one(digestConfigs, {
    fields: [workspaces.id],
    references: [digestConfigs.workspace_id],
  }),
  tags: many(tags),
  invites: many(invites),
  apiKeys: many(apiKeys),
}))

export type Workspace = InferSelectModel<typeof workspaces>
export type NewWorkspace = InferInsertModel<typeof workspaces>
