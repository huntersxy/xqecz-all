import { createHash, createHmac } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join, extname } from 'node:path'
import { UPLOAD_DIR } from './media.js'

/**
 * S3-compatible object storage adapter (Tencent COS / Ali OSS / AWS S3 / MinIO / Cloudflare R2).
 *
 * - Zero dependencies: implements AWS Signature V4 with native crypto + fetch.
 * - Env-gated: does nothing unless S3_ENDPOINT + S3_BUCKET + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY
 *   are all set. When disabled, callers keep using the local /uploads path.
 * - Resilient: upload failures throw; callers catch and fall back to the local URL.
 *
 * Configuration (path-style addressing):
 *   S3_ENDPOINT=https://cos.ap-shanghai.myqcloud.com   (service host, WITHOUT bucket)
 *   S3_BUCKET=my-bucket
 *   S3_REGION=ap-shanghai
 *   S3_ACCESS_KEY_ID=...
 *   S3_SECRET_ACCESS_KEY=...
 *   S3_PUBLIC_URL=https://cdn.example.com   (optional: overrides the returned base URL)
 *   S3_DELETE_LOCAL=true                    (default true: remove the local copy after a successful upload)
 */

const ENDPOINT = process.env.S3_ENDPOINT?.replace(/\/$/, '')
const BUCKET = process.env.S3_BUCKET
const REGION = process.env.S3_REGION || 'auto'
const KEY_ID = process.env.S3_ACCESS_KEY_ID
const SECRET = process.env.S3_SECRET_ACCESS_KEY
const PUBLIC_URL = process.env.S3_PUBLIC_URL?.replace(/\/$/, '')
const DELETE_LOCAL = (process.env.S3_DELETE_LOCAL ?? 'true') !== 'false'

export function isObjectStorageEnabled(): boolean {
  return !!(ENDPOINT && BUCKET && KEY_ID && SECRET)
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}
function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex')
}

// RFC 3986 encode, leaving unreserved chars; used for the canonical URI path segments.
function uriEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function objectUrl(key: string): string {
  return `${ENDPOINT}/${BUCKET}/${uriEncode(key)}`
}

export function publicUrl(key: string): string {
  if (PUBLIC_URL) return `${PUBLIC_URL}/${key}`
  return objectUrl(key)
}

/**
 * Upload a file currently in UPLOAD_DIR to object storage.
 * @returns the public URL of the uploaded object
 * @throws if object storage is disabled or the upload fails
 */
export async function uploadToObjectStorage(filename: string, contentType?: string): Promise<string> {
  if (!isObjectStorageEnabled()) throw new Error('object storage not configured')
  const local = join(UPLOAD_DIR, filename)
  if (!existsSync(local)) throw new Error(`local file missing: ${filename}`)

  const key = `uploads/${filename}`
  const url = objectUrl(key)
  const body = readFileSync(local)
  const payloadHash = sha256(body)
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const u = new URL(url)
  const host = u.host

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalURI = `/${BUCKET}/${uriEncode(filename)}`
  const canonicalRequest = [
    'PUT',
    canonicalURI,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${REGION}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join('\n')

  const signingKey = hmac(
    hmac(hmac(hmac('AWS4' + SECRET, dateStamp), REGION), 's3'),
    'aws4_request',
  )
  const signature = hmac(signingKey, stringToSign).toString('hex')

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${KEY_ID}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Host: host,
      Authorization: authHeader,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body,
    signal: AbortSignal.timeout(30000),
  })
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`S3 upload failed ${resp.status}: ${detail.slice(0, 200)}`)
  }

  if (DELETE_LOCAL) {
    try {
      unlinkSync(local)
    } catch {
      /* keep local copy if deletion fails */
    }
  }
  return publicUrl(key)
}

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
}

export function mimeForFile(filename: string): string {
  return EXT_MIME[extname(filename).toLowerCase()] || 'application/octet-stream'
}
