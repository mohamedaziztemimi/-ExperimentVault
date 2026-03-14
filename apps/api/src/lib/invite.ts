import crypto from 'node:crypto'

/**
 * Generates a cryptographically random invite token (64 hex characters).
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
