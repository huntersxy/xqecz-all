import { Router } from 'express'
import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import {
  createNotification,
  decorateClaim,
  decorateContent,
  deleteUser,
  getClaim,
  getContentRow,
  handleClaim,
  handleCommentReport,
  listClaims,
  listCommentReports,
  listContents,
  listUsers,
  purgeDeletedContents,
  setAuditStatus,
  updateContent,
  updateContentAuthor,
  updateUserBan,
  updateUserRole,
  db,
} from '../db/index.js'
import { parsePagination } from '../util/pagination.js'
import { success, paginated, error } from '../util/response.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { UPLOAD_DIR, THUMB_DIR } from '../util/media.js'
import { generateThumbnail } from '../util/thumbnail.js'
import type { ClaimStatus, CommentReport as CommentReportType } from '../types.js'

const router = Router()
router.use(requireAuth, requireAdmin)

// Audit a content item.
router.post('/audit/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = getContentRow(id)
  if (!row) return error(res, 404, '内容不存在')
  const status = req.body?.status as string
  if (status !== 'approved' && status !== 'rejected') return error(res, 400, 'status 必须是 approved 或 rejected')
  const remark = typeof req.body?.remark === 'string' ? req.body.remark : ''
  setAuditStatus(id, status)
  createNotification({
    userId: row.user_id,
    type: 'audit',
    title: status === 'approved' ? '内容已通过审核' : '内容未通过审核',
    content: remark || (status === 'approved' ? '您的作品已通过审核' : '您的作品未通过审核，请修改后重新提交'),
    relatedId: id,
  })
  success(res, decorateContent(getContentRow(id)!), '审核完成')
})

// Pending (to-be-reviewed) contents.
router.get('/pending', (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = listContents({
    offset: p.offset,
    limit: p.limit,
    auditStatus: 'pending',
    sortBy: 'created_at',
    order: 'asc',
  })
  paginated(
    res,
    rows.map((r) => decorateContent(r)),
    total,
    p.page,
    p.pageSize,
  )
})

// All contents (admin) with optional filters.
router.get('/content/all', (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = listContents({
    offset: p.offset,
    limit: p.limit,
    auditStatus: (req.query.audit_status as string) || undefined,
    type: (req.query.type as string) || undefined,
    tag: (req.query.tag as string) || undefined,
    keyword: (req.query.keyword as string) || undefined,
    sortBy: (req.query.sort_by as string) || 'created_at',
    order: (req.query.order as string) || 'desc',
  })
  paginated(
    res,
    rows.map((r) => decorateContent(r)),
    total,
    p.page,
    p.pageSize,
  )
})

// Change content author.
router.put('/content/:id/author', (req, res) => {
  const id = Number(req.params.id)
  if (!getContentRow(id)) return error(res, 404, '内容不存在')
  const newUserId = Number(req.body?.user_id)
  const newUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(newUserId) as
    | { id: number; username: string }
    | undefined
  if (!newUser) return error(res, 400, '目标用户不存在')
  const { oldUserId, newUsername } = updateContentAuthor(id, newUserId)
  success(res, {
    content_id: id,
    old_user_id: oldUserId,
    new_user_id: newUserId,
    new_username: newUsername,
  })
})

// Regenerate a single thumbnail from the stored media file.
router.post('/content/:id/regenerate-thumbnail', async (req, res) => {
  const id = Number(req.params.id)
  const row = getContentRow(id)
  if (!row) return error(res, 404, '内容不存在')
  if (!row.file_path || (row.type !== 'image' && row.type !== 'video')) {
    return success(res, { id, thumb_path: row.thumb_path || '' })
  }
  const filename = row.file_path.split('/').pop() as string
  const thumb = await generateThumbnail(filename).catch(() => null)
  if (thumb) updateContent(id, { thumbPath: thumb })
  success(res, { id, thumb_path: thumb || row.thumb_path || '' })
})

// Regenerate thumbnails for every image/video content that has a media file.
router.post('/content/regenerate-all-thumbnails', async (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, file_path FROM contents WHERE deleted_at IS NULL AND file_path IS NOT NULL AND type IN ('image','video')",
    )
    .all() as { id: number; file_path: string }[]
  let count = 0
  for (const r of rows) {
    const filename = r.file_path.split('/').pop() as string
    const thumb = await generateThumbnail(filename).catch(() => null)
    if (thumb) {
      updateContent(r.id, { thumbPath: thumb })
      count++
    }
  }
  success(res, { count })
})

// Purge soft-deleted contents.
router.delete('/content/purge', (_req, res) => {
  const count = purgeDeletedContents()
  success(res, { count }, `已清理 ${count} 条`)
})

