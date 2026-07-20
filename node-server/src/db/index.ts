import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  ApiKey,
  Claim,
  ClaimStatus,
  Comment,
  Content,
  ContentRow,
  ContentType,
  Notification,
  Poll,
  RecommendContent,
  User,
  UserBrief,
  UserRow,
} from '../types.js'
import { parseTags } from '../util/pagination.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Persist the sqlite file inside node-server/data (gitignored).
const DATA_DIR = resolve(__dirname, '..', '..', 'data')
const DB_PATH = process.env.DB_PATH || resolve(DATA_DIR, 'app.db')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function now(): number {
  return Math.floor(Date.now() / 1000)
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT DEFAULT '',
  file_path TEXT,
  file_size INTEGER DEFAULT 0,
  thumb_path TEXT,
  compressed_path TEXT,
  url TEXT,
  platform TEXT,
  view_count INTEGER DEFAULT 0,
  user_id INTEGER NOT NULL,
  tags TEXT DEFAULT '[]',
  audit_status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_contents_user ON contents(user_id);
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(type);
CREATE INDEX IF NOT EXISTS idx_contents_audit ON contents(audit_status);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  parent_id INTEGER,
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id);

CREATE TABLE IF NOT EXISTS comment_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  handled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  options TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  user_id INTEGER,
  visitor_id TEXT,
  option_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pollvotes_poll ON poll_votes(poll_id);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by INTEGER,
  remark TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  related_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS user_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT DEFAULT '',
  device_info TEXT DEFAULT '',
  last_active_at INTEGER,
  last_push_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(device_token)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
`

db.exec(SCHEMA)

/* ------------------------------------------------------------------ */
/* Transform helpers                                                  */
/* ------------------------------------------------------------------ */

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    is_admin: !!row.is_admin,
    is_banned: !!row.is_banned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function rowToUserBrief(row: UserRow): UserBrief {
  return { id: row.id, username: row.username }
}

function rowToContent(row: ContentRow, user: UserBrief | User): Content {
  return {
    id: row.id,
    title: row.title,
    type: row.type as ContentType,
    text: row.content || '',
    url: row.url || '',
    thumb: row.thumb_path || '',
    video: row.type === 'video' ? row.file_path || '' : '',
    img: row.type === 'image' ? row.file_path || '' : '',
    file_size: row.file_size || 0,
    user: user as User,
    tags: parseTags(row.tags),
    view_count: row.view_count || 0,
    audit_status: row.audit_status as Content['audit_status'],
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    created_at: row.created_at,
  }
}

function getUserMap(ids: number[]): Map<number, UserRow> {
  const map = new Map<number, UserRow>()
  const uniq = [...new Set(ids.filter((id) => id > 0))]
  if (uniq.length === 0) return map
  const placeholders = uniq.map(() => '?').join(',')
  const rows = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...uniq) as UserRow[]
  for (const r of rows) map.set(r.id, r)
  return map
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export function createUser(username: string, passwordHash: string, isAdmin = false): number {
  const t = now()
  const info = db
    .prepare(
      'INSERT INTO users (username, password, is_admin, is_banned, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    )
    .run(username, passwordHash, isAdmin ? 1 : 0, t, t)
  return Number(info.lastInsertRowid)
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function getUserByUsername(username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
}

export function countUsers(): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }
  return row.c
}

export function listUsers(opts: { offset: number; limit: number; keyword?: string }): {
  rows: UserRow[]
  total: number
} {
  const where = opts.keyword ? 'WHERE username LIKE ?' : ''
  const params = opts.keyword ? [`%${opts.keyword}%`] : []
  const totalRow = db
    .prepare(`SELECT COUNT(*) AS c FROM users ${where}`)
    .get(...params) as { c: number }
  const rows = db
    .prepare(`SELECT * FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, opts.limit, opts.offset) as UserRow[]
  return { rows, total: totalRow.c }
}

export function updateUserRole(id: number, isAdmin: boolean): void {
  db.prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?').run(
    isAdmin ? 1 : 0,
    now(),
    id,
  )
}

export function updateUserBan(id: number, isBanned: boolean): void {
  db.prepare('UPDATE users SET is_banned = ?, updated_at = ? WHERE id = ?').run(
    isBanned ? 1 : 0,
    now(),
    id,
  )
}

export function deleteUser(id: number): void {
  db.prepare('UPDATE users SET is_banned = 1, updated_at = ? WHERE id = ?').run(now(), id)
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
  url?: string | null
  tags?: string[]
  userId: number
  auditStatus?: string
}

