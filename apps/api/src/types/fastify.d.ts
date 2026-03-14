export interface RequestUser {
  clerkUserId: string
  userId: string
  workspaceId: string
  role: 'admin' | 'editor' | 'viewer'
}

declare module 'fastify' {
  interface FastifyRequest {
    user: RequestUser
  }
}
