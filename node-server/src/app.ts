import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import authRouter from './routes/auth.js'
import contentRouter from './routes/content.js'
import commentRouter from './routes/comment.js'
import pollRouter from './routes/poll.js'
import adminRouter from './routes/admin.js'
import apiKeyRouter from './routes/apikey.js'
import { errorHandler, notFound } from './middleware/error.js'
import { UPLOAD_DIR } from './util/media.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, '..', '..', 'frontend', 'dist')

export function createApp(): express.Express {
  const app = express()

  app.use(cookieParser())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Security headers. CSP is intentionally disabled: the built Vue SPA loads
  // same-origin ES module scripts (and may rely on inline styles), and a strict
  // default-src would risk breaking the bundle. Other helmet headers stay on.
  app.use(helmet({ contentSecurityPolicy: false }))
  // Gzip compress responses.
  app.use(compression())

  // Media: originals at /uploads, thumbnails at /uploads/thumbs (subdir of UPLOAD_DIR).
  app.use('/uploads', express.static(UPLOAD_DIR))

  // Health check.
  app.get('/api/health', (_req, res) => res.json({ code: 200, message: 'ok', data: { ok: true } }))

  // API routers.
  app.use('/api/auth', authRouter)
  app.use('/api/content', contentRouter)
  app.use('/api/comment', commentRouter)
  app.use('/api/poll', pollRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/api-keys', apiKeyRouter)

  // Built frontend (production). In dev the Vite server serves the UI and proxies /api here.
  // Mounted unconditionally so the dist can be built after the server starts.
  app.use(express.static(DIST_DIR))

  // SPA fallback for client-side routes + JSON 404 for unmatched API calls.
  app.use((req, res) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      const idx = resolve(DIST_DIR, 'index.html')
      if (existsSync(idx)) return res.sendFile(idx)
    }
    notFound(req as any, res as any)
  })

  app.use(errorHandler)

  return app
}
