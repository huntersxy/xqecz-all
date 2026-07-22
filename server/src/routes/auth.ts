import { Router } from 'express'
import {
  countUsers,
  createUser,
  getUserByUsername,
  getUserById,
  rowToUser,
} from '../db/index.js'
import { hashPassword, verifyPassword, generateSessionID, COOKIE_NAME } from '../util/security.js'
import { setSession, delSession } from '../db/redis.js'
import { error, success } from '../util/response.js'
import { rateLimit, requireAuth } from '../middleware/index.js'
import { validate } from '../validation/validate.js'
import { registerSchema, loginSchema, initAdminSchema } from '../validation/schemas.js'

const router = Router()

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}

function setAuthCookie(res: import('express').Response, sessionID: string): void {
  res.cookie(COOKIE_NAME, sessionID, SESSION_COOKIE_OPTS)
}
function clearAuthCookie(res: import('express').Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

function validUsername(u: string): boolean {
  return typeof u === 'string' && u.length >= 2 && u.length <= 32 && /^[\w一-龥]+$/.test(u)
}

router.post(
  '/register',
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'reg' }),
  validate(registerSchema),
  async (req, res) => {
    const { username, password } = req.body
    if (!validUsername(username)) return error(res, 400, '用户名需为2-32位字母、数字、下划线或中文')
    if (await getUserByUsername(username)) return error(res, 409, '用户名已存在')
    const id = await createUser(username, await hashPassword(password), false)
    const sessionID = generateSessionID()
    await setSession(sessionID, id)
    setAuthCookie(res, sessionID)
    success(res, { user_id: id }, '注册成功', 201)
  },
)

router.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'login' }),
  validate(loginSchema),
  async (req, res) => {
    const { username, password } = req.body
    const user = await getUserByUsername(username)
    if (!user || !(await verifyPassword(password, user.password)))
      return error(res, 401, '用户名或密码错误')
    if (user.is_banned) return error(res, 403, '账号已被封禁')
    const sessionID = generateSessionID()
    await setSession(sessionID, user.id)
    setAuthCookie(res, sessionID)
    success(res, { user: rowToUser(user) }, '登录成功')
  },
)

router.post('/logout', async (req, res) => {
  const sessionID = req.cookies?.[COOKIE_NAME]
  if (sessionID) await delSession(sessionID)
  clearAuthCookie(res)
  success(res, null, '已退出登录')
})

// Bootstrap the first admin account. Idempotent: only works when no users exist.
router.post(
  '/init-admin',
  rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'init' }),
  validate(initAdminSchema),
  async (req, res) => {
    if ((await countUsers()) > 0) return error(res, 409, '系统已初始化')
    const { username, password } = req.body
    const id = await createUser(username, await hashPassword(password), true)
    const sessionID = generateSessionID()
    await setSession(sessionID, id)
    setAuthCookie(res, sessionID)
    success(res, { user_id: id }, '管理员已创建')
  },
)

router.get('/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.user!.uid)
  if (!user) return error(res, 401, '用户不存在')
  success(res, rowToUser(user))
})

export default router
