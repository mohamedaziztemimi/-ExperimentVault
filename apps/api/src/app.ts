import Fastify, { type FastifyInstance, type FastifyError } from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import clerkPlugin from './plugins/clerk.js'
import { registerRoutes } from './routes/index.js'
import { env } from './env.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  })

  // Security headers
  await app.register(helmet)

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN ?? 'http://localhost:3000',
  })

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Clerk authentication plugin (adds `fastify.authenticate` decorator)
  await app.register(clerkPlugin)

  // Register all route plugins under /api prefix
  await app.register(registerRoutes, { prefix: '/api' })

  // Global error handler
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error)

    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500

    const code =
      statusCode === 429 ? 'RATE_LIMITED' : statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'

    return reply.code(statusCode).send({
      data: null,
      error: {
        code,
        message: error.message ?? 'An unexpected error occurred',
      },
    })
  })

  return app
}
