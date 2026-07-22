import { Router } from 'express'
import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import {
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
  getUserById,
} from '../db/index.js'
import pool from '../db/mysql.js'
import { parsePagination } from '../util/pagination.js'
import { success, paginated, error } from '../util/response.js'
import { requireAdmin, requireAuth } from '../middleware/index.js'
import { UPLOAD_DIR, THUMB_DIR } from '../util/media.js'
import { generateThumbnail } from '../util/thumbnail.js'
import { validate } from '../validation/validate.js'
import {
  auditSchema,
  authorSchema,
  roleSchema,
  banSchema,
  claimHandleSchema,
} from '../validation/schemas.js'
import type { ClaimStatus, CommentReport as CommentReportType } from '../types.js'

const router = Router()
router.use(requireAuth, requireAdmin)

function formatUser(u: any) {
  return { id: u.id, username: u.username, is_admin: !!u.is_admin, is_banned: !!u.is_banned, created_at: u.created_at, updated_at: u.updated_at }
}

router.post('/audit/:id', validate(auditSchema), async (req, res) => {
  const id = Number(req.params.id)
  const row = await getContentRow(id)
  if (!row) return error(res, 404, '内容不存在')
  await setAuditStatus(id, req.body.status)
  const updated = await getContentRow(id)
  success(res, await decorateContent(updated!), '审核完成')
})

router.get('/pending', async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = await listContents({ offset: p.offset, limit: p.limit, auditStatus: 'pending', sortBy: 'created_at', order: 'asc' })
  paginated(res, await Promise.all(rows.map((r) => decorateContent(r))), total, p.page, p.pageSize)
})

router.get('/content/all', async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = await listContents({
    offset: p.offset, limit: p.limit,
    auditStatus: (req.query.audit_status as string) || undefined,
    type: (req.query.type as string) || undefined,
    tag: (req.query.tag as string) || undefined,
    keyword: (req.query.keyword as string) || undefined,
    sortBy: (req.query.sort_by as string) || 'created_at',
    order: (req.query.order as string) || 'desc',
  })
  paginated(res, await Promise.all(rows.map((r) => decorateContent(r))), total, p.page, p.pageSize)
})

router.put('/content/:id/author', validate(authorSchema), async (req, res) => {
  const id = Number(req.params.id)
  if (!(await getContentRow(id))) return error(res, 404, '内容不存在')
  const newUserId = Number(req.body.user_id)
  if (!(await getUserById(newUserId))) return error(res, 400, '目标用户不存在')
  const { oldUserId, newUsername } = await updateContentAuthor(id, newUserId)
  success(res, { content_id: id, old_user_id: oldUserId, new_user_id: newUserId, new_username: newUsername })
})

router.post('/content/:id/regenerate-thumbnail', async (req, res) => {
  const id = Number(req.params.id)
  const row = await getContentRow(id)
  if (!row) return error(res, 404, '内容不存在')
  if (!row.file_path || (row.type !== 'image' && row.type !== 'video'))
    return success(res, { id, thumb_path: row.thumb_path || '' })
  const thumb = await generateThumbnail(row.file_path.split('/').pop()!).catch(() => null)
  if (thumb) await updateContent(id, { thumbPath: thumb })
  success(res, { id, thumb_path: thumb || row.thumb_path || '' })
})

router.post('/content/regenerate-all-thumbnails', async (_req, res) => {
  const [rows] = await pool.execute("SELECT id, file_path FROM contents WHERE deleted_at IS NULL AND file_path IS NOT NULL AND type IN ('image','video')")
  let count = 0
  for (const r of rows as { id: number; file_path: string }[]) {
    const thumb = await generateThumbnail(r.file_path.split('/').pop()!).catch(() => null)
    if (thumb) { await updateContent(r.id, { thumbPath: thumb }); count++ }
  }
  success(res, { count })
})

router.delete('/content/purge', async (_req, res) => {
  const count = await purgeDeletedContents()
  success(res, { count }, `已清理 ${count} 条`)
})

router.delete('/files/clean', async (_req, res) => {
  if (!existsSync(UPLOAD_DIR)) return success(res, { deleted: 0 })
  const referenced = new Set<string>()
  const [rows] = await pool.execute('SELECT file_path, thumb_path FROM contents WHERE deleted_at IS NULL')
  for (const r of rows as { file_path: string | null; thumb_path: string | null }[])
    for (const f of [r.file_path, r.thumb_path]) if (f) referenced.add(f.split('/').pop()!)
  let deleted = 0
  const targets: { dir: string; name: string }[] = []
  for (const f of readdirSync(UPLOAD_DIR, { withFileTypes: true }))
    if (f.isFile()) targets.push({ dir: UPLOAD_DIR, name: f.name })
  if (existsSync(THUMB_DIR))
    for (const f of readdirSync(THUMB_DIR, { withFileTypes: true }))
      if (f.isFile()) targets.push({ dir: THUMB_DIR, name: f.name })
  for (const t of targets)
    if (!referenced.has(t.name)) { try { unlinkSync(`${t.dir}/${t.name}`); deleted++ } catch { /* */ } }
  success(res, { deleted }, `已清理 ${deleted} 个孤立文件`)
})

router.get('/users', async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = await listUsers({ offset: p.offset, limit: p.limit, keyword: (req.query.keyword as string) || undefined })
  paginated(res, rows.map(formatUser), total, p.page, p.pageSize)
})

router.put('/users/:id/role', validate(roleSchema), async (req, res) => {
  const id = Number(req.params.id)
  if (!(await getUserById(id))) return error(res, 404, '用户不存在')
  await updateUserRole(id, req.body.is_admin === true)
  success(res, formatUser(await getUserById(id)))
})

router.put('/users/:id/ban', validate(banSchema), async (req, res) => {
  const id = Number(req.params.id)
  if (!(await getUserById(id))) return error(res, 404, '用户不存在')
  if (req.body.is_banned === true && req.user!.uid === id) return error(res, 400, '不能封禁自己')
  await updateUserBan(id, req.body.is_banned === true)
  success(res, formatUser(await getUserById(id)))
})

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (req.user!.uid === id) return error(res, 400, '不能删除自己')
  if (!(await getUserById(id))) return error(res, 404, '用户不存在')
  await deleteUser(id)
  success(res, null, '用户已删除')
})

router.get('/comments/reports', async (_req, res) => {
  const rows = await listCommentReports()
  success(res, rows.map((r: any) => ({
    id: r.id, comment_id: r.comment_id, user_id: r.user_id, reason: r.reason || '', handled: !!r.handled,
    created_at: r.created_at,
    Comment: r.comment_text ? { id: r.comment_id, text: r.comment_text } : undefined,
    User: r.user_username ? { id: r.user_id, username: r.user_username } : undefined,
  })))
})

router.post('/comments/reports/:id/handle', async (req, res) => {
  await handleCommentReport(Number(req.params.id))
  success(res, null, '举报已处理')
})

router.get('/claims', async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = await listClaims({ offset: p.offset, limit: p.limit, status: (req.query.status as string) || undefined })
  paginated(res, await Promise.all(rows.map((r) => decorateClaim(r))), total, p.page, p.pageSize)
})

router.post('/claims/:id/handle', validate(claimHandleSchema), async (req, res) => {
  const id = Number(req.params.id)
  if (!(await getClaim(id))) return error(res, 404, '认领申请不存在')
  await handleClaim(id, req.body.action, typeof req.body.remark === 'string' ? req.body.remark : '', req.user!.uid)
  success(res, null, '认领已处理')
})

export default router
