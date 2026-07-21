import { z } from 'zod'

// ── Lenient primitives (mirror frontend/src/types/schemas.ts transform semantics) ──
// We coerce unknown → typed so hand-rolled `Number()`/`typeof` guards in handlers
// are replaced by a single declarative contract that also rejects malformed input.
const str = z.unknown().transform((v) => (typeof v === 'string' ? v : ''))
const num = z.unknown().transform((v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
})
const boolCoerce = z.unknown().transform((v) => v === true || v === 'true' || v === 1)
const tagsCoerce = z.unknown().transform((v) => {
  if (Array.isArray(v)) return v.filter((t): t is string => typeof t === 'string')
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean)
  return []
})
const permissionsCoerce = z.unknown().transform((v) =>
  Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string') : [],
)
const stringArray = z
  .unknown()
  .transform((v) =>
    Array.isArray(v)
      ? (v.filter((o): o is string => typeof o === 'string').filter(Boolean) as string[])
      : typeof v === 'string'
        ? (v.split('\n').map((s) => s.trim()).filter(Boolean) as string[])
        : [],
  )

const CONTENT_TYPES = ['video', 'image', 'text', 'link'] as const

// ── Auth ──
export const registerSchema = z
  .object({
    username: z.string().min(2, '用户名至少2位').max(32, '用户名最多32位'),
    password: z.string().min(6, '密码至少6位'),
  })
  .passthrough()

export const loginSchema = z
  .object({
    username: z.string().min(1, '用户名不能为空'),
    password: z.string().min(1, '密码不能为空'),
  })
  .passthrough()

export const initAdminSchema = z
  .object({
    username: z.string().min(1).default('admin'),
    password: z.string().min(1).default('admin123'),
  })
  .passthrough()

// ── Content ──
export const uploadSchema = z
  .object({
    title: z.string().min(1, '标题不能为空'),
    type: z.enum(CONTENT_TYPES),
    content: str.optional(),
    url: str.optional(),
    tags: tagsCoerce.optional(),
  })
  .passthrough()

export const updateContentSchema = z
  .object({
    title: str.optional(),
    content: str.optional(),
    url: str.optional(),
    tags: tagsCoerce.optional(),
  })
  .passthrough()

export const claimSchema = z.object({ reason: str.optional() }).passthrough()

// ── Comment ──
export const commentAddSchema = z
  .object({
    content_id: num,
    text: z.string().min(1, '评论内容不能为空'),
    parent_id: num.optional(),
  })
  .passthrough()

export const commentReportSchema = z
  .object({
    comment_id: num,
    reason: str.optional(),
  })
  .passthrough()

// ── Poll ──
export const pollCreateSchema = z
  .object({
    title: z.string().min(1, '投票标题不能为空'),
    description: str.optional(),
    options: stringArray,
  })
  .passthrough()
  .refine((d) => d.options.length >= 2, { message: '至少需要两个选项' })

export const pollVoteSchema = z.object({ option_index: num }).passthrough()

// ── API keys ──
export const apiKeyCreateSchema = z
  .object({
    name: str.optional(),
    permissions: permissionsCoerce.optional(),
  })
  .passthrough()

export const apiKeyUpdateSchema = z
  .object({
    name: str.optional(),
    permissions: permissionsCoerce.optional(),
    is_active: boolCoerce.optional(),
  })
  .passthrough()

// ── Admin ──
export const auditSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    remark: str.optional(),
  })
  .passthrough()

export const authorSchema = z.object({ user_id: num }).passthrough()

export const roleSchema = z.object({ is_admin: boolCoerce }).passthrough()

export const banSchema = z.object({ is_banned: boolCoerce }).passthrough()

export const claimHandleSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    remark: str.optional(),
  })
  .passthrough()
