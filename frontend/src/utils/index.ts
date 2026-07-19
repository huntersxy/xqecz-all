import { marked } from 'marked'
import DOMPurify from 'dompurify'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import removeMarkdown from 'remove-markdown'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE_URL || ''

export function getImageUrl(image?: string): string {
  if (!image) return ''
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  if (image.startsWith('/')) {
    return `${MEDIA_BASE}${image}`
  }
  return image
}

export function formatTime(ts: number | string, useLocaleDate: boolean = false): string {
  if (!ts) return ''
  const timestamp = typeof ts === 'string' ? Number.parseInt(ts, 10) : ts
  const d = dayjs.unix(timestamp)
  return useLocaleDate ? d.format('YYYY/MM/DD') : d.format('YYYY/MM/DD HH:mm:ss')
}

export function formatRelativeTime(ts: number | string): string {
  if (!ts) return ''
  const timestamp = typeof ts === 'string' ? Number.parseInt(ts, 10) : ts
  return dayjs.unix(timestamp).fromNow()
}

export function getPreviewText(content: string, maxLength: number = 100): string {
  if (!content) return ''
  const plainText = removeMarkdown(content).replace(/\s+/g, ' ').trim()
  return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText
}

export function renderMarkdown(text: string): string {
  try {
    return DOMPurify.sanitize(marked(text) as string)
  } catch {
    return DOMPurify.sanitize(text)
  }
}

/**
 * 把普通对象转为 FormData：跳过 null/undefined/空串/空数组；
 * 数组按元素重复 append（适配后端同名多值字段，如 tags）；File 直接 append；
 * 其余（number/boolean）转字符串。消除各 api 里手搓的 `if (x) fd.append(...)` 样板。
 */
export function toFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) fd.append(key, String(item))
      }
      continue
    }
    if (value instanceof File) {
      fd.append(key, value)
    } else {
      fd.append(key, String(value))
    }
  }
  return fd
}
