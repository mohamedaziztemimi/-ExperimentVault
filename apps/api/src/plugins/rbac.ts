import type { FastifyRequest, FastifyReply } from 'fastify'

type Role = 'admin' | 'editor' | 'viewer'

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
}

/**
 * Returns a Fastify preHandler that enforces a minimum role level.
 * Hierarchy: admin > editor > viewer
 */
export function requireRole(
  minimumRole: Role,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userRole = request.user?.role

    if (!userRole) {
      return reply.code(403).send({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      })
    }

    const userLevel = ROLE_HIERARCHY[userRole]
    const requiredLevel = ROLE_HIERARCHY[minimumRole]

    if (userLevel < requiredLevel) {
      return reply.code(403).send({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      })
    }
  }
}
