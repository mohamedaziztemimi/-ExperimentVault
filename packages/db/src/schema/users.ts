import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { workspaceMembers } from './workspace_members.js'
import { experiments } from './experiments.js'
import { comments } from './comments.js'
import { activityLogs } from './activity_logs.js'
import { invites } from './invites.js'
import { apiKeys } from './api_keys.js'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerk_user_id: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  workspaceMemberships: many(workspaceMembers),
  createdExperiments: many(experiments, { relationName: 'experimentCreatedBy' }),
  ownedExperiments: many(experiments, { relationName: 'experimentOwner' }),
  comments: many(comments),
  activityLogs: many(activityLogs),
  invitesSent: many(invites),
  apiKeys: many(apiKeys),
}))

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
