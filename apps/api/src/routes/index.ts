import type { FastifyInstance } from 'fastify'
import { workspaceRoutes } from './workspaces.js'
import { userRoutes } from './users.js'
import { experimentRoutes } from './experiments.js'
import { webhookRoutes } from './webhooks.js'

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(workspaceRoutes, { prefix: '/workspaces' })
  await fastify.register(userRoutes, { prefix: '/users' })
  await fastify.register(experimentRoutes, { prefix: '/experiments' })
  await fastify.register(webhookRoutes, { prefix: '/webhooks' })
}