export function createContent(input: CreateContentInput): number {
  const t = now()
  const info = db
    .prepare(
      `INSERT INTO contents (title, type, content, file_path, file_size, thumb_path, url, tags, user_id, audit_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.title,
      input.type,
      input.content || '',
      input.filePath ?? null,
      input.fileSize || 0,
      input.thumbPath ?? null,
      input.url ?? null,
      JSON.stringify(input.tags || []),
      input.userId,
      input.auditStatus || 'approved',
      t,
      t,
    )
  return Number(info.lastInsertRowid)
}

export function getContentRow(id: number): ContentRow | undefined {
  return db.prepare('SELECT * FROM contents WHERE id = ? AND deleted_at IS NULL').get(id) as
    | ContentRow
    | undefined
}

export function contentExists(id: number): boolean {
  return !!db.prepare('SELECT 1 FROM contents WHERE id = ? AND deleted_at IS NULL').get(id)
}

export function updateContent(
  id: number,
  fields: {
    title?: string
    content?: string
    url?: string | null
    filePath?: string | null
    fileSize?: number
    thumbPath?: string | null
    tags?: string[]
  },
): void {
  const sets: string[] = []
  const params: unknown[] = []
  if (fields.title !== undefined) {
    sets.push('title = ?')
    params.push(fields.title)
  }
  if (fields.content !== undefined) {
    sets.push('content = ?')
    params.push(fields.content)
  }
  if (fields.url !== undefined) {
    sets.push('url = ?')
    params.push(fields.url)
  }
  if (fields.filePath !== undefined) {
    sets.push('file_path = ?')
    params.push(fields.filePath)
  }
  if (fields.fileSize !== undefined) {
    sets.push('file_size = ?')
    params.push(fields.fileSize)
  }
  if (fields.thumbPath !== undefined) {
    sets.push('thumb_path = ?')
    params.push(fields.thumbPath)
  }
  if (fields.tags !== undefined) {
    sets.push('tags = ?')
    params.push(JSON.stringify(fields.tags))
  }
  if (sets.length === 0) return
  sets.push('updated_at = ?')
  params.push(now())
  params.push(id)
  db.prepare(`UPDATE contents SET ${sets.join(', ')} WHERE id = ?`).run(...params)
}

export function softDeleteContent(id: number): void {
  db.prepare('UPDATE contents SET deleted_at = ? WHERE id = ?').run(now(), id)
}

export function purgeDeletedContents(): number {
  const info = db.prepare('DELETE FROM contents WHERE deleted_at IS NOT NULL').run()
  return info.changes
}

export function incrementView(id: number): void {
  db.prepare('UPDATE contents SET view_count = view_count + 1 WHERE id = ?').run(id)
}

export function setAuditStatus(id: number, status: string): void {
  db.prepare('UPDATE contents SET audit_status = ?, updated_at = ? WHERE id = ?').run(
    status,
    now(),
    id,
  )
}

export function updateContentAuthor(
  id: number,
  userId: number,
): { oldUserId: number; newUsername: string } {
  const row = db.prepare('SELECT user_id FROM contents WHERE id = ?').get(id) as
    | { user_id: number }
    | undefined
  const oldUserId = row ? row.user_id : 0
  db.prepare('UPDATE contents SET user_id = ?, updated_at = ? WHERE id = ?').run(userId, now(), id)
  const newUser = getUserById(userId)
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

export function listContents(opts: ListContentOpts): { rows: ContentRow[]; total: number } {
  const wheres: string[] = ['deleted_at IS NULL']
  const params: unknown[] = []
  if (opts.auditStatus) {
    wheres.push('audit_status = ?')
    params.push(opts.auditStatus)
  }
  if (opts.type) {
    wheres.push('type = ?')
    params.push(opts.type)
  }
  if (opts.tag) {
    wheres.push('tags LIKE ?')
    params.push(`%"${opts.tag}"%`)
  }
  if (opts.userId !== undefined) {
    wheres.push('user_id = ?')
    params.push(opts.userId)
  }
  if (opts.keyword) {
    wheres.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)')
    params.push(`%${opts.keyword}%`, `%${opts.keyword}%`, `%${opts.keyword}%`)
  }
  const whereSql = 'WHERE ' + wheres.join(' AND ')

  const allowedSort = new Set(['created_at', 'view_count', 'id'])
  const sortBy = allowedSort.has(opts.sortBy || '') ? (opts.sortBy as string) : 'created_at'
  const order = opts.order === 'asc' ? 'ASC' : 'DESC'

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS c FROM contents ${whereSql}`)
    .get(...params) as { c: number }
  const rows = db
    .prepare(`SELECT * FROM contents ${whereSql} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`)
    .all(...params, opts.limit, opts.offset) as ContentRow[]
  return { rows, total: totalRow.c }
}

