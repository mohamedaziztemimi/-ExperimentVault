import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'
import { experimentTags } from './experiment_tags.js'

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceNameUnique: unique().on(t.workspace_id, t.name),
  }),
)

export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspace_id],
    references: [workspaces.id],
  }),
  experimentTags: many(experimentTags),
}))

export type Tag = InferSelectModel<typeof tags>
export type NewTag = InferInsertModel<typeof tags>
