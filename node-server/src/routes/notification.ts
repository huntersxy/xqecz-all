import { Router } from 'express'
import {
  countUnread,
  createNotification,
  listNotifications,
  markAllRead,
  markRead,
  registerDevice,
  unregisterDevice,
} from '../db/index.js'
import { parsePagination } from '../util/pagination.js'
import { success, error } from '../util/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../validation/validate.js'
import { deviceSchema } from '../validation/schemas.js'

const router = Router()

// Register a push device token.
router.post('/device', requireAuth, validate(deviceSchema), (req, res) => {
  const { token, platform, device_info } = req.body
  registerDevice({
    userId: req.user!.uid,
    token: String(token),
    platform: typeof platform === 'string' ? platform : '',
    deviceInfo: typeof device_info === 'string' ? device_info : '',
  })
  success(res, null, '设备已注册')
})

// Unregister a device by token.
router.delete('/device/:token', requireAuth, (req, res) => {
  unregisterDevice(req.params.token)
  success(res, null, '设备已注销')
})

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

export { createNotification }
export default router
