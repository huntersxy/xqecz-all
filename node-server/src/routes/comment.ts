import { Router } from 'express'
import {
  contentExists,
  createComment,
  createCommentReport,
  createNotification,
  countComments,
  countTopLevelComments,
  getContentRow,
  getUserById,
  handleCommentReport,
  listCommentsTree,
  listCommentReports,
  softDeleteComment,
  db,
} from '../db/index.js'
import { parsePagination, parseTags } from '../util/pagination.js'
import { success, paginated, error } from '../util/response.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../util/media.js'
import { validate } from '../validation/validate.js'
import { commentAddSchema, commentReportSchema } from '../validation/schemas.js'
import type { Comment, CommentReport as CommentReportType } from '../types.js'

const router = Router()

function buildComment(row: any): Comment {
  const u = row.user_id ? getUserById(row.user_id) : undefined
  return {
    id: row.id,
    content_id: row.content_id,
    user_id: row.user_id,
    text: row.text,
    parent_id: row.parent_id ?? null,
    is_banned: !!row.is_banned,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: u ? { id: u.id, username: u.username } : { id: row.user_id, username: 'unknown' },
  }
}

// list (tree) for a content
router.get('/list/:content_id', (req, res) => {
  const contentId = Number(req.params.content_id)
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const total = countTopLevelComments(contentId)
  const list = listCommentsTree(contentId, p.offset, p.limit)
  const totalPage = p.pageSize > 0 ? Math.ceil(total / p.pageSize) : 1
  res.status(200).json({
    code: 200,
    message: 'ok',
    data: { list, total, page: p.page, page_size: p.pageSize, total_page: totalPage },
  })
})

// count
router.get('/count/:content_id', (req, res) => {
  const contentId = Number(req.params.content_id)
  success(res, { content_id: contentId, count: countComments(contentId) })
})

// add
router.post('/add', requireAuth, upload.none(), validate(commentAddSchema), (req, res) => {
  const contentId = Number(req.body.content_id)
  const text = req.body.text as string
  const parentIdRaw = req.body.parent_id
  const parentId = parentIdRaw !== undefined && parentIdRaw !== '' ? Number(parentIdRaw) : null
  if (!contentExists(contentId)) return error(res, 404, '内容不存在')
  if (!text || !text.trim()) return error(res, 400, '评论内容不能为空')
  if (parentId !== null) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL').get(parentId)
    if (!parent) return error(res, 400, '回复的评论不存在')
  }
  const id = createComment({ contentId, userId: req.user!.uid, text: text.trim(), parentId })
  // notify content owner (unless they commented on their own content)
  const content = getContentRow(contentId)
  if (content && content.user_id !== req.user!.uid) {
    createNotification({
      userId: content.user_id,
      type: parentId ? 'reply' : 'comment',
      title: parentId ? '收到一条回复' : '收到一条新评论',
      content: text.trim().slice(0, 120),
      relatedId: contentId,
    })
  }
  const row = db
    .prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL')
    .get(id) as any
  success(res, buildComment(row), '评论成功', 201)
})

// delete (own or admin)
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(id) as any
  if (!row) return error(res, 404, '评论不存在')
  if (req.user!.uid !== row.user_id && !req.user!.is_admin)
    return error(res, 403, '无权删除该评论')
  softDeleteComment(id)
  success(res, null, '已删除')
})

// report
router.post('/report', requireAuth, upload.none(), validate(commentReportSchema), (req, res) => {
  const commentId = Number(req.body.comment_id)
  const reason = (req.body.reason as string) || ''
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(commentId) as any
  if (!comment) return error(res, 404, '评论不存在')
  const id = createCommentReport({ commentId, userId: req.user!.uid, reason })
  const report = db.prepare('SELECT * FROM comment_reports WHERE id = ?').get(id) as any
  const user = getUserById(req.user!.uid)
  const data: CommentReportType = {
    id: report.id,
    comment_id: report.comment_id,
    user_id: report.user_id,
    reason: report.reason,
    handled: !!report.handled,
    created_at: new Date(report.created_at * 1000).toISOString(),
    Comment: { id: comment.id, text: comment.text },
    User: user ? { id: user.id, username: user.username } : undefined,
  }
  success(res, data, '举报已提交', 201)
})

export { listCommentReports, handleCommentReport }
export default router
