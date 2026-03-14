import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const uuidSchema = z.string().uuid()

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export const createExperimentSchema = z.object({
  name: z.string().min(1).max(500),
  hypothesis: z.string().optional(),
  team: z.string().max(255).optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  variants: z.array(z.any()).optional(),
  metrics: z.array(z.any()).optional(),
  result: z.enum(['WON', 'LOST', 'INCONCLUSIVE', 'STOPPED']).optional(),
  winner_variant: z.string().max(255).optional(),
  quantitative_outcome: z.string().optional(),
  learnings: z.string().optional(),
  shipped: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'completed', 'stopped']).default('draft'),
  tags: z.array(z.string()).optional(),
})

export const updateExperimentSchema = createExperimentSchema.partial()

export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z
    .object({
      result: z.enum(['WON', 'LOST', 'INCONCLUSIVE', 'STOPPED']).optional(),
      team: z.string().optional(),
      shipped: z.boolean().optional(),
      source: z.enum(['manual', 'csv', 'optimizely', 'webhook', 'api']).optional(),
      date_from: z.string().datetime().optional(),
      date_to: z.string().datetime().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
})

export type PaginationInput = z.infer<typeof paginationSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type CreateExperimentInput = z.infer<typeof createExperimentSchema>
export type UpdateExperimentInput = z.infer<typeof updateExperimentSchema>
export type SearchInput = z.infer<typeof searchSchema>
