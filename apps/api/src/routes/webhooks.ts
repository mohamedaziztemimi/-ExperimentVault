import type { FastifyInstance } from 'fastify'
import { Webhook } from 'svix'
import { db, users } from '@ev/db'
import { env } from '../env.js'

interface ClerkUserData {
  id: string
  email_addresses: Array<{ email_address: string; id: string }>
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
  image_url: string | null
}

interface ClerkWebhookEvent {
  type: string
  data: ClerkUserData
}

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/webhooks/clerk — Clerk user sync
  fastify.post('/clerk', async (request, reply) => {
    const svixId = request.headers['svix-id'] as string | undefined
    const svixTimestamp = request.headers['svix-timestamp'] as string | undefined
    const svixSignature = request.headers['svix-signature'] as string | undefined

    if (!svixId || !svixTimestamp || !svixSignature) {
      return reply.code(400).send({
        data: null,
        error: {
          code: 'MISSING_SVIX_HEADERS',
          message: 'Missing required Svix webhook headers',
        },
      })
    }

    // Verify Clerk webhook signature
    const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET)

    let event: ClerkWebhookEvent

    try {
      const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)

      event = webhook.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent
    } catch {
      return reply.code(400).send({
        data: null,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
      })
    }

    const { type, data } = event

    if (type === 'user.created' || type === 'user.updated') {
      const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id)

      if (!primaryEmail) {
        return reply.code(400).send({
          data: null,
          error: {
            code: 'NO_PRIMARY_EMAIL',
            message: 'User has no primary email address',
          },
        })
      }

      const email = primaryEmail.email_address
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || email

      // Upsert user
      await db
        .insert(users)
        .values({
          clerk_user_id: data.id,
          email,
          name,
          avatar_url: data.image_url ?? undefined,
        })
        .onConflictDoUpdate({
          target: users.clerk_user_id,
          set: {
            email,
            name,
            avatar_url: data.image_url ?? undefined,
            updated_at: new Date(),
          },
        })
    }

    return reply.send({ data: { received: true }, error: null })
  })
}