export function recommendContents(count: number, page: number): ContentRow[] {
  const limit = Math.max(1, Math.min(count || 20, 100))
  const offset = (Math.max(1, page) - 1) * limit
  return db
    .prepare(
      `SELECT * FROM contents WHERE deleted_at IS NULL AND audit_status = 'approved'
       ORDER BY view_count DESC, created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as ContentRow[]
}

export function getAllTags(): string[] {
  const rows = db
    .prepare(
      `SELECT tags FROM contents WHERE deleted_at IS NULL AND audit_status = 'approved'`,
    )
    .all() as { tags: string }[]
  const set = new Set<string>()
  for (const r of rows) for (const t of parseTags(r.tags)) set.add(t)
  return [...set]
}

// Build a Content (with nested user) from a raw row.
export function decorateContent(row: ContentRow): Content {
  const u = getUserById(row.user_id)
  const user: User = u ? rowToUser(u) : { id: row.user_id, username: 'unknown' }
  return rowToContent(row, user)
}

export function decorateRecommend(row: ContentRow): RecommendContent {
  const u = getUserById(row.user_id)
  const brief: UserBrief = u ? rowToUserBrief(u) : { id: row.user_id, username: 'unknown' }
  return rowToRecommend(row, brief)
}

/* ------------------------------------------------------------------ */
/* Comments                                                           */
/* ------------------------------------------------------------------ */

export function createComment(input: {
  contentId: number
  userId: number
  text: string
  parentId?: number | null
}): number {
  const t = now()
  const info = db
    .prepare(
      'INSERT INTO comments (content_id, user_id, text, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(input.contentId, input.userId, input.text, input.parentId ?? null, t, t)
  return Number(info.lastInsertRowid)
}

export function getCommentRow(id: number): any {
  return db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(id)
}

export function softDeleteComment(id: number): void {
  db.prepare('UPDATE comments SET deleted_at = ? WHERE id = ?').run(now(), id)
}

export function countTopLevelComments(contentId: number): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS c FROM comments WHERE content_id = ? AND parent_id IS NULL AND deleted_at IS NULL AND is_banned = 0',
    )
    .get(contentId) as { c: number }
  return row.c
}

export function listCommentsTree(contentId: number, offset: number, limit: number): Comment[] {
  const tops = db
    .prepare(
      `SELECT * FROM comments WHERE content_id = ? AND parent_id IS NULL AND deleted_at IS NULL AND is_banned = 0
       ORDER BY created_at ASC LIMIT ? OFFSET ?`,
    )
    .all(contentId, limit, offset) as any[]
  const topIds = tops.map((t) => t.id)
  const replies =
    topIds.length > 0
      ? db
          .prepare(
            `SELECT * FROM comments WHERE parent_id IN (${topIds.map(() => '?').join(',')}) AND deleted_at IS NULL AND is_banned = 0 ORDER BY created_at ASC`,
          )
          .all(...topIds) as any[]
      : []
  const userIds = new Set<number>([...tops.map((t) => t.user_id), ...replies.map((r) => r.user_id)])
  const users = getUserMap([...userIds])
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
      created_at: row.created_at,
      updated_at: row.updated_at,
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
  return tops.map((t) => toComment(t, true))
}

export function countComments(contentId: number): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS c FROM comments WHERE content_id = ? AND deleted_at IS NULL AND is_banned = 0',
    )
    .get(contentId) as { c: number }
  return row.c
}

export function createCommentReport(input: {
  commentId: number
  userId: number
  reason: string
}): number {
  const info = db
    .prepare(
      'INSERT INTO comment_reports (comment_id, user_id, reason, handled, created_at) VALUES (?, ?, ?, 0, ?)',
    )
    .run(input.commentId, input.userId, input.reason, now())
  return Number(info.lastInsertRowid)
}

export function listCommentReports(): any[] {
  return db
    .prepare(
      `SELECT cr.*, c.text AS comment_text, u.username AS user_username
       FROM comment_reports cr
       LEFT JOIN comments c ON c.id = cr.comment_id
       LEFT JOIN users u ON u.id = cr.user_id
       WHERE cr.handled = 0
       ORDER BY cr.created_at DESC`,
    )
    .all() as any[]
}

export function handleCommentReport(id: number): void {
  db.prepare('UPDATE comment_reports SET handled = 1 WHERE id = ?').run(id)
}

/* ------------------------------------------------------------------ */
/* Polls                                                              */
/* ------------------------------------------------------------------ */

export function createPoll(input: {
  title: string
  description: string
  options: string[]
  userId: number
}): number {
  const t = now()
  const info = db
    .prepare(
      'INSERT INTO polls (title, description, options, vote_count, user_id, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
    )
    .run(input.title, input.description, JSON.stringify(input.options), input.userId, t, t)
  return Number(info.lastInsertRowid)
}

export function getPollRow(id: number): any {
  return db.prepare('SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL').get(id)
}

export function listPolls(offset: number, limit: number): { rows: any[]; total: number } {
  const totalRow = db.prepare('SELECT COUNT(*) AS c FROM polls WHERE deleted_at IS NULL').get() as {
    c: number
  }
  const rows = db
    .prepare('SELECT * FROM polls WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as any[]
  return { rows, total: totalRow.c }
}

export function deletePoll(id: number): void {
  db.prepare('UPDATE polls SET deleted_at = ? WHERE id = ?').run(now(), id)
}

export function getVoteOption(pollId: number, userId: number | null, visitorId: string | null): number | null {
  const row = db
    .prepare(
      'SELECT option_index FROM poll_votes WHERE poll_id = ? AND (user_id = ? OR visitor_id = ?) LIMIT 1',
    )
    .get(pollId, userId ?? -1, visitorId ?? '') as { option_index: number } | undefined
  return row ? row.option_index : null
}

export function castVote(input: {
  pollId: number
  userId: number | null
  visitorId: string | null
  optionIndex: number
}): void {
  const existing = db
    .prepare(
      'SELECT id, option_index FROM poll_votes WHERE poll_id = ? AND (user_id = ? OR visitor_id = ?) LIMIT 1',
    )
    .get(input.pollId, input.userId ?? -1, input.visitorId ?? '') as
    | { id: number; option_index: number }
    | undefined
  if (existing) {
    if (existing.option_index !== input.optionIndex) {
      db.prepare('UPDATE poll_votes SET option_index = ?, created_at = ? WHERE id = ?').run(
        input.optionIndex,
        now(),
        existing.id,
      )
    }
  } else {
    db.prepare(
      'INSERT INTO poll_votes (poll_id, user_id, visitor_id, option_index, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(input.pollId, input.userId ?? null, input.visitorId ?? null, input.optionIndex, now())
    db.prepare('UPDATE polls SET vote_count = vote_count + 1 WHERE id = ?').run(input.pollId)
  }
}

export function pollVoteCounts(pollId: number): Record<string, number> {
  const rows = db
    .prepare('SELECT option_index, COUNT(*) AS c FROM poll_votes WHERE poll_id = ? GROUP BY option_index')
    .all(pollId) as { option_index: number; c: number }[]
  const counts: Record<string, number> = {}
  for (const r of rows) counts[String(r.option_index)] = r.c
  return counts
}

export function decoratePoll(row: any): Poll {
  const u = getUserById(row.user_id)
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    options: parseTags(row.options),
    vote_count: row.vote_count || 0,
    user_id: row.user_id,
    user: u ? { id: u.id, username: u.username } : undefined,
    created_at: new Date(row.created_at * 1000).toISOString(),
    updated_at: new Date(row.updated_at * 1000).toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Claims                                                             */
/* ------------------------------------------------------------------ */

export function createClaim(input: { contentId: number; userId: number; reason: string }): number {
  const t = now()
  const info = db
    .prepare(
      'INSERT INTO claims (content_id, user_id, reason, status, approved_by, remark, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)',
    )
    .run(input.contentId, input.userId, input.reason, 'pending', '', t, t)
  return Number(info.lastInsertRowid)
}

export function getClaim(id: number): any {
  return db.prepare('SELECT * FROM claims WHERE id = ?').get(id)
}

export function listClaims(opts: {
  offset: number
  limit: number
  status?: string
}): { rows: any[]; total: number } {
  const where = opts.status ? 'WHERE c.status = ?' : ''
  const params = opts.status ? [opts.status] : []
  const totalRow = db
    .prepare(`SELECT COUNT(*) AS c FROM claims c ${where}`)
    .get(...params) as { c: number }
  const rows = db
    .prepare(
      `SELECT c.* FROM claims c ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, opts.limit, opts.offset) as any[]
  return { rows, total: totalRow.c }
}

