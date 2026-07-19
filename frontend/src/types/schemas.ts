import { z } from 'zod'

// ── 基础常量与类型(单一来源,types/index.ts re-export)──
const contentTypeValues = ['video', 'image', 'text', 'link'] as const
export const CONTENT_TYPES = contentTypeValues
export type ContentType = (typeof CONTENT_TYPES)[number]

// ── 通用宽松 transform(匹配原 normalize 的 `Number()||0` / `typeof==='string'? : ''` 兜底语义)──
// 用 z.unknown + transform 而不是 z.coerce,避免 NaN 不触发 default 的边界问题;
// 严格校验留给"值域有界的字段"(type/audit_status)用 enum/catch。
const num = z.unknown().transform((v) => Number(v) || 0)
const str = z.unknown().transform((v) => (typeof v === 'string' ? v : ''))
const bool = z.unknown().transform((v) => Boolean(v))
const tagsArr = z
  .unknown()
  .transform((v) =>
    Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : [],
  )

// ── User(完整) ──
// 与原 normalize 等价:id/username 必填(契约保证),其他 optional 兜空。
export const UserSchema = z.object({
  id: num,
  username: str,
  is_admin: bool.optional(),
  is_banned: bool.optional(),
  created_at: num.optional(),
  updated_at: num.optional(),
})
export type User = z.infer<typeof UserSchema>

// ── User(简介,推荐页用) ──
const UserBriefSchema = z.object({
  id: num,
  username: str,
})

// ── RecommendContent(推荐页) ──
// type 非法值兜底 'image'(匹配原 normalize `type || 'image'`)。
export const RecommendContentSchema = z.object({
  id: num,
  title: str,
  type: z
    .any()
    .transform((v) =>
      (CONTENT_TYPES as readonly string[]).includes(v) ? (v as ContentType) : 'image',
    ),
  url: str.optional().default(''),
  thumb: str.optional().default(''),
  tags: tagsArr,
  view_count: num,
  user: UserBriefSchema,
  created_at: num,
})
export type RecommendContent = z.infer<typeof RecommendContentSchema>

// ── Content(列表/详情) ──
// type 非法值兜底 'text'(匹配原 normalize `!VALID_TYPES ? 'text' : type`);
// audit_status 用严格 enum,非法值抛错(契约校验,后端必须返回合法值)。
export const ContentSchema = z.object({
  id: num,
  title: str,
  type: z
    .any()
    .transform((v) =>
      (CONTENT_TYPES as readonly string[]).includes(v) ? (v as ContentType) : 'text',
    ),
  text: str.optional().default(''),
  url: str.optional().default(''),
  thumb: str.optional().default(''),
  video: str.optional().default(''),
  img: str.optional().default(''),
  file_size: num.optional().default(0),
  user: UserSchema,
  tags: tagsArr,
  view_count: num,
  audit_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  created_at: num,
  updated_at: num.optional(),
})
export type Content = z.infer<typeof ContentSchema>

// ── Comment ──
export const CommentSchema: z.ZodType<{
  id: number
  content_id: number
  user_id: number
  text: string
  parent_id: number | null
  is_banned: boolean
  created_at: number
  updated_at?: number
  user?: { id: number; username: string }
  parent?: { id: number; user_id: number; text: string; user?: { id: number; username: string } }
  replies?: Comment[]
}> = z.object({
  id: num,
  content_id: num,
  user_id: num,
  text: str,
  parent_id: num.nullable(),
  is_banned: bool,
  created_at: num,
  updated_at: num.optional(),
  user: UserBriefSchema.optional(),
  parent: z.object({
    id: num,
    user_id: num,
    text: str,
    user: UserBriefSchema.optional(),
  }).optional(),
  replies: z.lazy(() => z.array(CommentSchema)).optional(),
})
export type Comment = z.infer<typeof CommentSchema>

// ── Poll ──
export const PollSchema = z.object({
  id: num,
  title: str,
  description: str,
  options: z.unknown().transform((v) => Array.isArray(v) ? v.filter((o): o is string => typeof o === 'string') : []),
  vote_count: num,
  user_id: num,
  user: UserBriefSchema.optional(),
  created_at: str,
  updated_at: str.optional(),
})
export type Poll = z.infer<typeof PollSchema>

// ── Claim ──
export const ClaimSchema = z.object({
  id: num,
  content_id: num,
  user_id: num,
  user: UserBriefSchema,
  content: ContentSchema,
  reason: str,
  status: z.enum(['pending', 'approved', 'rejected']),
  remark: str,
  created_at: str,
  updated_at: str.optional(),
})
export type Claim = z.infer<typeof ClaimSchema>
