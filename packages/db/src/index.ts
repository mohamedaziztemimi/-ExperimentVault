// Schema — tables, relations, and inferred types
export * from './schema/index.js'

// DB client and pool
export { db, pool } from './client.js'
export type { Db } from './client.js'

// Re-export drizzle-orm query helpers so consumers don't need a separate copy
export {
  eq,
  and,
  or,
  not,
  isNull,
  isNotNull,
  ilike,
  like,
  sql,
  count,
  asc,
  desc,
  inArray,
  notInArray,
  gte,
  lte,
  gt,
  lt,
  ne,
} from 'drizzle-orm'
export type { SQL, InferSelectModel, InferInsertModel } from 'drizzle-orm'
