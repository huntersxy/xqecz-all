import { Router } from 'express'
import {
  contentExists,
  createComment,
  createCommentReport,
  countComments,
  countTopLevelComments,
  getContentRow,
  getUserById,
  handleCommentReport,
  listCommentsTree,
  listCommentReports,
  softDeleteComment,
  getCommentRow,
} from '../db/index.js'
import pool from '../db/mysql.js'
import { parsePagination } from '../util/pagination.js'
import { success, paginated, error } from '../util/response.js'
import { requireAuth } from '../middleware/index.js'
import { upload } from '../util/media.js'
import { validate } from '../validation/validate.js'
import { commentAddSchema, commentReportSchema } from '../validation/schemas.js'
import type { Comment, CommentReport as CommentReportType } from '../types.js'

const router = Router()

function buildComment(row: any, user: { id: number; username: string } | undefined): Comment {
  return {
    id: row.id,
    content_id: row.content_id,
    user_id: row.user_id,
    text: row.text,
    parent_id: row.parent_id ?? null,
    is_banned: !!row.is_banned,
    created_at: Math.floor(new Date(row.created_at).getTime() / 1000),
    updated_at: Math.floor(new Date(row.updated_at).getTime() / 1000),
    user: user || { id: row.user_id, username: 'unknown' },
  }
}

// list (tree) for a content
router.get('/list/:content_id', async (req, res) => {
  const contentId = Number(req.params.content_id)
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const total = await countTopLevelComments(contentId)
  const list = await listCommentsTree(contentId, p.offset, p.limit)
  const totalPage = p.pageSize > 0 ? Math.ceil(total / p.pageSize) : 1
  res.status(200).json({
    code: 200,
    message: 'ok',
    data: { list, total, page: p.page, page_size: p.pageSize, total_page: totalPage },
  })
})

// count
router.get('/count/:content_id', async (req, res) => {
  const contentId = Number(req.params.content_id)
  success(res, { content_id: contentId, count: await countComments(contentId) })
})

// add
router.post('/add', requireAuth, upload.none(), validate(commentAddSchema), async (req, res) => {
  const contentId = Number(req.body.content_id)
  const text = req.body.text as string
  const parentIdRaw = req.body.parent_id
  const parentId = parentIdRaw !== undefined && parentIdRaw !== '' ? Number(parentIdRaw) : null
  if (!(await contentExists(contentId))) return error(res, 404, '内容不存在')
  if (!text || !text.trim()) return error(res, 400, '评论内容不能为空')
  if (parentId !== null) {
    const parent = await getCommentRow(parentId)
    if (!parent) return error(res, 400, '回复的评论不存在')
  }
  const id = await createComment({ contentId, userId: req.user!.uid, text: text.trim(), parentId })
  const row = await getCommentRow(id)
  const user = await getUserById(req.user!.uid)
  success(res, buildComment(row, user ? { id: user.id, username: user.username } : undefined), '评论成功', 201)
})

// delete (own or admin)
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const row = await getCommentRow(id)
  if (!row) return error(res, 404, '评论不存在')
  if (req.user!.uid !== row.user_id && !req.user!.is_admin)
    return error(res, 403, '无权删除该评论')
  await softDeleteComment(id)
  success(res, null, '已删除')
})

// report
router.post('/report', requireAuth, upload.none(), validate(commentReportSchema), async (req, res) => {
  const commentId = Number(req.body.comment_id)
  const reason = (req.body.reason as string) || ''
  const comment = await getCommentRow(commentId)
  if (!comment) return error(res, 404, '评论不存在')
  const id = await createCommentReport({ commentId, userId: req.user!.uid, reason })
  const [reportRows] = await pool.execute('SELECT * FROM comment_reports WHERE id = ?', [id])
  const report = (reportRows as any[])[0]
  const user = await getUserById(req.user!.uid)
  const data: CommentReportType = {
    id: report.id,
    comment_id: report.comment_id,
    user_id: report.user_id,
    reason: report.reason,
    handled: !!report.handled,
    created_at: report.created_at,
    Comment: { id: comment.id, text: comment.text },
    User: user ? { id: user.id, username: user.username } : undefined,
  }
  success(res, data, '举报已提交', 201)
})

export { listCommentReports, handleCommentReport }
export default router
