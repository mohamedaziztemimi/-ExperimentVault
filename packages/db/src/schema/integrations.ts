import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['optimizely', 'slack', 'webhook'] }).notNull(),
    credentials: text('credentials').notNull(),
    last_synced_at: timestamp('last_synced_at', { withTimezone: true }),
    sync_status: text('sync_status', { enum: ['idle', 'running', 'error'] })
      .notNull()
      .default('idle'),
    error_message: text('error_message'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceTypeUnique: unique().on(t.workspace_id, t.type),
  }),
)

export const integrationsRelations = relations(integrations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [integrations.workspace_id],
    references: [workspaces.id],
  }),
}))

export type Integration = InferSelectModel<typeof integrations>
export type NewIntegration = InferInsertModel<typeof integrations>
