import multer from 'multer'
import { existsSync, mkdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Uploads live in node-server/uploads (gitignored). Served at /uploads.
export const UPLOAD_DIR = resolve(__dirname, '..', '..', 'uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

// Thumbnails live in node-server/uploads/thumbs, served at /uploads/thumbs.
// Keeping them in a dedicated subdir makes cleanup / orphan-scanning unambiguous.
export const THUMB_DIR = resolve(UPLOAD_DIR, 'thumbs')
if (!existsSync(THUMB_DIR)) mkdirSync(THUMB_DIR, { recursive: true })

const ALLOWED = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
  '.mp4',
  '.webm',
  '.mov',
  '.mkv',
  '.avi',
  '.mp3',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    const safeExt = ALLOWED.has(ext) ? ext : '.bin'
    cb(null, `${Date.now()}_${randomBytes(6).toString('hex')}${safeExt}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    if (ALLOWED.has(ext)) cb(null, true)
    else cb(new Error('不支持的文件类型'))
  },
})

// Convert a stored filename to its public URL.
export function fileUrl(filename: string): string {
  return `/uploads/${filename}`
}

export function isImageExt(ext: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext.toLowerCase())
}

export function isVideoExt(ext: string): boolean {
  return ['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext.toLowerCase())
}
