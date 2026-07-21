import type { Response } from 'express'

// Unified API envelope matching the frontend contract: { code, message, data }.
// `code` mirrors the HTTP status so the frontend's pickServerMessage() and
// status checks (e.g. 401) behave identically to the Go backend.

export function success<T>(res: Response, data: T, message = 'ok', httpStatus = 200): void {
  res.status(httpStatus).json({ code: httpStatus, message, data })
}

export function paginated<T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
): void {
  const totalPage = pageSize > 0 ? Math.ceil(total / pageSize) : 1
  res.status(200).json({
    code: 200,
    message: 'ok',
    data: { list, total, page, page_size: pageSize, total_page: totalPage },
  })
}

export function error(res: Response, httpStatus: number, message: string): void {
  res.status(httpStatus).json({ code: httpStatus, message })
}
