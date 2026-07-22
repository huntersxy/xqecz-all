import pool from './mysql.js'
import type {
  ApiKey,
  Claim,
  ClaimStatus,
  Comment,
  Content,
  ContentRow,
  ContentType,
  Poll,
  RecommendContent,
  User,
  UserBrief,
  UserRow,
} from '../types.js'
import { parseTags } from '../util/pagination.js'

/* ------------------------------------------------------------------ */
/* Schema migration — aligns with Go backend (internal/util/database.go) */
/* ------------------------------------------------------------------ */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  is_banned TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL,
  content TEXT,
  file_path VARCHAR(500),
  file_size BIGINT DEFAULT 0,
  thumb_path VARCHAR(500),
  compressed_path VARCHAR(500) DEFAULT '',
  url VARCHAR(500),
  platform VARCHAR(20),
  view_count BIGINT DEFAULT 0,
  user_id BIGINT UNSIGNED NOT NULL,
  tags TEXT,
  audit_status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX idx_contents_user_id (user_id),
  INDEX idx_contents_audit_status (audit_status),
  INDEX idx_contents_deleted_at (deleted_at),
  INDEX idx_contents_created_at (created_at),
  INDEX idx_contents_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  parent_id BIGINT UNSIGNED,
  is_banned TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX idx_comments_content_id (content_id),
  INDEX idx_comments_user_id (user_id),
  INDEX idx_comments_parent_id (parent_id),
  INDEX idx_comments_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255),
  handled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_comment_reports_comment_id (comment_id),
  INDEX idx_comment_reports_user_id (user_id),
  INDEX idx_comment_reports_handled (handled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS polls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  options TEXT,
  vote_count BIGINT DEFAULT 0,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX idx_polls_user_id (user_id),
  INDEX idx_polls_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS poll_votes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  poll_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED,
  visitor_id VARCHAR(64),
  option_index INT NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_poll_votes_user (poll_id, user_id),
  UNIQUE KEY uk_poll_votes_visitor (poll_id, visitor_id),
  INDEX idx_poll_votes_poll_id (poll_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS claims (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by BIGINT UNSIGNED,
  remark TEXT,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_claims_content_id (content_id),
  INDEX idx_claims_user_id (user_id),
  INDEX idx_claims_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_keys (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  permissions TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_used_at DATETIME(3),
  expires_at DATETIME(3),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX idx_api_keys_user_id (user_id),
  INDEX idx_api_keys_key_prefix (key_prefix),
  INDEX idx_api_keys_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`

export async function migrate(): Promise<void> {
  const stmts = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)
  for (const sql of stmts) {
    await pool.execute(sql)
  }
  console.log('[db] migration completed')
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

// MySQL DATETIME(3) → epoch seconds (for frontend compatibility)
function dtToEpoch(dt: string | null | undefined): number {
  if (!dt) return 0
  return Math.floor(new Date(dt).getTime() / 1000)
}

// epoch seconds → MySQL DATETIME string
function epochToDt(epoch: number): string {
  return new Date(epoch * 1000).toISOString().replace('T', ' ').replace('Z', '')
}

/* ------------------------------------------------------------------ */
/* Transform helpers                                                  */
/* ------------------------------------------------------------------ */

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    is_admin: !!row.is_admin,
    is_banned: !!row.is_banned,
    created_at: dtToEpoch(row.created_at as unknown as string),
    updated_at: dtToEpoch(row.updated_at as unknown as string),
  }
}

function rowToUserBrief(row: UserRow): UserBrief {
  return { id: row.id, username: row.username }
}

function rowToContent(row: ContentRow, user: UserBrief | User): Content {
  const imgUrl = row.type === 'image' ? row.compressed_path || row.file_path || '' : ''
  return {
    id: row.id,
    title: row.title,
    type: row.type as ContentType,
    text: row.content || '',
    url: row.url || '',
    thumb: row.thumb_path || '',
    video: row.type === 'video' ? row.file_path || '' : '',
    img: imgUrl,
    compressed: row.compressed_path || undefined,
    platform: (row.platform as Content['platform']) || undefined,
    file_size: row.file_size || 0,
    user: user as User,
    tags: parseTags(row.tags),
    view_count: row.view_count || 0,
    audit_status: row.audit_status as Content['audit_status'],
    created_at: dtToEpoch(row.created_at as unknown as string),
    updated_at: dtToEpoch(row.updated_at as unknown as string),
  }
}

function rowToRecommend(row: ContentRow, user: UserBrief): RecommendContent {
  return {
    id: row.id,
    title: row.title,
    type: row.type as ContentType,
    url: row.url || '',
    thumb: row.thumb_path || '',
    tags: parseTags(row.tags),
    view_count: row.view_count || 0,
    user,
    created_at: dtToEpoch(row.created_at as unknown as string),
  }
}

async function getUserMap(ids: number[]): Promise<Map<number, UserRow>> {
  const map = new Map<number, UserRow>()
  const uniq = [...new Set(ids.filter((id) => id > 0))]
  if (uniq.length === 0) return map
  const placeholders = uniq.map(() => '?').join(',')
  const [rows] = await pool.execute(`SELECT * FROM users WHERE id IN (${placeholders})`, uniq)
  for (const r of rows as UserRow[]) map.set(r.id, r)
  return map
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export async function createUser(username: string, passwordHash: string, isAdmin = false): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO users (username, password, is_admin, is_banned) VALUES (?, ?, ?, 0)',
    [username, passwordHash, isAdmin ? 1 : 0],
  )
  return Number((result as any).insertId)
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])
  return (rows as UserRow[])[0] || undefined
}

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
  return (rows as UserRow[])[0] || undefined
}

export async function countUsers(): Promise<number> {
  const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM users')
  return (rows as any)[0].c
}

export async function listUsers(opts: { offset: number; limit: number; keyword?: string }): Promise<{
  rows: UserRow[]
  total: number
}> {
  const where = opts.keyword ? 'WHERE username LIKE ?' : ''
  const params: unknown[] = opts.keyword ? [`%${opts.keyword}%`] : []
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS c FROM users ${where}`, params)
  const total = (countRows as any)[0].c
  const [rows] = await pool.execute(
    `SELECT * FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, opts.limit, opts.offset],
  )
  return { rows: rows as UserRow[], total }
}

export async function updateUserRole(id: number, isAdmin: boolean): Promise<void> {
  await pool.execute('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, id])
}

export async function updateUserBan(id: number, isBanned: boolean): Promise<void> {
  await pool.execute('UPDATE users SET is_banned = ? WHERE id = ?', [isBanned ? 1 : 0, id])
}

export async function deleteUser(id: number): Promise<void> {
  await pool.execute('UPDATE users SET is_banned = 1 WHERE id = ?', [id])
}

/* ------------------------------------------------------------------ */
/* Contents                                                           */
/* ------------------------------------------------------------------ */

interface CreateContentInput {
  title: string
  type: ContentType
  content?: string
  filePath?: string | null
  fileSize?: number
  thumbPath?: string | null
  compressedPath?: string | null
  url?: string | null
  platform?: string | null
  tags?: string[]
  userId: number
  auditStatus?: string
}

export async function createContent(input: CreateContentInput): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO contents (title, type, content, file_path, file_size, thumb_path, compressed_path, url, platform, tags, user_id, audit_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.type,
      input.content || '',
      input.filePath ?? null,
      input.fileSize || 0,
      input.thumbPath ?? null,
      input.compressedPath ?? null,
      input.url ?? null,
      input.platform ?? null,
      JSON.stringify(input.tags || []),
      input.userId,
      input.auditStatus || 'approved',
    ],
  )
  return Number((result as any).insertId)
}

export async function getContentRow(id: number): Promise<ContentRow | undefined> {
  const [rows] = await pool.execute('SELECT * FROM contents WHERE id = ? AND deleted_at IS NULL', [id])
  return (rows as ContentRow[])[0] || undefined
}

export async function contentExists(id: number): Promise<boolean> {
  const [rows] = await pool.execute('SELECT 1 AS x FROM contents WHERE id = ? AND deleted_at IS NULL', [id])
  return (rows as any[]).length > 0
}

export async function updateContent(
  id: number,
  fields: {
    title?: string
    content?: string
    url?: string | null
    filePath?: string | null
    fileSize?: number
    thumbPath?: string | null
    compressedPath?: string | null
    platform?: string | null
    tags?: string[]
  },
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title) }
  if (fields.content !== undefined) { sets.push('content = ?'); params.push(fields.content) }
  if (fields.url !== undefined) { sets.push('url = ?'); params.push(fields.url) }
  if (fields.filePath !== undefined) { sets.push('file_path = ?'); params.push(fields.filePath) }
  if (fields.fileSize !== undefined) { sets.push('file_size = ?'); params.push(fields.fileSize) }
  if (fields.thumbPath !== undefined) { sets.push('thumb_path = ?'); params.push(fields.thumbPath) }
  if (fields.compressedPath !== undefined) { sets.push('compressed_path = ?'); params.push(fields.compressedPath) }
  if (fields.platform !== undefined) { sets.push('platform = ?'); params.push(fields.platform) }
  if (fields.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(fields.tags)) }
  if (sets.length === 0) return
  params.push(id)
  await pool.execute(`UPDATE contents SET ${sets.join(', ')} WHERE id = ?`, params)
}

export async function softDeleteContent(id: number): Promise<void> {
  await pool.execute('UPDATE contents SET deleted_at = NOW(3) WHERE id = ?', [id])
}

export async function purgeDeletedContents(): Promise<number> {
  const [result] = await pool.execute('DELETE FROM contents WHERE deleted_at IS NOT NULL')
  return (result as any).affectedRows
}

export async function incrementView(id: number): Promise<void> {
  await pool.execute('UPDATE contents SET view_count = view_count + 1 WHERE id = ?', [id])
}

export async function setAuditStatus(id: number, status: string): Promise<void> {
  await pool.execute('UPDATE contents SET audit_status = ? WHERE id = ?', [status, id])
}

export async function updateContentAuthor(
  id: number,
  userId: number,
): Promise<{ oldUserId: number; newUsername: string }> {
  const [rows] = await pool.execute('SELECT user_id FROM contents WHERE id = ?', [id])
  const row = (rows as any[])[0]
  const oldUserId = row ? row.user_id : 0
  await pool.execute('UPDATE contents SET user_id = ? WHERE id = ?', [userId, id])
  const newUser = await getUserById(userId)
  return { oldUserId, newUsername: newUser?.username || '' }
}

interface ListContentOpts {
  offset: number
  limit: number
  tag?: string
  type?: string
  auditStatus?: string
  keyword?: string
  sortBy?: string
  order?: string
  userId?: number
}

export async function listContents(opts: ListContentOpts): Promise<{ rows: ContentRow[]; total: number }> {
  const wheres: string[] = ['deleted_at IS NULL']
  const params: unknown[] = []
  if (opts.auditStatus) { wheres.push('audit_status = ?'); params.push(opts.auditStatus) }
  if (opts.type) { wheres.push('type = ?'); params.push(opts.type) }
  if (opts.tag) { wheres.push('JSON_CONTAINS(tags, ?)'); params.push(JSON.stringify(opts.tag)) }
  if (opts.userId !== undefined) { wheres.push('user_id = ?'); params.push(opts.userId) }
  if (opts.keyword) {
    wheres.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)')
    params.push(`%${opts.keyword}%`, `%${opts.keyword}%`, `%${opts.keyword}%`)
  }
  const whereSql = 'WHERE ' + wheres.join(' AND ')

  const allowedSort = new Set(['created_at', 'view_count', 'id'])
  const sortBy = allowedSort.has(opts.sortBy || '') ? (opts.sortBy as string) : 'created_at'
  const order = opts.order === 'asc' ? 'ASC' : 'DESC'

  const [countRows] = await pool.execute(`SELECT COUNT(*) AS c FROM contents ${whereSql}`, params)
  const total = (countRows as any)[0].c
  const [rows] = await pool.execute(
    `SELECT * FROM contents ${whereSql} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`,
    [...params, opts.limit, opts.offset],
  )
  return { rows: rows as ContentRow[], total }
}

export async function recommendContents(count: number, page: number): Promise<ContentRow[]> {
  const limit = Math.max(1, Math.min(count || 20, 100))
  const offset = (Math.max(1, page) - 1) * limit
  const [rows] = await pool.execute(
    `SELECT * FROM contents WHERE deleted_at IS NULL AND audit_status = 'approved'
     ORDER BY view_count DESC, created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  )
  return rows as ContentRow[]
}

export async function getAllTags(): Promise<string[]> {
  const [rows] = await pool.execute(
    `SELECT tags FROM contents WHERE deleted_at IS NULL AND audit_status = 'approved'`,
  )
  const set = new Set<string>()
  for (const r of rows as { tags: string }[]) {
    for (const t of parseTags(r.tags)) set.add(t)
  }
  return [...set]
}

export async function decorateContent(row: ContentRow): Promise<Content> {
  const u = await getUserById(row.user_id)
  const user: User = u ? rowToUser(u) : { id: row.user_id, username: 'unknown' }
  return rowToContent(row, user)
}

export async function decorateRecommend(row: ContentRow): Promise<RecommendContent> {
  const u = await getUserById(row.user_id)
  const brief: UserBrief = u ? rowToUserBrief(u) : { id: row.user_id, username: 'unknown' }
  return rowToRecommend(row, brief)
}

/* ------------------------------------------------------------------ */
/* Comments                                                           */
/* ------------------------------------------------------------------ */

export async function createComment(input: {
  contentId: number
  userId: number
  text: string
  parentId?: number | null
}): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO comments (content_id, user_id, text, parent_id) VALUES (?, ?, ?, ?)',
    [input.contentId, input.userId, input.text, input.parentId ?? null],
  )
  return Number((result as any).insertId)
}

