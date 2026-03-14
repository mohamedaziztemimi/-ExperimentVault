import { pgTable, uuid, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'

export const digestConfigs = pgTable('digest_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' })
    .unique(),
  enabled: boolean('enabled').notNull().default(true),
  send_day: integer('send_day').notNull().default(1),
  send_hour: integer('send_hour').notNull().default(8),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const digestConfigsRelations = relations(digestConfigs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [digestConfigs.workspace_id],
    references: [workspaces.id],
  }),
}))

export type DigestConfig = InferSelectModel<typeof digestConfigs>
export type NewDigestConfig = InferInsertModel<typeof digestConfigs>
