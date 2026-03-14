import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { verifyToken } from '@clerk/backend'
import { db, users, workspaceMembers } from '@ev/db'
import { eq, and } from '@ev/db'
import { env } from '../env.js'

// Extend FastifyInstance with authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

async function clerkPlugin(fastify: FastifyInstance): Promise<void> {
  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      })
    }

    const token = authHeader.slice(7)

    let clerkUserId: string

    try {
      const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
      clerkUserId = payload.sub
    } catch {
      return reply.code(401).send({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      })
    }

    // Look up the user and their workspace membership in DB
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.clerk_user_id, clerkUserId))
      .limit(1)

    const user = userRows[0]

    if (!user) {
      return reply.code(401).send({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      })
    }

    // Derive workspaceId from query param, path param, or body
    // The workspace_id must be provided via header X-Workspace-Id or query param
    const workspaceId =
      (request.headers['x-workspace-id'] as string | undefined) ??
      (request.query as Record<string, string | undefined>)['workspace_id'] ??
      (request.params as Record<string, string | undefined>)['workspace_id'] ??
      (request.body as Record<string, string | undefined> | null)?.['workspace_id']

    if (!workspaceId) {
      return reply.code(401).send({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Workspace context required',
        },
      })
    }

    // Verify membership
    const memberRows = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.user_id, user.id), eq(workspaceMembers.workspace_id, workspaceId)),
      )
      .limit(1)

    const member = memberRows[0]

    if (!member) {
      return reply.code(401).send({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      })
    }

    request.user = {
      clerkUserId,
      userId: user.id,
      workspaceId,
      role: member.role as 'admin' | 'editor' | 'viewer',
    }
  }

  fastify.decorate('authenticate', authenticate)
}

export default fp(clerkPlugin, {
  name: 'clerk',
  fastify: '5.x',
})