export function handleClaim(id: number, action: 'approve' | 'reject', remark: string, approvedBy: number): void {
  const status = action === 'approve' ? 'approved' : 'rejected'
  db.prepare('UPDATE claims SET status = ?, remark = ?, approved_by = ?, updated_at = ? WHERE id = ?').run(
    status,
    remark,
    approvedBy,
    now(),
    id,
  )
}

export function decorateClaim(row: any): Claim {
  const u = getUserById(row.user_id)
  const contentRow = getContentRow(row.content_id)
  const content = contentRow ? decorateContent(contentRow) : ({} as Content)
  return {
    id: row.id,
    content_id: row.content_id,
    user_id: row.user_id,
    user: u ? { id: u.id, username: u.username } : { id: row.user_id, username: 'unknown' },
    content,
    reason: row.reason || '',
    status: row.status as ClaimStatus,
    remark: row.remark || '',
    created_at: new Date(row.created_at * 1000).toISOString(),
    updated_at: row.updated_at ? new Date(row.updated_at * 1000).toISOString() : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Notifications + devices                                            */
/* ------------------------------------------------------------------ */

export function createNotification(input: {
  userId: number
  type: string
  title: string
  content: string
  relatedId?: number | null
}): void {
  db.prepare(
    'INSERT INTO notifications (user_id, type, title, content, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
  ).run(
    input.userId,
    input.type,
    input.title,
    input.content,
    input.relatedId ?? null,
    now(),
  )
}

export function listNotifications(
  userId: number,
  opts: { offset: number; limit: number },
): { rows: Notification[]; total: number } {
  const totalRow = db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?')
    .get(userId) as { c: number }
  const rows = db
    .prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read ASC, created_at DESC LIMIT ? OFFSET ?',
    )
    .all(userId, opts.limit, opts.offset) as any[]
  const list: Notification[] = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    title: r.title,
    content: r.content,
    related_id: r.related_id ?? null,
    is_read: !!r.is_read,
    created_at: r.created_at,
  }))
  return { rows: list, total: totalRow.c }
}

