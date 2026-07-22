import { Router } from 'express'
import {
  contentExists,
  createClaim,
  createContent,
  decorateContent,
  decorateRecommend,
  getAllTags,
  getContentRow,
  incrementView,
  listContents,
  recommendContents,
  softDeleteContent,
  updateContent,
} from '../db/index.js'
import pool from '../db/mysql.js'
import { parsePagination } from '../util/pagination.js'
import { success, paginated, error } from '../util/response.js'
import { requireAuth } from '../middleware/index.js'
import { upload, fileUrl } from '../util/media.js'
import { generateThumbnail } from '../util/thumbnail.js'
import { compressImageWithTinify } from '../util/compress.js'
import { fetchLinkPreview } from '../util/linkPreview.js'
import { isObjectStorageEnabled, uploadToObjectStorage, mimeForFile } from '../util/storage.js'
import { validate } from '../validation/validate.js'
import { uploadSchema, updateContentSchema, claimSchema } from '../validation/schemas.js'
import type { ContentType } from '../types.js'

const router = Router()
const VALID_TYPES: ContentType[] = ['video', 'image', 'text', 'link']

function parseTagsInput(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((t) => typeof t === 'string')
  if (typeof v === 'string') {
    if (v.trim().startsWith('[')) {
      try {
        const a = JSON.parse(v)
        if (Array.isArray(a)) return a.filter((t) => typeof t === 'string')
      } catch {
        /* fall through */
      }
    }
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function ownOrAdmin(req: import('express').Request, authorId: number): boolean {
  return !!req.user && (req.user.uid === authorId || req.user.is_admin)
}

// ---- public list ----
router.get('/list', async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { tag, type, audit_status, keyword } = req.query as Record<string, string>
  const { rows, total } = await listContents({
    offset: p.offset,
    limit: p.limit,
    tag,
    type: VALID_TYPES.includes(type as ContentType) ? type : undefined,
    auditStatus: audit_status || 'approved',
    keyword,
    sortBy: req.query.sort_by as string,
    order: req.query.order as string,
  })
  const list = await Promise.all(rows.map((r) => decorateContent(r)))
  paginated(res, list, total, p.page, p.pageSize)
})

// ---- search ----
router.get('/search', async (req, res) => {
  const keyword = (req.query.keyword as string) || ''
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  if (!keyword.trim()) return paginated(res, [], 0, p.page, p.pageSize)
  const { rows, total } = await listContents({
    offset: p.offset,
    limit: p.limit,
    keyword,
    auditStatus: 'approved',
  })
  const list = await Promise.all(rows.map((r) => decorateContent(r)))
  paginated(res, list, total, p.page, p.pageSize)
})

// ---- recommend ----
router.get('/recommend', async (req, res) => {
  const count = Math.max(1, Math.min(Number(req.query.count) || 20, 100))
  const page = Math.max(1, Number(req.query.page) || 1)
  const rows = await recommendContents(count, page)
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS c FROM contents WHERE deleted_at IS NULL AND audit_status = 'approved'",
  )
  const totalRow = (countRows as any[])[0]
  const list = await Promise.all(rows.map((r) => decorateRecommend(r)))
  success(res, { list, count: totalRow.c })
})

// ---- all tags ----
router.get('/tags', async (_req, res) => {
  success(res, await getAllTags())
})

// ---- my content (auth) ----
router.get('/my', requireAuth, async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = await listContents({
    offset: p.offset,
    limit: p.limit,
    userId: req.user!.uid,
    auditStatus: (req.query.audit_status as string) || undefined,
    type: VALID_TYPES.includes(req.query.type as ContentType) ? (req.query.type as string) : undefined,
  })
  const list = await Promise.all(rows.map((r) => decorateContent(r)))
  paginated(res, list, total, p.page, p.pageSize)
})