export async function getCommentRow(id: number): Promise<any> {
  const [rows] = await pool.execute('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL', [id])
  return (rows as any[])[0] || undefined
}

export async function softDeleteComment(id: number): Promise<void> {
  await pool.execute('UPDATE comments SET deleted_at = NOW(3) WHERE id = ?', [id])
}

export async function countTopLevelComments(contentId: number): Promise<number> {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM comments WHERE content_id = ? AND parent_id IS NULL AND deleted_at IS NULL AND is_banned = 0',
    [contentId],
  )
  return (rows as any)[0].c
}

export async function listCommentsTree(contentId: number, offset: number, limit: number): Promise<Comment[]> {
  const [tops] = await pool.execute(
    `SELECT * FROM comments WHERE content_id = ? AND parent_id IS NULL AND deleted_at IS NULL AND is_banned = 0
     ORDER BY created_at ASC LIMIT ? OFFSET ?`,
    [contentId, limit, offset],
  )
  const topRows = tops as any[]
  const topIds = topRows.map((t) => t.id)

  let replies: any[] = []
  if (topIds.length > 0) {
    const placeholders = topIds.map(() => '?').join(',')
    const [repRows] = await pool.execute(
      `SELECT * FROM comments WHERE parent_id IN (${placeholders}) AND deleted_at IS NULL AND is_banned = 0 ORDER BY created_at ASC`,
      topIds,
    )
    replies = repRows as any[]
  }

  const userIds = new Set<number>([...topRows.map((t) => t.user_id), ...replies.map((r) => r.user_id)])
  const users = await getUserMap([...userIds])
  const replyMap = new Map<number, any[]>()
  for (const r of replies) {
    if (!replyMap.has(r.parent_id)) replyMap.set(r.parent_id, [])
    replyMap.get(r.parent_id)!.push(r)
  }

  const toComment = (row: any, withReplies: boolean): Comment => {
    const u = users.get(row.user_id)
    const base: Comment = {
      id: row.id,
      content_id: row.content_id,
      user_id: row.user_id,
      text: row.text,
      parent_id: row.parent_id ?? null,
      is_banned: !!row.is_banned,
      created_at: dtToEpoch(row.created_at),
      updated_at: dtToEpoch(row.updated_at),
      user: u ? { id: u.id, username: u.username } : { id: row.user_id, username: 'unknown' },
    }
    if (row.parent_id) {
      const pu = users.get(row.user_id)
      base.parent = {
        id: row.parent_id,
        user_id: row.user_id,
        text: row.text,
        user: pu ? { id: pu.id, username: pu.username } : undefined,
      }
    }
    if (withReplies) {
      const rs = replyMap.get(row.id) || []
      base.replies = rs.map((r) => toComment(r, false))
    }
    return base
  }
  return topRows.map((t) => toComment(t, true))
}

