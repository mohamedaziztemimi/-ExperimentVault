import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { experiments } from './experiments.js'
import { tags } from './tags.js'

export const experimentTags = pgTable(
  'experiment_tags',
  {
    experiment_id: uuid('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    tag_id: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.experiment_id, t.tag_id] }),
  }),
)

export const experimentTagsRelations = relations(experimentTags, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentTags.experiment_id],
    references: [experiments.id],
  }),
  tag: one(tags, {
    fields: [experimentTags.tag_id],
    references: [tags.id],
  }),
}))

export type ExperimentTag = InferSelectModel<typeof experimentTags>
export type NewExperimentTag = InferInsertModel<typeof experimentTags>