// ---- upload (auth, multipart) ----
router.post('/upload', requireAuth, upload.single('file'), validate(uploadSchema), async (req, res) => {
  let { title, type, content, url } = req.body
  if (!VALID_TYPES.includes(type as ContentType)) return error(res, 400, '不支持的内容类型')
  const t = type as ContentType
  const file = (req as any).file as Express.Multer.File | undefined
  let filePath: string | null = null
  let fileSize = 0
  if (file) {
    filePath = fileUrl(file.filename)
    fileSize = file.size
  }
  if (t !== 'link' && !title) return error(res, 400, '标题不能为空')
  if ((t === 'image' || t === 'video') && !filePath)
    return error(res, 400, '图片/视频类型必须上传文件')
  if (t === 'text' && !content) return error(res, 400, '图文类型需要填写内容')
  if (t === 'link' && !url) return error(res, 400, '链接类型需要填写 URL')

  let thumbPath: string | null = null
  let compressedPath: string | null = null
  let platform: string | null = null

  if (file && (t === 'image' || t === 'video')) {
    thumbPath = await generateThumbnail(file.filename).catch(() => null)
  }
  if (file && t === 'image') {
    compressedPath = await compressImageWithTinify(file.filename).catch(() => null)
  }
  if (file && isObjectStorageEnabled()) {
    const s3 = await uploadToObjectStorage(file.filename, mimeForFile(file.filename)).catch(() => null)
    if (s3) filePath = s3
  }
  if (t === 'link' && typeof url === 'string') {
    const preview = await fetchLinkPreview(url).catch(() => null)
    if (preview) {
      if (!title) title = preview.title
      if (!thumbPath && preview.image) thumbPath = preview.image
      platform = preview.platform
    }
    if (!title) title = url
  }

  const id = await createContent({
    title,
    type: t,
    content: typeof content === 'string' ? content : '',
    filePath,
    fileSize,
    thumbPath,
    compressedPath,
    platform,
    url: typeof url === 'string' ? url : null,
    tags: parseTagsInput(req.body?.tags),
    userId: req.user!.uid,
    auditStatus: 'approved',
  })
  const row = await getContentRow(id)
  success(res, await decorateContent(row!), '上传成功', 201)
})

// ---- upload image (auth, multipart) ----
router.post('/upload-image', requireAuth, upload.single('file'), async (req, res) => {
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) return error(res, 400, '未收到文件')

  let imageUrl = fileUrl(file.filename)
  if (isObjectStorageEnabled()) {
    const s3 = await uploadToObjectStorage(file.filename, mimeForFile(file.filename)).catch(() => null)
    if (s3) imageUrl = s3
  } else {
    const compressed = await compressImageWithTinify(file.filename).catch(() => null)
    if (compressed) imageUrl = compressed
  }

  success(
    res,
    {
      id: Date.now(),
      filename: file.filename,
      file_size: file.size,
      image_url: imageUrl,
      upload_time: new Date().toISOString(),
    },
    '上传成功',
    201,
  )
})

// ---- detail ----
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!(await contentExists(id))) return error(res, 404, '内容不存在')
  const silent = req.query.silent === '1'
  if (!silent) await incrementView(id)
  const row = await getContentRow(id)
  success(res, await decorateContent(row!))
})

// ---- update (auth) ----
router.put('/:id', requireAuth, upload.single('file'), validate(updateContentSchema), async (req, res) => {
  const id = Number(req.params.id)
  const row = await getContentRow(id)
  if (!row) return error(res, 404, '内容不存在')
  if (!ownOrAdmin(req, row.user_id)) return error(res, 403, '无权修改该内容')
  const file = (req as any).file as Express.Multer.File | undefined
  const fields: Parameters<typeof updateContent>[1] = {}
  if (typeof req.body?.title === 'string') fields.title = req.body.title
  if (typeof req.body?.content === 'string') fields.content = req.body.content
  if (typeof req.body?.url === 'string') fields.url = req.body.url
  if (req.body?.tags !== undefined) fields.tags = parseTagsInput(req.body.tags)
  if (file) {
    let fpath = fileUrl(file.filename)
    if (row.type === 'image' || row.type === 'video') {
      fields.thumbPath = await generateThumbnail(file.filename).catch(() => null)
    }
    if (isObjectStorageEnabled()) {
      const s3 = await uploadToObjectStorage(file.filename, mimeForFile(file.filename)).catch(() => null)
      if (s3) fpath = s3
    } else if (row.type === 'image') {
      const compressed = await compressImageWithTinify(file.filename).catch(() => null)
      if (compressed) {
        fpath = compressed
        fields.compressedPath = compressed
      }
    }
    fields.filePath = fpath
    fields.fileSize = file.size
  }
  await updateContent(id, fields)
  const updated = await getContentRow(id)
  success(res, await decorateContent(updated!), '更新成功')
})

// ---- delete (auth, soft) ----
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const row = await getContentRow(id)
  if (!row) return error(res, 404, '内容不存在')
  if (!ownOrAdmin(req, row.user_id)) return error(res, 403, '无权删除该内容')
  await softDeleteContent(id)
  success(res, null, '已删除')
})

// ---- claim (auth) ----
router.post('/:content_id/claim', requireAuth, validate(claimSchema), async (req, res) => {
  const contentId = Number(req.params.content_id)
  if (!(await contentExists(contentId))) return error(res, 404, '内容不存在')
  const reason = typeof req.body.reason === 'string' ? req.body.reason : ''
  const id = await createClaim({ contentId, userId: req.user!.uid, reason })
  success(res, { id }, '认领申请已提交')
})

export default router
