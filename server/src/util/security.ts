import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'

export const COOKIE_NAME = 'session_id'

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash).catch(() => false)
}

export function generateSessionID(): string {
  return randomBytes(32).toString('hex')
}

// API key helpers
export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = 'xq_' + randomBytes(24).toString('hex')
  const prefix = raw.slice(0, 12)
  const hash = sha256(raw)
  return { raw, prefix, hash }
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}
