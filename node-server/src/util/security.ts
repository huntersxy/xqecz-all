import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'xqecz-concept-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
export const COOKIE_NAME = 'access_token'

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash)
  } catch {
    return false
  }
}

export function signToken(payload: { uid: number; is_admin: boolean }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): { uid: number; is_admin: boolean } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: number; is_admin: boolean }
    return decoded
  } catch {
    return null
  }
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