export async function countComments(contentId: number): Promise<number> {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM comments WHERE content_id = ? AND deleted_at IS NULL AND is_banned = 0',
    [contentId],
  )
  return (rows as any)[0].c
}

export async function createCommentReport(input: {
  commentId: number
  userId: number
  reason: string
}): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO comment_reports (comment_id, user_id, reason, handled) VALUES (?, ?, ?, 0)',
    [input.commentId, input.userId, input.reason],
  )
  return Number((result as any).insertId)
}

export async function listCommentReports(): Promise<any[]> {
  const [rows] = await pool.execute(
    `SELECT cr.*, c.text AS comment_text, u.username AS user_username
     FROM comment_reports cr
     LEFT JOIN comments c ON c.id = cr.comment_id
     LEFT JOIN users u ON u.id = cr.user_id
     WHERE cr.handled = 0
     ORDER BY cr.created_at DESC`,
  )
  return rows as any[]
}

export async function handleCommentReport(id: number): Promise<void> {
  await pool.execute('UPDATE comment_reports SET handled = 1 WHERE id = ?', [id])
}

/* ------------------------------------------------------------------ */
/* Polls                                                              */
/* ------------------------------------------------------------------ */

export async function createPoll(input: {
  title: string
  description: string
  options: string[]
  userId: number
}): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO polls (title, description, options, vote_count, user_id) VALUES (?, ?, ?, 0, ?)',
    [input.title, input.description, JSON.stringify(input.options), input.userId],
  )
  return Number((result as any).insertId)
}

