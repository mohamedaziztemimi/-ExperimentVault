import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, workspaceMembers, users, invites, workspaces } from '@ev/db'
import { eq, and, count } from '@ev/db'
import { requireRole } from '../plugins/rbac.js'
import { generateInviteToken } from '../lib/invite.js'
import { Resend } from 'resend'
import { env } from '../env.js'

const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const inviteUserBody = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export function userRoutes(fastify: FastifyInstance): void {
  const resend = new Resend(env.RESEND_API_KEY)

  // GET /api/users — list workspace members
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const parseResult = listUsersQuery.safeParse(request.query)

      if (!parseResult.success) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join(', '),
          },
        })
      }

      const { page, limit } = parseResult.data
      const offset = (page - 1) * limit
      const workspaceId = request.user.workspaceId

      const [items, totalRows] = await Promise.all([
        db
          .select({
            member_id: workspaceMembers.id,
            workspace_id: workspaceMembers.workspace_id,
            role: workspaceMembers.role,
            joined_at: workspaceMembers.joined_at,
            user_id: users.id,
            clerk_user_id: users.clerk_user_id,
            email: users.email,
            name: users.name,
            avatar_url: users.avatar_url,
          })
          .from(workspaceMembers)
          .innerJoin(users, eq(workspaceMembers.user_id, users.id))
          .where(eq(workspaceMembers.workspace_id, workspaceId))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspace_id, workspaceId)),
      ])

      const total = Number(totalRows[0]?.count ?? 0)

      return reply.send({
        data: { items, total, page, limit },
        error: null,
      })
    },
  )

  // POST /api/users/invite — invite user
  fastify.post(
    '/invite',
    {
      preHandler: [fastify.authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const parseResult = inviteUserBody.safeParse(request.body)

      if (!parseResult.success) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues.map((i) => i.message).join(', '),
          },
        })
      }

      const { email, role } = parseResult.data
      const workspaceId = request.user.workspaceId

      // Check user not already a member
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser.length > 0 && existingUser[0]) {
        const existingMember = await db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspace_id, workspaceId),
              eq(workspaceMembers.user_id, existingUser[0].id),
            ),
          )
          .limit(1)

        if (existingMember.length > 0) {
          return reply.code(409).send({
            data: null,
            error: {
              code: 'ALREADY_MEMBER',
              message: 'User is already a member of this workspace',
            },
          })
        }
      }

      // Fetch workspace name for email
      const workspaceRows = await db
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1)

      const workspaceName = workspaceRows[0]?.name ?? 'ExperimentVault'

      // Generate token and expiry
      const token = generateInviteToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      // Insert invite record
      const [invite] = await db
        .insert(invites)
        .values({
          workspace_id: workspaceId,
          invited_by: request.user.userId,
          email,
          role,
          token,
          expires_at: expiresAt,
        })
        .returning()

      if (!invite) {
        return reply.code(500).send({
          data: null,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create invite' },
        })
      }

      // Send invite email via Resend
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: email,
        subject: `You've been invited to join ${workspaceName} on ExperimentVault`,
        html: `
          <p>Hi there,</p>
          <p>You've been invited to join <strong>${workspaceName}</strong> on ExperimentVault as a <strong>${role}</strong>.</p>
          <p>
            <a href="${env.CORS_ORIGIN ?? 'http://localhost:3000'}/invite/accept?token=${token}">
              Click here to accept your invitation
            </a>
          </p>
          <p>This invitation expires on ${expiresAt.toISOString()}.</p>
          <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
        `,
      })

      return reply.code(201).send({
        data: {
          invite_id: invite.id,
          expires_at: expiresAt.toISOString(),
        },
        error: null,
      })
    },
  )
}
