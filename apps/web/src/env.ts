import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
})

const serverEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
})

function parseEnv() {
  const clientResult = clientEnvSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  })

  if (!clientResult.success) {
    const missing = clientResult.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`[env] Missing or invalid client environment variables: ${missing}`)
  }

  return clientResult.data
}

function parseServerEnv() {
  // Only validate server env on the server side
  if (typeof window !== 'undefined') return null

  const serverResult = serverEnvSchema.safeParse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  })

  if (!serverResult.success) {
    const missing = serverResult.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`[env] Missing or invalid server environment variables: ${missing}`)
  }

  return serverResult.data
}

export const clientEnv = parseEnv()
export const serverEnv = parseServerEnv()
