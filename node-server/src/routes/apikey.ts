import { Router } from 'express'
import {
  createApiKey,
  decorateApiKey,
  deleteApiKey,
  getApiKeyRow,
  listApiKeys,
  updateApiKey,
} from '../db/index.js'
import { success, error } from '../util/response.js'
import { requireAuth } from '../middleware/auth.js'
import { generateApiKey } from '../util/security.js'

const router = Router()
router.use(requireAuth)

// Create a new API key (raw key returned only once).
router.post('/', (req, res) => {
  const name = (req.body?.name as string) || 'default'
  const permissions = Array.isArray(req.body?.permissions)
    ? req.body.permissions.filter((p: unknown) => typeof p === 'string')
    : []
  const { raw, prefix, hash } = generateApiKey()
  const id = createApiKey({ userId: req.user!.uid, name, permissions, prefix, hash })
  const row = getApiKeyRow(id, req.user!.uid)
  success(
    res,
    { ...decorateApiKey(row), key: raw },
    'API 密钥已创建',
    201,
  )
})

// List keys (without the secret).
router.get('/', (req, res) => {
  const rows = listApiKeys(req.user!.uid)
  success(res, { list: rows.map((r) => decorateApiKey(r)) })
})

// Update a key.
router.put('/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = getApiKeyRow(id, req.user!.uid)
  if (!row) return error(res, 404, '密钥不存在')
  updateApiKey(id, req.user!.uid, {
    name: typeof req.body?.name === 'string' ? req.body.name : undefined,
    permissions: Array.isArray(req.body?.permissions)
      ? req.body.permissions.filter((p: unknown) => typeof p === 'string')
      : undefined,
    is_active: typeof req.body?.is_active === 'boolean' ? req.body.is_active : undefined,
  })
  success(res, decorateApiKey(getApiKeyRow(id, req.user!.uid)!))
})

// Delete a key.
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = getApiKeyRow(id, req.user!.uid)
  if (!row) return error(res, 404, '密钥不存在')
  deleteApiKey(id, req.user!.uid)
  success(res, null, '密钥已删除')
})

export default router
