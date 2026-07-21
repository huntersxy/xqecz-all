import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomBytes } from 'node:crypto'
import { UPLOAD_DIR } from './media.js'

const THUMB_WIDTH = 480

function isImage(ext: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)
}
function isVideo(ext: string): boolean {
  return ['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext)
}

/**
 * Generate a thumbnail for an uploaded file (stored in UPLOAD_DIR).
 * @param filename bare filename stored in uploads (e.g. "1699_ab12.png")
 * @returns public URL of the thumbnail ("/uploads/thumb_xxx.webp") or null on failure/unsupported
 */
export async function generateThumbnail(filename: string): Promise<string | null> {
  if (!filename) return null
  const src = join(UPLOAD_DIR, filename)
  if (!existsSync(src)) return null

  const ext = extname(filename).toLowerCase()
  const out = `thumb_${Date.now()}_${randomBytes(4).toString('hex')}.webp`
  const outPath = join(UPLOAD_DIR, out)

  try {
    if (isImage(ext)) {
      await sharp(src, { failOn: 'none', animated: false })
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(outPath)
      return `/uploads/${out}`
    }
    if (isVideo(ext)) {
      return await videoThumbnail(src, outPath, out)
    }
    // svg / others: no thumbnail (frontend falls back to placeholder / original)
    return null
  } catch (e) {
    console.error('[thumbnail] failed for', filename, '-', (e as Error).message)
    return null
  }
}

async function videoThumbnail(
  src: string,
  outPath: string,
  out: string,
): Promise<string | null> {
  if (!ffmpegPath) {
    console.warn('[thumbnail] ffmpeg binary unavailable, skip video thumbnail')
    return null
  }
  const tmpPng = outPath.replace(/\.webp$/, '.png')
  const ok = await extractFrame(ffmpegPath, src, tmpPng, '1')
    .catch(() => false)
    // some short clips have no frame at 1s -> retry at 0s
    .then((r) => (r ? true : extractFrame(ffmpegPath!, src, tmpPng, '0').catch(() => false)))

  if (!ok || !existsSync(tmpPng)) return null
  try {
    await sharp(tmpPng).webp({ quality: 78 }).toFile(outPath)
    return `/uploads/${out}`
  } finally {
    try {
      unlinkSync(tmpPng)
    } catch {
      /* ignore */
    }
  }
}

function extractFrame(
  ffmpeg: string,
  src: string,
  dst: string,
  seekSec: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, [
      '-ss',
      seekSec,
      '-i',
      src,
      '-frames:v',
      '1',
      '-vf',
      `scale=${THUMB_WIDTH}:-1`,
      '-y',
      dst,
    ])
    let err = ''
    p.stderr.on('data', (d) => (err += d.toString()))
    p.on('error', reject)
    p.on('close', (code) => {
      if (code === 0) resolve(true)
      else reject(new Error(`ffmpeg exit ${code}: ${err.slice(-160)}`))
    })
  })
}