export async function getPollRow(id: number): Promise<any> {
  const [rows] = await pool.execute('SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL', [id])
  return (rows as any[])[0] || undefined
}

export async function listPolls(offset: number, limit: number): Promise<{ rows: any[]; total: number }> {
  const [countRows] = await pool.execute('SELECT COUNT(*) AS c FROM polls WHERE deleted_at IS NULL')
  const total = (countRows as any)[0].c
  const [rows] = await pool.execute(
    'SELECT * FROM polls WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  )
  return { rows: rows as any[], total }
}

export async function deletePoll(id: number): Promise<void> {
  await pool.execute('UPDATE polls SET deleted_at = NOW(3) WHERE id = ?', [id])
}

export async function getVoteOption(pollId: number, userId: number | null, visitorId: string | null): Promise<number | null> {
  const [rows] = await pool.execute(
    'SELECT option_index FROM poll_votes WHERE poll_id = ? AND (user_id = ? OR visitor_id = ?) LIMIT 1',
    [pollId, userId ?? -1, visitorId ?? ''],
  )
  const row = (rows as any[])[0]
  return row ? row.option_index : null
}

export async function castVote(input: {
  pollId: number
  userId: number | null
  visitorId: string | null
  optionIndex: number
}): Promise<void> {
  const [rows] = await pool.execute(
    'SELECT id, option_index FROM poll_votes WHERE poll_id = ? AND (user_id = ? OR visitor_id = ?) LIMIT 1',
    [input.pollId, input.userId ?? -1, input.visitorId ?? ''],
  )
  const existing = (rows as any[])[0]
  if (existing) {
    if (existing.option_index !== input.optionIndex) {
      await pool.execute('UPDATE poll_votes SET option_index = ? WHERE id = ?', [input.optionIndex, existing.id])
    }
  } else {
    await pool.execute(
      'INSERT INTO poll_votes (poll_id, user_id, visitor_id, option_index) VALUES (?, ?, ?, ?)',
      [input.pollId, input.userId ?? null, input.visitorId ?? null, input.optionIndex],
    )
    await pool.execute('UPDATE polls SET vote_count = vote_count + 1 WHERE id = ?', [input.pollId])
  }
}

export async function pollVoteCounts(pollId: number): Promise<Record<string, number>> {
  const [rows] = await pool.execute(
    'SELECT option_index, COUNT(*) AS c FROM poll_votes WHERE poll_id = ? GROUP BY option_index',
    [pollId],
  )
  const counts: Record<string, number> = {}
  for (const r of rows as { option_index: number; c: number }[]) {
    counts[String(r.option_index)] = r.c
  }
  return counts
}

export async function decoratePoll(row: any): Promise<Poll> {
  const u = await getUserById(row.user_id)
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    options: parseTags(row.options),
    vote_count: row.vote_count || 0,
    user_id: row.user_id,
    user: u ? { id: u.id, username: u.username } : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/* ------------------------------------------------------------------ */
/* Claims                                                             */
/* ------------------------------------------------------------------ */

export async function createClaim(input: { contentId: number; userId: number; reason: string }): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO claims (content_id, user_id, reason, status, approved_by, remark) VALUES (?, ?, ?, ?, NULL, ?)',
    [input.contentId, input.userId, input.reason, 'pending', ''],
  )
  return Number((result as any).insertId)
}

