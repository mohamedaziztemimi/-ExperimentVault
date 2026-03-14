import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, workspaces, workspaceMembers } from '@ev/db'
import { eq, and, count } from '@ev/db'

const createWorkspaceBody = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
})

export function workspaceRoutes(fastify: FastifyInstance): void {
  // POST /api/workspaces — create workspace
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const parseResult = createWorkspaceBody.safeParse(request.body)

      if (!parseResult.success) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join(', '),
          },
        })
      }

      const { name, slug } = parseResult.data

      // Check slug uniqueness
      const existing = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1)

      if (existing.length > 0) {
        return reply.code(409).send({
          data: null,
          error: {
            code: 'SLUG_TAKEN',
            message: `Workspace slug "${slug}" is already taken`,
          },
        })
      }

      // Insert workspace
      const [workspace] = await db.insert(workspaces).values({ name, slug }).returning()

      if (!workspace) {
        return reply.code(500).send({
          data: null,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create workspace' },
        })
      }

      // Insert workspace_member record with role='admin'
      await db.insert(workspaceMembers).values({
        workspace_id: workspace.id,
        user_id: request.user.userId,
        role: 'admin',
      })

      return reply.code(201).send({ data: workspace, error: null })
    },
  )

  // GET /api/workspaces/:id — get workspace
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      // Check user is a member of the workspace
      const memberRows = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspace_id, id),
            eq(workspaceMembers.user_id, request.user.userId),
          ),
        )
        .limit(1)

      if (memberRows.length === 0) {
        return reply.code(403).send({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Access denied to this workspace' },
        })
      }

      const workspaceRows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1)

      const workspace = workspaceRows[0]

      if (!workspace) {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Workspace not found' },
        })
      }

      // Count members
      const [membersCountRow] = await db
        .select({ count: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspace_id, id))

      const membersCount = membersCountRow?.count ?? 0

      return reply.send({
        data: { ...workspace, members_count: Number(membersCount) },
        error: null,
      })
    },
  )
}