// Clean orphaned files in the uploads directory (originals + thumbnails subdir).
router.delete('/files/clean', (_req, res) => {
  if (!existsSync(UPLOAD_DIR)) return success(res, { deleted: 0 })
  const referenced = new Set<string>()
  const rows = db
    .prepare('SELECT file_path, thumb_path FROM contents WHERE deleted_at IS NULL')
    .all() as { file_path: string | null; thumb_path: string | null }[]
  for (const r of rows) {
    for (const f of [r.file_path, r.thumb_path]) {
      if (f) referenced.add(f.split('/').pop() as string)
    }
  }
  // Scan both originals and the thumbs subdirectory (skip dir entries).
  let deleted = 0
  const targets: { dir: string; name: string }[] = []
  for (const f of readdirSync(UPLOAD_DIR, { withFileTypes: true })) {
    if (f.isFile()) targets.push({ dir: UPLOAD_DIR, name: f.name })
  }
  if (existsSync(THUMB_DIR)) {
    for (const f of readdirSync(THUMB_DIR, { withFileTypes: true })) {
      if (f.isFile()) targets.push({ dir: THUMB_DIR, name: f.name })
    }
  }
  for (const t of targets) {
    if (!referenced.has(t.name)) {
      try {
        unlinkSync(`${t.dir}/${t.name}`)
        deleted += 1
      } catch {
        /* ignore */
      }
    }
  }
  success(res, { deleted }, `已清理 ${deleted} 个孤立文件`)
})

// List users.
router.get('/users', (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = listUsers({
    offset: p.offset,
    limit: p.limit,
    keyword: (req.query.keyword as string) || undefined,
  })
  paginated(
    res,
    rows.map((u) => ({
      id: u.id,
      username: u.username,
      is_admin: !!u.is_admin,
      is_banned: !!u.is_banned,
      created_at: u.created_at,
      updated_at: u.updated_at,
    })),
    total,
    p.page,
    p.pageSize,
  )
})

// Update user role.
router.put('/users/:id/role', (req, res) => {
  const id = Number(req.params.id)
  const isAdmin = req.body?.is_admin === true || req.body?.is_admin === 'true'
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
  if (!u) return error(res, 404, '用户不存在')
  updateUserRole(id, isAdmin)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
  success(res, {
    id: updated.id,
    username: updated.username,
    is_admin: !!updated.is_admin,
    is_banned: !!updated.is_banned,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  })
})

// Ban / unban user.
router.put('/users/:id/ban', (req, res) => {
  const id = Number(req.params.id)
  const isBanned = req.body?.is_banned === true || req.body?.is_banned === 'true'
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
  if (!u) return error(res, 404, '用户不存在')
  if (isBanned && req.user!.uid === id) return error(res, 400, '不能封禁自己')
  updateUserBan(id, isBanned)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
  success(res, {
    id: updated.id,
    username: updated.username,
    is_admin: !!updated.is_admin,
    is_banned: !!updated.is_banned,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  })
})

// Delete (ban) user.
router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id)
  if (req.user!.uid === id) return error(res, 400, '不能删除自己')
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
  if (!u) return error(res, 404, '用户不存在')
  deleteUser(id)
  success(res, null, '用户已删除')
})

// List comment reports.
router.get('/comments/reports', (_req, res) => {
  const rows = listCommentReports()
  const data: CommentReportType[] = rows.map((r) => ({
    id: r.id,
    comment_id: r.comment_id,
    user_id: r.user_id,
    reason: r.reason || '',
    handled: !!r.handled,
    created_at: new Date(r.created_at * 1000).toISOString(),
    Comment: r.comment_text ? { id: r.comment_id, text: r.comment_text } : undefined,
    User: r.user_username ? { id: r.user_id, username: r.user_username } : undefined,
  }))
  success(res, data)
})

// Handle a comment report.
router.post('/comments/reports/:id/handle', (req, res) => {
  const id = Number(req.params.id)
  handleCommentReport(id)
  success(res, null, '举报已处理')
})

// List claims.
router.get('/claims', (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = listClaims({
    offset: p.offset,
    limit: p.limit,
    status: (req.query.status as string) || undefined,
  })
  paginated(
    res,
    rows.map((r) => decorateClaim(r)),
    total,
    p.page,
    p.pageSize,
  )
})

// Handle a claim.
router.post('/claims/:id/handle', (req, res) => {
  const id = Number(req.params.id)
  if (!getClaim(id)) return error(res, 404, '认领申请不存在')
  const action = req.body?.action as 'approve' | 'reject'
  if (action !== 'approve' && action !== 'reject') return error(res, 400, 'action 必须是 approve 或 reject')
  const remark = typeof req.body?.remark === 'string' ? req.body.remark : ''
  handleClaim(id, action, remark, req.user!.uid)
  success(res, null, '认领已处理')
})

export default router
