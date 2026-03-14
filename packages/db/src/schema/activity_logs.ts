import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { experiments } from './experiments.js'
import { users } from './users.js'

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  experiment_id: uuid('experiment_id')
    .notNull()
    .references(() => experiments.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  diff: jsonb('diff'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  experiment: one(experiments, {
    fields: [activityLogs.experiment_id],
    references: [experiments.id],
  }),
  user: one(users, {
    fields: [activityLogs.user_id],
    references: [users.id],
  }),
}))

export type ActivityLog = InferSelectModel<typeof activityLogs>
export type NewActivityLog = InferInsertModel<typeof activityLogs>

// Typed jsonb diff entry
export interface ActivityDiffEntry {
  field: string
  old_value: unknown
  new_value: unknown
}