export async function getClaim(id: number): Promise<any> {
  const [rows] = await pool.execute('SELECT * FROM claims WHERE id = ?', [id])
  return (rows as any[])[0] || undefined
}

export async function listClaims(opts: {
  offset: number
  limit: number
  status?: string
}): Promise<{ rows: any[]; total: number }> {
  const where = opts.status ? 'WHERE c.status = ?' : ''
  const params: unknown[] = opts.status ? [opts.status] : []
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS c FROM claims c ${where}`, params)
  const total = (countRows as any)[0].c
  const [rows] = await pool.execute(
    `SELECT c.* FROM claims c ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, opts.limit, opts.offset],
  )
  return { rows: rows as any[], total }
}

export async function handleClaim(id: number, action: 'approve' | 'reject', remark: string, approvedBy: number): Promise<void> {
  const status = action === 'approve' ? 'approved' : 'rejected'
  await pool.execute(
    'UPDATE claims SET status = ?, remark = ?, approved_by = ? WHERE id = ?',
    [status, remark, approvedBy, id],
  )
}

export async function decorateClaim(row: any): Promise<Claim> {
  const u = await getUserById(row.user_id)
  const contentRow = await getContentRow(row.content_id)
  const content = contentRow ? await decorateContent(contentRow) : ({} as Content)
  return {
    id: row.id,
    content_id: row.content_id,
    user_id: row.user_id,
    user: u ? { id: u.id, username: u.username } : { id: row.user_id, username: 'unknown' },
    content,
    reason: row.reason || '',
    status: row.status as ClaimStatus,
    remark: row.remark || '',
    created_at: row.created_at,
    updated_at: row.updated_at || undefined,
  }
}

