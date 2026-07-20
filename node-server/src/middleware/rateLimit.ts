import type { Request, Response, NextFunction } from 'express'
import { error } from '../util/response.js'

// Minimal in-memory fixed-window rate limiter (concept-grade; per IP).
const buckets = new Map<string, { count: number; resetAt: number }>()

interface RateLimitOpts {
  windowMs: number
  max: number
  keyPrefix: string
}

export function rateLimit(opts: RateLimitOpts) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string
    const key = `${opts.keyPrefix}:${ip}`
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
      return next()
    }
    bucket.count += 1
    if (bucket.count > opts.max) {
      return error(res, 429, '请求过于频繁，请稍后再试')
    }
    next()
  }
}
