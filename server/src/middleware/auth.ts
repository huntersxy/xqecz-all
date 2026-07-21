import type { Request, Response, NextFunction } from 'express'
import { COOKIE_NAME, verifyToken } from '../util/security.js'
import { getUserById } from '../db/index.js'
import { error } from '../util/response.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { uid: number; is_admin: boolean }
    }
  }
}

// Reads the httpOnly JWT cookie (matches frontend `credentials: 'include'`, no auth header).
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return error(res, 401, '未登录')
  const payload = verifyToken(token)
  if (!payload) return error(res, 401, '登录已过期')
  const user = getUserById(payload.uid)
  if (!user) return error(res, 401, '用户不存在')
  if (user.is_banned) return error(res, 403, '账号已被封禁')
  req.user = { uid: payload.uid, is_admin: !!user.is_admin }
  next()
}

// Auth is optional: populates req.user when a valid token is present, otherwise continues.
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME]
  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      const user = getUserById(payload.uid)
      if (user && !user.is_banned) req.user = { uid: payload.uid, is_admin: !!user.is_admin }
    }
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) return error(res, 401, '未登录')
  if (!req.user.is_admin) return error(res, 403, '需要管理员权限')
  next()
}