export function countUnread(userId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { c: number }
  return row.c
}

export function markRead(id: number, userId: number): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId)
}

export function markAllRead(userId: number): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId)
}

export function registerDevice(input: {
  userId: number
  token: string
  platform: string
  deviceInfo: string
}): void {
  const t = now()
  db.prepare(
    `INSERT INTO user_devices (user_id, device_token, platform, device_info, last_active_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, device_info = excluded.device_info, updated_at = excluded.updated_at`,
  ).run(input.userId, input.token, input.platform, input.deviceInfo, t, t, t)
}

export function unregisterDevice(token: string): void {
  db.prepare('DELETE FROM user_devices WHERE device_token = ?').run(token)
}

/* ------------------------------------------------------------------ */
/* API keys                                                           */
/* ------------------------------------------------------------------ */

export function createApiKey(input: {
  userId: number
  name: string
  permissions: string[]
  prefix: string
  hash: string
}): number {
  const t = now()
  const info = db
    .prepare(
      'INSERT INTO api_keys (user_id, name, key_prefix, key_hash, permissions, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
    )
    .run(
      input.userId,
      input.name,
      input.prefix,
      input.hash,
      JSON.stringify(input.permissions),
      t,
      t,
    )
  return Number(info.lastInsertRowid)
}

export function listApiKeys(userId: number): any[] {
  return db
    .prepare(
      'SELECT id, user_id, name, key_prefix, permissions, is_active, last_used_at, created_at FROM api_keys WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC',
    )
    .all(userId) as any[]
}

export function getApiKeyRow(id: number, userId: number): any {
  return db
    .prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
    .get(id, userId)
}

export function updateApiKey(
  id: number,
  userId: number,
  fields: { name?: string; permissions?: string[]; is_active?: boolean },
): void {
  const sets: string[] = []
  const params: unknown[] = []
  if (fields.name !== undefined) {
    sets.push('name = ?')
    params.push(fields.name)
  }
  if (fields.permissions !== undefined) {
    sets.push('permissions = ?')
    params.push(JSON.stringify(fields.permissions))
  }
  if (fields.is_active !== undefined) {
    sets.push('is_active = ?')
    params.push(fields.is_active ? 1 : 0)
  }
  if (sets.length === 0) return
  sets.push('updated_at = ?')
  params.push(now())
  params.push(id)
  params.push(userId)
  db.prepare(`UPDATE api_keys SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params)
}

export function deleteApiKey(id: number, userId: number): void {
  db.prepare('UPDATE api_keys SET deleted_at = ? WHERE id = ? AND user_id = ?').run(now(), id, userId)
}

export function decorateApiKey(row: any): ApiKey {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    permissions: parseTags(row.permissions),
    is_active: !!row.is_active,
    last_used_at: row.last_used_at ?? null,
    created_at: row.created_at,
  }
}
