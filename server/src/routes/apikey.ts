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
import { requireAuth } from '../middleware/index.js'
import { generateApiKey } from '../util/security.js'
import { validate } from '../validation/validate.js'
import { apiKeyCreateSchema, apiKeyUpdateSchema } from '../validation/schemas.js'

const router = Router()
router.use(requireAuth)

// Create a new API key (raw key returned only once).
router.post('/', validate(apiKeyCreateSchema), async (req, res) => {
  const name = (req.body.name as string) || 'default'
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : []
  const { raw, prefix, hash } = generateApiKey()
  const id = await createApiKey({ userId: req.user!.uid, name, permissions, prefix, hash })
  const row = await getApiKeyRow(id, req.user!.uid)
  success(
    res,
    { ...(await decorateApiKey(row)), key: raw },
    'API 密钥已创建',
    201,
  )
})

// List keys (without the secret).
router.get('/', async (req, res) => {
  const rows = await listApiKeys(req.user!.uid)
  const list = await Promise.all(rows.map((r) => decorateApiKey(r)))
  success(res, { list })
})

// Update a key.
router.put('/:id', validate(apiKeyUpdateSchema), async (req, res) => {
  const id = Number(req.params.id)
  const row = await getApiKeyRow(id, req.user!.uid)
  if (!row) return error(res, 404, '密钥不存在')
  await updateApiKey(id, req.user!.uid, {
    name: typeof req.body.name === 'string' && req.body.name ? req.body.name : undefined,
    permissions: Array.isArray(req.body.permissions) ? req.body.permissions : undefined,
    is_active: typeof req.body.is_active === 'boolean' ? req.body.is_active : undefined,
  })
  const updated = await getApiKeyRow(id, req.user!.uid)
  success(res, await decorateApiKey(updated!))
})

// Delete a key.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const row = await getApiKeyRow(id, req.user!.uid)
  if (!row) return error(res, 404, '密钥不存在')
  await deleteApiKey(id, req.user!.uid)
  success(res, null, '密钥已删除')
})

export default router
