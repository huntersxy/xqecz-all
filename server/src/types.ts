// Shared TypeScript types for the Node full-stack server.
// Kept consistent with frontend/src/types (the API contract source of truth).

export type ContentType = 'video' | 'image' | 'text' | 'link'
export type AuditStatus = 'pending' | 'approved' | 'rejected'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: number
  username: string
  is_admin?: boolean
  is_banned?: boolean
  created_at?: number
  updated_at?: number
}

export interface UserBrief {
  id: number
  username: string
}

export interface Content {
  id: number
  title: string
  type: ContentType
  text?: string
  url?: string
  thumb?: string
  video?: string
  img?: string
  compressed?: string
  platform?: string
  file_size?: number
  user: User
  tags: string[]
  view_count: number
  audit_status?: AuditStatus
  created_at: number
  updated_at?: number
}

export interface RecommendContent {
  id: number
  title: string
  type: ContentType
  url: string
  thumb: string
  tags: string[]
  view_count: number
  user: UserBrief
  created_at: number
}

export interface Comment {
  id: number
  content_id: number
  user_id: number
  text: string
  parent_id: number | null
  is_banned: boolean
  created_at: number
  updated_at?: number
  user?: UserBrief
  parent?: { id: number; user_id: number; text: string; user?: UserBrief }
  replies?: Comment[]
}

export interface CommentReport {
  id: number
  comment_id: number
  user_id: number
  reason: string
  handled: boolean
  created_at: string
  Comment?: Pick<Comment, 'id' | 'text'>
  User?: User
}

export interface Poll {
  id: number
  title: string
  description: string
  options: string[]
  vote_count: number
  user_id: number
  user?: UserBrief
  created_at: string
  updated_at?: string
}

export interface PollDetail {
  poll: Poll
  vote_counts: Record<string, number>
  total_votes: number
  my_vote: number | null
}

export interface Claim {
  id: number
  content_id: number
  user_id: number
  user: UserBrief
  content: Content
  reason: string
  status: ClaimStatus
  remark: string
  created_at: string
  updated_at?: string
}

export interface ApiKey {
  id: number
  name: string
  key_prefix: string
  permissions: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: number
}

export interface ApiKeyCreated extends ApiKey {
  key: string
}

// Raw DB row shapes (MySQL DATETIME fields are strings)
export interface UserRow {
  id: number
  username: string
  password: string
  is_admin: number
  is_banned: number
  created_at: string
  updated_at: string
}

export interface ContentRow {
  id: number
  title: string
  type: string
  content: string
  file_path: string | null
  file_size: number
  thumb_path: string | null
  compressed_path: string | null
  url: string | null
  platform: string | null
  view_count: number
  user_id: number
  tags: string
  audit_status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}
