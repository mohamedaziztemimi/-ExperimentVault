import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, experiments } from '@ev/db'
import { eq, and, isNull, ilike, count, sql } from '@ev/db'
import { requireRole } from '../plugins/rbac.js'
import { logActivity } from '../lib/activity.js'

const listExperimentsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  result: z.enum(['WON', 'LOST', 'INCONCLUSIVE', 'STOPPED']).optional(),
  team: z.string().optional(),
  shipped: z
    .string()
    .transform((v) => v === 'true')
    .pipe(z.boolean())
    .optional(),
  status: z.string().optional(),
  search: z.string().optional(),
})

const experimentFields = z.object({
  name: z.string().min(1).max(500),
  hypothesis: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'stopped']).optional(),
  result: z.enum(['WON', 'LOST', 'INCONCLUSIVE', 'STOPPED']).optional(),
  team: z.string().max(255).optional(),
  source: z.enum(['manual', 'csv', 'optimizely', 'webhook', 'api']).optional(),
  external_id: z.string().max(255).optional(),
  variants: z.unknown().optional(),
  metrics: z.unknown().optional(),
  winner_variant: z.string().max(255).optional(),
  quantitative_outcome: z.string().optional(),
  learnings: z.string().optional(),
  shipped: z.boolean().optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
})

const createExperimentBody = experimentFields
const updateExperimentBody = experimentFields.partial()

export async function experimentRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/experiments — list experiments
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const parseResult = listExperimentsQuery.safeParse(request.query)

      if (!parseResult.success) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join(', '),
          },
        })
      }

      const { page, limit, result, team, shipped, status, search } = parseResult.data
      const offset = (page - 1) * limit
      const workspaceId = request.user.workspaceId

      // Build filter conditions
      const conditions = [eq(experiments.workspace_id, workspaceId), isNull(experiments.deleted_at)]

      if (result !== undefined) {
        conditions.push(eq(experiments.result, result))
      }
      if (team !== undefined) {
        conditions.push(eq(experiments.team, team))
      }
      if (shipped !== undefined) {
        conditions.push(eq(experiments.shipped, shipped))
      }
      if (status !== undefined) {
        conditions.push(
          eq(experiments.status, status as 'draft' | 'active' | 'completed' | 'stopped'),
        )
      }
      if (search !== undefined) {
        conditions.push(ilike(experiments.name, `%${search}%`))
      }

      const whereClause = and(...conditions)

      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(experiments)
          .where(whereClause)
          .orderBy(sql`${experiments.created_at} DESC`)
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(experiments).where(whereClause),
      ])

      const total = Number(totalRows[0]?.count ?? 0)

      return reply.send({
        data: { items, total, page, limit },
        error: null,
      })
    },
  )

  // POST /api/experiments — create experiment
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const parseResult = createExperimentBody.safeParse(request.body)

      if (!parseResult.success) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join(', '),
          },
        })
      }

      const data = parseResult.data
      const { workspaceId, userId } = request.user

      const insertData = {
        workspace_id: workspaceId,
        created_by: userId,
        owner_id: userId,
        name: data.name,
        hypothesis: data.hypothesis,
        status: data.status,
        result: data.result,
        team: data.team,
        source: data.source,
        external_id: data.external_id,
        variants: data.variants,
        metrics: data.metrics,
        winner_variant: data.winner_variant,
        quantitative_outcome: data.quantitative_outcome,
        learnings: data.learnings,
        shipped: data.shipped,
        started_at: data.started_at != null ? new Date(data.started_at) : undefined,
        ended_at: data.ended_at != null ? new Date(data.ended_at) : undefined,
      }

      const [experiment] = await db.insert(experiments).values(insertData).returning()

      if (!experiment) {
        return reply.code(500).send({
          data: null,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create experiment' },
        })
      }

      // Write activity log
      await logActivity({
        experimentId: experiment.id,
        userId,
        action: 'create',
      })

      return reply.code(201).send({ data: experiment, error: null })
    },
  )

  // GET /api/experiments/:id — get experiment
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const workspaceId = request.user.workspaceId

      const rows = await db
        .select()
        .from(experiments)
        .where(and(eq(experiments.id, id), isNull(experiments.deleted_at)))
        .limit(1)

      const experiment = rows[0]

      if (!experiment) {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Experiment not found' },
        })
      }

      if (experiment.workspace_id !== workspaceId) {
        return reply.code(403).send({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        })
      }

      return reply.send({ data: experiment, error: null })
    },
  )

  // PATCH /api/experiments/:id — update experiment
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { workspaceId, userId, role } = request.user

      const rows = await db
        .select()
        .from(experiments)
        .where(and(eq(experiments.id, id), isNull(experiments.deleted_at)))
        .limit(1)

      const experiment = rows[0]

      if (!experiment) {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Experiment not found' },
        })
      }

      if (experiment.workspace_id !== workspaceId) {
        return reply.code(403).send({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        })
      }

      // Check user is owner or admin
      const isOwner = experiment.owner_id === userId
      const isAdmin = role === 'admin'

      if (!isOwner && !isAdmin) {
        return reply.code(403).send({
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Only the owner or an admin can update this experiment',
          },
        })
      }

      const parseResult = updateExperimentBody.safeParse(request.body)

      if (!parseResult.success) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join(', '),
          },
        })
      }

      const updates = parseResult.data

      // Build diff for activity log
      const diff: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

      const patchableFields = [
        'name',
        'hypothesis',
        'status',
        'result',
        'team',
        'source',
        'external_id',
        'variants',
        'metrics',
        'winner_variant',
        'quantitative_outcome',
        'learnings',
        'shipped',
        'started_at',
        'ended_at',
      ] as const

      const dbUpdates: Record<string, unknown> = {}

      for (const field of patchableFields) {
        if (field in updates && updates[field] !== undefined) {
          const newVal = updates[field]
          const oldVal = experiment[field as keyof typeof experiment]

          if (field === 'started_at' || field === 'ended_at') {
            const newDate = newVal != null ? new Date(newVal as string) : undefined
            if (String(oldVal) !== String(newDate)) {
              diff.push({ field, oldValue: oldVal, newValue: newDate })
              dbUpdates[field] = newDate
            }
          } else {
            if (oldVal !== newVal) {
              diff.push({ field, oldValue: oldVal, newValue: newVal })
              dbUpdates[field] = newVal
            }
          }
        }
      }

      if (Object.keys(dbUpdates).length === 0) {
        return reply.send({ data: experiment, error: null })
      }

      dbUpdates['updated_at'] = new Date()

      const [updated] = await db
        .update(experiments)
        .set(dbUpdates)
        .where(eq(experiments.id, id))
        .returning()

      if (!updated) {
        return reply.code(500).send({
          data: null,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update experiment' },
        })
      }

      await logActivity({
        experimentId: id,
        userId,
        action: 'update',
        diff,
      })

      return reply.send({ data: updated, error: null })
    },
  )

  // DELETE /api/experiments/:id — soft delete
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { workspaceId, userId } = request.user

      const rows = await db
        .select()
        .from(experiments)
        .where(and(eq(experiments.id, id), isNull(experiments.deleted_at)))
        .limit(1)

      const experiment = rows[0]

      if (!experiment) {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Experiment not found' },
        })
      }

      if (experiment.workspace_id !== workspaceId) {
        return reply.code(403).send({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        })
      }

      // Soft delete
      await db.update(experiments).set({ deleted_at: new Date() }).where(eq(experiments.id, id))

      await logActivity({
        experimentId: id,
        userId,
        action: 'delete',
      })

      return reply.send({ data: { deleted: true }, error: null })
    },
  )
}
