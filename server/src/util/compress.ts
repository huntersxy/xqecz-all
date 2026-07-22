import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomBytes } from 'node:crypto'
import { UPLOAD_DIR } from './media.js'

const TINIFY_KEY = process.env.TINIFY_API_KEY

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
}

/**
 * Compress an uploaded image via the Tinify API (https://tinify.com).
 *
 * Design goals:
 * - Zero dependencies (uses native fetch + node:crypto).
 * - Env-gated: when TINIFY_API_KEY is unset the function is a no-op and the
 *   caller keeps serving the original — so local/dev runs are unaffected.
 * - Resilient: any network/API failure returns null; the original is untouched.
 *
 * @param filename bare filename stored in uploads (e.g. "1699_ab12.png")
 * @returns public URL of the compressed file ("/uploads/compressed_xxx.ext") or null
 */
export async function compressImageWithTinify(filename: string): Promise<string | null> {
  if (!TINIFY_KEY) return null
  const src = join(UPLOAD_DIR, filename)
  if (!existsSync(src)) return null
  const ext = extname(filename).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'
  try {
    const resp = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${TINIFY_KEY}`).toString('base64'),
        'Content-Type': mime,
      },
      body: readFileSync(src),
      // Tinify monthly quota is limited; surface the remaining count for ops.
      signal: AbortSignal.timeout(20000),
    })
    if (!resp.ok) {
      console.warn('[tinify] shrink failed:', resp.status, await resp.text().catch(() => ''))
      return null
    }
    const buf = Buffer.from(await resp.arrayBuffer())
    const out = `compressed_${Date.now()}_${randomBytes(4).toString('hex')}${ext}`
    writeFileSync(join(UPLOAD_DIR, out), buf)
    const remaining = resp.headers.get('compression-count')
    if (remaining !== null) console.info('[tinify] compress ok, remaining quota:', remaining)
    return `/uploads/${out}`
  } catch (e) {
    console.warn('[tinify] compression error:', (e as Error).message)
    return null
  }
}
