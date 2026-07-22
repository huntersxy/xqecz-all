/**
 * Fetch Open Graph / Twitter card metadata for an external link.
 *
 * Replaces the Rust external_video service (which scraped Bilibili/YouTube
 * metadata): a portable, dependency-free link preview that auto-fills the
 * title / thumbnail / description of `link`-type content.
 *
 * Best-effort & resilient: any failure (timeout, non-HTML, parse error)
 * returns null and the caller keeps the user-supplied values.
 */

export interface LinkPreview {
  title: string
  description?: string
  image?: string
  platform: string
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function detectPlatform(hostname: string): string {
  const h = hostname.toLowerCase()
  if (h.includes('bilibili.com')) return 'bilibili'
  if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube'
  if (h.includes('twitter.com') || h.includes('x.com')) return 'twitter'
  if (h.includes('douyin.com') || h.includes('tiktok.com')) return 'douyin'
  if (h.includes('weibo.com')) return 'weibo'
  return 'generic'
}

// Pull a <meta property="og:..." content="..."> or its reversed order.
function metaContent(html: string, prop: string): string | undefined {
  const a = html.match(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
      'i',
    ),
  )
  if (a) return a[1].trim()
  const b = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
      'i',
    ),
  )
  return b ? b[1].trim() : undefined
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!resp.ok) return null
    const ct = resp.headers.get('content-type') || ''
    if (!ct.includes('html')) return null
    const html = await resp.text()
    const title =
      metaContent(html, 'og:title') ||
      metaContent(html, 'twitter:title') ||
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '')
    const description = metaContent(html, 'og:description') || metaContent(html, 'twitter:description')
    const image =
      metaContent(html, 'og:image') ||
      metaContent(html, 'og:image:url') ||
      metaContent(html, 'twitter:image')
    if (!title && !image) return null
    return {
      title: title || url,
      description: description || undefined,
      image: image || undefined,
      platform: detectPlatform(host),
    }
  } catch {
    return null
  }
}