/* ------------------------------------------------------------------ */
/* API keys                                                           */
/* ------------------------------------------------------------------ */

export async function createApiKey(input: {
  userId: number
  name: string
  permissions: string[]
  prefix: string
  hash: string
}): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO api_keys (user_id, name, key_prefix, key_hash, permissions, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [input.userId, input.name, input.prefix, input.hash, JSON.stringify(input.permissions)],
  )
  return Number((result as any).insertId)
}

export async function listApiKeys(userId: number): Promise<any[]> {
  const [rows] = await pool.execute(
    'SELECT id, user_id, name, key_prefix, permissions, is_active, last_used_at, created_at FROM api_keys WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC',
    [userId],
  )
  return rows as any[]
}

export async function getApiKeyRow(id: number, userId: number): Promise<any> {
  const [rows] = await pool.execute(
    'SELECT * FROM api_keys WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, userId],
  )
  return (rows as any[])[0] || undefined
}

export async function updateApiKey(
  id: number,
  userId: number,
  fields: { name?: string; permissions?: string[]; is_active?: boolean },
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name) }
  if (fields.permissions !== undefined) { sets.push('permissions = ?'); params.push(JSON.stringify(fields.permissions)) }
  if (fields.is_active !== undefined) { sets.push('is_active = ?'); params.push(fields.is_active ? 1 : 0) }
  if (sets.length === 0) return
  params.push(id)
  params.push(userId)
  await pool.execute(`UPDATE api_keys SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params)
}

export async function deleteApiKey(id: number, userId: number): Promise<void> {
  await pool.execute('UPDATE api_keys SET deleted_at = NOW(3) WHERE id = ? AND user_id = ?', [id, userId])
}

export async function decorateApiKey(row: any): Promise<ApiKey> {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    permissions: parseTags(row.permissions),
    is_active: !!row.is_active,
    last_used_at: row.last_used_at ?? null,
    created_at: dtToEpoch(row.created_at),
  }
}
