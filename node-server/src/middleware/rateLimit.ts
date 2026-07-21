import type { Request, Response, NextFunction } from 'express'
import rateLimitLib, { ipKeyGenerator } from 'express-rate-limit'
import { error } from '../util/response.js'

// Drop-in replacement for the old hand-rolled in-memory fixed-window limiter.
// express-rate-limit handles the windowing, headers, and (with a store) distributed
// setup. We key per-route via `keyPrefix` + client IP so register/login/init-admin
// don't share a bucket. Default MemoryStore is fine for a single-instance concept app.
//
// NOTE: a custom keyGenerator must route the IP through the library's `ipKeyGenerator`
// helper, otherwise express-rate-limit throws ERR_ERL_KEY_GEN_IPV6 on IPv6 hosts (::1).
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
