import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { experiments } from './experiments.js'
import { users } from './users.js'

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  experiment_id: uuid('experiment_id')
    .notNull()
    .references(() => experiments.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  parent_id: uuid('parent_id'),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const commentsRelations = relations(comments, ({ one, many }) => ({
  experiment: one(experiments, {
    fields: [comments.experiment_id],
    references: [experiments.id],
  }),
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parent_id],
    references: [comments.id],
    relationName: 'commentThread',
  }),
  replies: many(comments, { relationName: 'commentThread' }),
}))

export type Comment = InferSelectModel<typeof comments>
export type NewComment = InferInsertModel<typeof comments>
