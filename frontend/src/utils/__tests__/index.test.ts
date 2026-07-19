import { describe, it, expect } from 'vitest'
import { getImageUrl, formatTime, formatRelativeTime, renderMarkdown, getPreviewText } from '@/utils'

describe('getImageUrl', () => {
  it('returns empty string for undefined', () => {
    expect(getImageUrl()).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(getImageUrl('')).toBe('')
  })

  it('returns https URL as-is', () => {
    expect(getImageUrl('https://example.com/img.png')).toBe('https://example.com/img.png')
  })

  it('returns http URL as-is', () => {
    expect(getImageUrl('http://example.com/img.png')).toBe('http://example.com/img.png')
  })
})

describe('formatTime', () => {
  it('returns empty string for 0', () => {
    expect(formatTime(0)).toBe('')
  })

  it('returns empty string for falsy', () => {
    expect(formatTime(0)).toBe('')
  })

  it('formats numeric timestamp', () => {
    const result = formatTime(1710230400)
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('formats string timestamp', () => {
    const result = formatTime('1710230400')
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('returns date-only format when useLocaleDate is true', () => {
    const result = formatTime(1710230400, true)
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
  })
})

describe('formatRelativeTime', () => {
  it('returns empty string for 0', () => {
    expect(formatRelativeTime(0)).toBe('')
  })

  it('returns relative time string', () => {
    const now = Math.floor(Date.now() / 1000)
    const result = formatRelativeTime(now)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('returns past time for old timestamp', () => {
    const result = formatRelativeTime(1710230400)
    expect(result).toContain('前')
  })
})

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    const result = renderMarkdown('**bold**')
    expect(result).toContain('bold')
    expect(result).toContain('<strong')
  })

  it('renders heading', () => {
    const result = renderMarkdown('# Hello')
    expect(result).toContain('Hello')
    expect(result).toContain('<h1')
  })

  it('sanitizes XSS vectors', () => {
    const result = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(result).not.toContain('onerror')
  })

  it('handles empty string', () => {
    const result = renderMarkdown('')
    expect(result).toBeDefined()
  })

  it('returns sanitized plain text on markdown error', () => {
    const result = renderMarkdown('plain text')
    expect(result).toContain('plain text')
  })
})

describe('getPreviewText', () => {
  it('returns empty string for empty input', () => {
    expect(getPreviewText('')).toBe('')
  })

  it('strips markdown heading syntax', () => {
    const result = getPreviewText('# Hello World')
    expect(result).toBe('Hello World')
  })

  it('strips bold syntax', () => {
    const result = getPreviewText('**important** text')
    expect(result).toBe('important text')
  })

  it('strips code block fences', () => {
    const result = getPreviewText('```js\nconst x = 1;\n```')
    expect(result).toContain('const x = 1')
    expect(result).not.toContain('```')
  })

  it('truncates long text with maxLength', () => {
    const longText = 'a'.repeat(200)
    const result = getPreviewText(longText, 50)
    expect(result.length).toBeLessThanOrEqual(53) // 50 + '...'
    expect(result.endsWith('...')).toBe(true)
  })

  it('strips link syntax keeping text', () => {
    const result = getPreviewText('view [docs](https://example.com) here')
    expect(result).toBe('view docs here')
  })

  it('strips inline code', () => {
    const result = getPreviewText('use `code` here')
    expect(result).toBe('use code here')
  })

  it('handles HTML tags', () => {
    const result = getPreviewText('<div>text</div>')
    expect(result).toBe('text')
  })
})
