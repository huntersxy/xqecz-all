import type { Request, Response, NextFunction } from 'express'
import { error } from '../util/response.js'

// Centralised error handler — never throw raw stacks to the client.
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
