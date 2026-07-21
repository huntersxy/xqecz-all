import { Router } from 'express'
import {
  countUnread,
  listNotifications,
  markAllRead,
  markRead,
} from '../db/index.js'
import { parsePagination } from '../util/pagination.js'
import { success, error } from '../util/response.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// List notifications (array).
router.get('/list', requireAuth, (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows } = listNotifications(req.user!.uid, { offset: p.offset, limit: p.limit })
  success(res, rows)
})

// Unread count.
router.get('/unread-count', requireAuth, (req, res) => {
  success(res, { count: countUnread(req.user!.uid) })
})

// Mark one as read.
router.put('/:id/read', requireAuth, (req, res) => {
  markRead(Number(req.params.id), req.user!.uid)
  success(res, null, '已标记为已读')
})

// Mark all as read.
router.put('/read-all', requireAuth, (req, res) => {
  markAllRead(req.user!.uid)
  success(res, null, '全部已读')
})

export default router
