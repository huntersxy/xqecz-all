import type { Request, Response, NextFunction } from 'express'
import { COOKIE_NAME } from '../util/security.js'
import { getSession } from '../db/redis.js'
import { getUserById } from '../db/index.js'
import { error } from '../util/response.js'
import rateLimitLib, { ipKeyGenerator } from 'express-rate-limit'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { uid: number; is_admin: boolean }
    }
  }
}

// ---- Auth ----

async function loadUser(sessionID: string): Promise<{ uid: number; is_admin: boolean } | null> {
  const userID = await getSession(sessionID)
  if (!userID) return null
  const user = await getUserById(userID)
  if (!user || user.is_banned) return null
  return { uid: user.id, is_admin: !!user.is_admin }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionID = req.cookies?.[COOKIE_NAME]
  if (!sessionID) { error(res, 401, '未登录'); return }
  const u = await loadUser(sessionID)
  if (!u) { error(res, 401, '登录已过期'); return }
  req.user = u
  next()
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sessionID = req.cookies?.[COOKIE_NAME]
  if (sessionID) {
    const u = await loadUser(sessionID)
    if (u) req.user = u
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { error(res, 401, '未登录'); return }
  if (!req.user.is_admin) { error(res, 403, '需要管理员权限'); return }
  next()
}

// ---- Error Handler ----

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err && typeof err === 'object' && 'status' in err) {
    const e = err as { status: number; message?: string }
    return error(res, e.status, e.message || '请求错误')
  }
  console.error('[errorHandler]', err)
  return error(res, 500, '服务器内部错误')
}

export function notFound(_req: Request, res: Response): void {
  error(res, 404, '接口不存在')
}

// ---- Rate Limiter ----

interface RateLimitOpts {
  windowMs: number
  max: number
  keyPrefix: string
}

export function rateLimit(opts: RateLimitOpts) {
  return rateLimitLib({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string =>
      `${opts.keyPrefix}:${ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')}`,
    handler: (_req: Request, res: Response) => {
      error(res, 429, '请求过于频繁，请稍后再试')
    },
  }) as (req: Request, res: Response, next: NextFunction) => void
}
