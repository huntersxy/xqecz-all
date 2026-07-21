export interface Pagination {
  page: number
  pageSize: number
  offset: number
  limit: number
}

// Mirrors the Go backend's util.ParsePagination behaviour.
export function parsePagination(
  pageRaw: unknown,
  pageSizeRaw: unknown,
  defaultSize = 20,
  maxSize = 100,
): Pagination {
  let page = Number(pageRaw) || 1
  if (page < 1) page = 1

  let pageSize = Number(pageSizeRaw) || defaultSize
  if (pageSize < 1) pageSize = defaultSize
  if (pageSize > maxSize) pageSize = maxSize

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  }
}

// Safe query-string number parse
export function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function bool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return Boolean(v)
}

// Parse a JSON array column into string[].
export function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.filter((t) => typeof t === 'string')
    return []
  } catch {
    return []
  }
}
