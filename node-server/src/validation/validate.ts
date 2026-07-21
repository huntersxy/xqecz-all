import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'
import { error } from '../util/response.js'

// Validate-and-coerce request body with a zod schema. On failure respond 400 with
// the first human-readable issue; on success replace `req.body` with the parsed
// (and type-coerced) data so downstream handlers read clean, typed values.
export function validate<T extends ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      const issue = result.error.issues[0]
      const message = issue ? issue.message : '请求参数不合法'
      error(res, 400, message)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(req as any).body = result.data
    next()
  }
}
