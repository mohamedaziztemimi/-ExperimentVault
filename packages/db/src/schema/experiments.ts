import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { customType } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaces } from './workspaces.js'
import { users } from './users.js'
import { comments } from './comments.js'
import { activityLogs } from './activity_logs.js'
import { experimentTags } from './experiment_tags.js'

// pgvector custom type — stores a float[] as a Postgres vector(1536)
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  fromDriver(val: string): number[] {
    // Postgres returns vectors as "[0.1,0.2,...]"
    return val
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((n) => parseFloat(n))
  },
  toDriver(val: number[]): string {
    return JSON.stringify(val)
  },
})

export const experiments = pgTable(
  'experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by: uuid('created_by')
      .notNull()
      .references(() => users.id),
    owner_id: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    name: varchar('name', { length: 500 }).notNull(),
    hypothesis: text('hypothesis'),
    status: text('status', {
      enum: ['draft', 'active', 'completed', 'stopped'],
    })
      .notNull()
      .default('draft'),
    result: text('result', {
      enum: ['WON', 'LOST', 'INCONCLUSIVE', 'STOPPED'],
    }),
    team: varchar('team', { length: 255 }),
    source: text('source', {
      enum: ['manual', 'csv', 'optimizely', 'webhook', 'api'],
    })
      .notNull()
      .default('manual'),
    external_id: varchar('external_id', { length: 255 }),
    variants: jsonb('variants'),
    metrics: jsonb('metrics'),
    winner_variant: varchar('winner_variant', { length: 255 }),
    quantitative_outcome: text('quantitative_outcome'),
    learnings: text('learnings'),
    shipped: boolean('shipped').notNull().default(false),
    started_at: timestamp('started_at', { withTimezone: true }),
    ended_at: timestamp('ended_at', { withTimezone: true }),
    embedding: vector('embedding'),
    embedding_status: text('embedding_status', {
      enum: ['pending', 'processing', 'done', 'error'],
    })
      .notNull()
      .default('pending'),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Composite unique for external dedup — enforced as partial index in migration
    workspaceExternalIdUnique: unique().on(t.workspace_id, t.external_id),
    workspaceIdIdx: index('experiments_workspace_id_idx').on(t.workspace_id),
    deletedAtIdx: index('experiments_deleted_at_idx').on(t.deleted_at),
    statusIdx: index('experiments_status_idx').on(t.status),
    resultIdx: index('experiments_result_idx').on(t.result),
    teamIdx: index('experiments_team_idx').on(t.team),
    shippedIdx: index('experiments_shipped_idx').on(t.shipped),
  }),
)

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [experiments.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [experiments.created_by],
    references: [users.id],
    relationName: 'experimentCreatedBy',
  }),
  owner: one(users, {
    fields: [experiments.owner_id],
    references: [users.id],
    relationName: 'experimentOwner',
  }),
  comments: many(comments),
  activityLogs: many(activityLogs),
  experimentTags: many(experimentTags),
}))

export type Experiment = InferSelectModel<typeof experiments>
export type NewExperiment = InferInsertModel<typeof experiments>

// Typed jsonb helpers
export interface ExperimentVariant {
  name: string
  description?: string
  is_control: boolean
}

export interface ExperimentMetric {
  name: string
  type: string
  baseline?: number
  target?: number
}
