// gen-openapi.mjs
// 生成 xqecz API 契约的 OpenAPI 3.1 规范。
// 数据源：前端 types/schemas.ts（Zod 单一来源）+ Node validation/schemas.ts（请求校验）+ AGENTS.md 端点表。
// 输出：
//   xqecz-golang/docs/openapi.json (+ .md)   —— 含 /api/notifications
//   xqecz-nodejs/docs/openapi.json (+ .md)   —— 不含 notifications（Node 未实现）
// 仅用 Node 内置模块，无外部依赖。
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const nodeRoot = resolve(here, '..') // xqecz-nodejs
const golangDocs = resolve(nodeRoot, '..', 'xqecz-golang', 'docs')
const nodeDocs = resolve(nodeRoot, 'docs')

// ───────────────────────── 基础类型 ─────────────────────────
const int = { type: 'integer' }
const str = { type: 'string' }
const bool = { type: 'boolean' }
const nullableInt = { type: ['integer', 'null'] }
const arrStr = { type: 'array', items: { type: 'string' } }

// ───────────────────────── components.schemas ─────────────────────────
const schemas = {
  ApiResponse: {
    type: 'object',
    description: '统一响应包装。所有接口均返回此结构。',
    properties: {
      code: { type: 'integer', description: '业务状态码，200 表示成功', example: 200 },
      message: { type: 'string', description: '提示文案', example: 'ok' },
      data: { type: 'object', description: '业务数据，结构见各接口 data 定义', nullable: true },
    },
    required: ['code', 'message'],
  },
  User: {
    type: 'object',
    description: '用户',
    properties: {
      id: int,
      username: str,
      is_admin: bool,
      is_banned: bool,
      created_at: int,
      updated_at: int,
    },
    required: ['id', 'username'],
  },
  UserBrief: {
    type: 'object',
    description: '用户简档（推荐/列表嵌套用）',
    properties: { id: int, username: str },
    required: ['id', 'username'],
  },
  Content: {
    type: 'object',
    description: '二创内容',
    properties: {
      id: int,
      title: str,
      type: { type: 'string', enum: ['video', 'image', 'text', 'link'], description: '内容类型' },
      text: str,
      url: str,
      thumb: str,
      video: str,
      img: str,
      file_size: int,
      user: { $ref: '#/components/schemas/User' },
      tags: arrStr,
      view_count: int,
      audit_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      created_at: int,
      updated_at: int,
    },
    required: ['id', 'title', 'type', 'user', 'tags', 'view_count', 'created_at'],
  },
  RecommendContent: {
    type: 'object',
    description: '推荐内容（首页用）',
    properties: {
      id: int,
      title: str,
      type: { type: 'string', enum: ['video', 'image', 'text', 'link'] },
      url: str,
      thumb: str,
      tags: arrStr,
      view_count: int,
      user: { $ref: '#/components/schemas/UserBrief' },
      created_at: int,
    },
    required: ['id', 'title', 'type', 'user', 'view_count', 'created_at'],
  },
  Comment: {
    type: 'object',
    description: '评论（含楼中楼 replies 递归）',
    properties: {
      id: int,
      content_id: int,
      user_id: int,
      text: str,
      parent_id: nullableInt,
      is_banned: bool,
      created_at: int,
      updated_at: int,
      user: { $ref: '#/components/schemas/UserBrief' },
      parent: {
        type: 'object',
        properties: {
          id: int,
          user_id: int,
          text: str,
          user: { $ref: '#/components/schemas/UserBrief' },
        },
      },
      replies: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
    },
    required: ['id', 'content_id', 'user_id', 'text', 'parent_id', 'is_banned', 'created_at'],
  },
  Poll: {
    type: 'object',
    description: '投票',
    properties: {
      id: int,
      title: str,
      description: str,
      options: arrStr,
      vote_count: int,
      user_id: int,
      user: { $ref: '#/components/schemas/UserBrief' },
      created_at: str,
      updated_at: str,
    },
    required: ['id', 'title', 'options', 'vote_count', 'user_id', 'created_at'],
  },
  Claim: {
    type: 'object',
    description: '内容认领申请',
    properties: {
      id: int,
      content_id: int,
      user_id: int,
      user: { $ref: '#/components/schemas/UserBrief' },
      content: { $ref: '#/components/schemas/Content' },
      reason: str,
      status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      remark: str,
      created_at: str,
      updated_at: str,
    },
    required: ['id', 'content_id', 'user_id', 'user', 'content', 'reason', 'status', 'created_at'],
  },
  ApiKey: {
    type: 'object',
    description: 'API 密钥（不含完整 key）',
    properties: {
      id: int,
      name: str,
      key_prefix: str,
      permissions: arrStr,
      is_active: bool,
      last_used_at: nullableInt,
      created_at: int,
    },
    required: ['id', 'name', 'key_prefix', 'permissions', 'is_active', 'created_at'],
  },
  ApiKeyCreated: {
    allOf: [
      { $ref: '#/components/schemas/ApiKey' },
      {
        type: 'object',
        properties: { key: { type: 'string', description: '完整密钥，仅创建时返回一次' } },
        required: ['key'],
      },
    ],
  },
  CommentReport: {
    type: 'object',
    description: '评论举报',
    properties: {
      id: int,
      comment_id: int,
      user_id: int,
      reason: str,
      handled: bool,
      created_at: str,
      Comment: { type: 'object', properties: { id: int, text: str } },
      User: { $ref: '#/components/schemas/User' },
    },
    required: ['id', 'comment_id', 'user_id', 'reason', 'handled', 'created_at'],
  },
  CommentCount: {
    type: 'object',
    properties: { content_id: int, count: int },
    required: ['content_id', 'count'],
  },
  RecommendResponse: {
    type: 'object',
    properties: {
      list: { type: 'array', items: { $ref: '#/components/schemas/RecommendContent' } },
      count: int,
    },
    required: ['list', 'count'],
  },
  PollDetail: {
    type: 'object',
    description: '投票详情（含计票与我的投票）',
    properties: {
      poll: { $ref: '#/components/schemas/Poll' },
      vote_counts: { type: 'object', additionalProperties: int, description: '每个选项的票数，键为选项序号字符串' },
      total_votes: int,
      my_vote: nullableInt,
    },
    required: ['poll', 'vote_counts', 'total_votes', 'my_vote'],
  },
  UploadImageResponse: {
    type: 'object',
    properties: {
      id: int,
      filename: str,
      file_size: int,
      image_url: str,
      upload_time: str,
    },
    required: ['id', 'filename', 'file_size', 'image_url', 'upload_time'],
  },
  RegenerateThumbnailResponse: {
    type: 'object',
    properties: { id: int, thumb_path: str },
    required: ['id', 'thumb_path'],
  },
  RegenerateAllResponse: {
    type: 'object',
    properties: { count: int, description: '重新生成的数量' },
    required: ['count'],
  },
  UpdateContentAuthorResponse: {
    type: 'object',
    properties: {
      content_id: int,
      old_user_id: int,
      new_user_id: int,
      new_username: str,
    },
    required: ['content_id', 'old_user_id', 'new_user_id', 'new_username'],
  },
  LoginResponse: {
    type: 'object',
    properties: { user: { $ref: '#/components/schemas/User' } },
    required: ['user'],
  },
  RegisterResponse: {
    type: 'object',
    properties: { user_id: int },
    required: ['user_id'],
  },
  ApiKeyListResponse: {
    type: 'object',
    properties: { list: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } } },
    required: ['list'],
  },
  Notification: {
    type: 'object',
    description: '通知（Go 后端独有，schema 为最佳推断）',
    properties: {
      id: int,
      user_id: int,
      title: str,
      body: str,
      type: str,
      is_read: bool,
      created_at: str,
    },
    required: ['id', 'user_id', 'title', 'body', 'is_read', 'created_at'],
  },

  // ── 查询参数对象 ──
  ListParams: {
    type: 'object',
    description: '分页/筛选通用参数',
    properties: {
      page: { type: 'integer', minimum: 1 },
      page_size: { type: 'integer', minimum: 1 },
      tag: str,
      type: { type: 'string', enum: ['video', 'image', 'text', 'link'] },
      audit_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      sort_by: str,
      order: { type: 'string', enum: ['asc', 'desc'] },
      keyword: str,
    },
  },

  // ── 请求体 ──
  RegisterRequest: {
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 2, maxLength: 32 },
      password: { type: 'string', minLength: 6 },
    },
    required: ['username', 'password'],
  },
  LoginRequest: {
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 1 },
      password: { type: 'string', minLength: 1 },
    },
    required: ['username', 'password'],
  },
  InitAdminRequest: {
    type: 'object',
    properties: {
      username: { type: 'string', default: 'admin' },
      password: { type: 'string', default: 'admin123' },
    },
  },
  UploadContentRequest: {
    type: 'object',
    description: 'multipart/form-data。file 为二进制；user_id 取自登录态，不在此传。',
    properties: {
      file: { type: 'string', format: 'binary', description: '上传文件（图片/视频）' },
      title: str,
      type: { type: 'string', enum: ['video', 'image', 'text', 'link'] },
      content: str,
      url: str,
      tags: arrStr,
    },
    required: ['file', 'type'],
  },
  UpdateContentRequest: {
    type: 'object',
    description: 'multipart/form-data，字段均可选；更新文件时携带 file。',
    properties: {
      title: str,
      content: str,
      url: str,
      tags: arrStr,
      file: { type: 'string', format: 'binary' },
    },
  },
  ClaimRequest: {
    type: 'object',
    properties: { reason: str },
  },
  CommentAddRequest: {
    type: 'object',
    properties: {
      content_id: int,
      text: { type: 'string', minLength: 1 },
      parent_id: int,
    },
    required: ['content_id', 'text'],
  },
  CommentReportRequest: {
    type: 'object',
    properties: { comment_id: int, reason: str },
    required: ['comment_id'],
  },
  PollCreateRequest: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1 },
      description: str,
      options: { type: 'array', items: { type: 'string' }, minItems: 2 },
    },
    required: ['title', 'options'],
  },
  PollVoteRequest: {
    type: 'object',
    properties: { option_index: int },
    required: ['option_index'],
  },
  ApiKeyCreateRequest: {
    type: 'object',
    properties: { name: str, permissions: arrStr },
  },
  ApiKeyUpdateRequest: {
    type: 'object',
    properties: { name: str, permissions: arrStr, is_active: bool },
  },
  AuditRequest: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['approved', 'rejected'] },
      remark: str,
    },
    required: ['status'],
  },
  AuthorRequest: {
    type: 'object',
    properties: { user_id: int },
    required: ['user_id'],
  },
  RoleRequest: {
    type: 'object',
    properties: { is_admin: bool },
    required: ['is_admin'],
  },
  BanRequest: {
    type: 'object',
    properties: { is_banned: bool },
    required: ['is_banned'],
  },
  ClaimHandleRequest: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['approve', 'reject'] },
      remark: str,
    },
    required: ['action'],
  },
  NotificationRequest: {
    type: 'object',
    description: '注册设备（Go 后端独有，最佳推断）',
    properties: { token: str, platform: str },
    required: ['token'],
  },
}

// 分页包装（list 内容类型不同）
const paginated = (itemRef) => ({
  type: 'object',
  properties: {
    list: { type: 'array', items: { $ref: itemRef } },
    total: int,
    page: int,
    page_size: int,
    total_page: int,
  },
  required: ['list', 'total', 'page', 'page_size', 'total_page'],
})
schemas.PaginatedContent = paginated('#/components/schemas/Content')
schemas.PaginatedComment = paginated('#/components/schemas/Comment')
schemas.PaginatedPoll = paginated('#/components/schemas/Poll')
schemas.PaginatedClaim = paginated('#/components/schemas/Claim')
schemas.PaginatedUser = paginated('#/components/schemas/User')

// ───────────────────────── 参数辅助 ─────────────────────────
const qp = (name, type, extra = {}) => ({
  name, in: 'query', required: !!extra.required,
  schema: { type, ...(extra.enum ? { enum: extra.enum } : {}) },
  description: extra.description || '',
})
const pp = (name, type = 'integer', description = '') => ({
  name, in: 'path', required: true, schema: { type }, description,
})
const listParamsQ = [
  qp('page', 'integer', { description: '页码，从 1 开始' }),
  qp('page_size', 'integer', { description: '每页数量' }),
  qp('tag', 'string', { description: '按标签筛选' }),
  qp('type', 'string', { enum: ['video', 'image', 'text', 'link'], description: '按类型筛选' }),
  qp('audit_status', 'string', { enum: ['pending', 'approved', 'rejected'], description: '按审核状态筛选' }),
  qp('sort_by', 'string', { description: '排序字段' }),
  qp('order', 'string', { enum: ['asc', 'desc'], description: '排序方向' }),
  qp('keyword', 'string', { description: '关键词' }),
]

// ───────────────────────── 响应包装 ─────────────────────────
const wrap = (d) => {
  const data = d == null
    ? { type: 'object' }
    : (typeof d === 'string' ? { $ref: `#/components/schemas/${d}` } : d)
  return {
    allOf: [
      { $ref: '#/components/schemas/ApiResponse' },
      { type: 'object', properties: { data } },
    ],
  }
}
const jsonBody = (ref) => ({ required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } } })
const formBody = (ref) => ({ required: true, content: { 'multipart/form-data': { schema: { $ref: `#/components/schemas/${ref}` } } } })

const errResp = (desc) => ({ description: desc, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } })

// ───────────────────────── 端点元数据 ─────────────────────────
// resp: schema 名 | 内联对象 | null(无 data)
const e = (tag, method, path, summary, description, auth, opts = {}) => ({
  tag, method, path, summary, description, auth,
  params: opts.params || [],
  body: opts.body || null,
  resp: opts.resp == null ? null : opts.resp,
})

const endpoints = [
  // ── Auth ──
  e('Auth', 'POST', '/auth/register', '用户注册', '创建新用户账号。', false, { body: jsonBody('RegisterRequest'), resp: 'RegisterResponse' }),
  e('Auth', 'POST', '/auth/login', '用户登录', '校验用户名密码，成功写入会话 Cookie。', false, { body: jsonBody('LoginRequest'), resp: 'LoginResponse' }),
  e('Auth', 'POST', '/auth/logout', '退出登录', '清除当前会话。', false, { resp: null }),
  e('Auth', 'POST', '/auth/init-admin', '初始化管理员', '首次部署时创建管理员账号（带限流）。', false, { body: jsonBody('InitAdminRequest'), resp: null }),
  e('Auth', 'GET', '/auth/me', '获取当前用户', '返回登录用户信息，需登录。', true, { resp: 'User' }),

  // ── Content ──
  e('Content', 'GET', '/content/list', '内容列表', '分页/筛选浏览二创内容，公开。', false, { params: listParamsQ, resp: 'PaginatedContent' }),
  e('Content', 'GET', '/content/search', '搜索内容', '按关键词搜索内容。', false, { params: [qp('keyword', 'string', { required: true, description: '搜索关键词' }), ...listParamsQ], resp: 'PaginatedContent' }),
  e('Content', 'GET', '/content/recommend', '推荐内容', '首页推荐流。', false, { params: [qp('count', 'integer', { required: true, description: '返回数量' }), qp('page', 'integer')], resp: 'RecommendResponse' }),
  e('Content', 'GET', '/content/tags', '全部标签', '返回平台所有标签。', false, { resp: { type: 'array', items: { type: 'string' } } }),
  e('Content', 'GET', '/content/{id}', '内容详情', '单条内容详情。', false, { params: [pp('id', 'integer', '内容 ID')], resp: 'Content' }),
  e('Content', 'POST', '/content/upload', '上传内容', '上传图片/视频/图文/链接内容，需登录。', true, { body: formBody('UploadContentRequest'), resp: 'Content' }),
  e('Content', 'POST', '/content/upload-image', '上传单图', '仅上传一张图片并返回 URL，需登录。', true, { body: formBody('UploadContentRequest'), resp: 'UploadImageResponse' }),
  e('Content', 'GET', '/content/my', '我的内容', '当前用户上传的内容列表。', true, { params: listParamsQ, resp: 'PaginatedContent' }),
  e('Content', 'PUT', '/content/{id}', '更新内容', '修改内容信息，可附带新文件。', true, { params: [pp('id', 'integer', '内容 ID')], body: formBody('UpdateContentRequest'), resp: 'Content' }),
  e('Content', 'DELETE', '/content/{id}', '删除内容', '软删除内容。', true, { params: [pp('id', 'integer', '内容 ID')], resp: null }),
  e('Content', 'POST', '/content/{content_id}/claim', '提交认领', '对内容提交作者认领申请。', true, { params: [pp('content_id', 'integer', '内容 ID')], body: jsonBody('ClaimRequest'), resp: null }),

  // ── Comment ──
  e('Comment', 'GET', '/comment/list/{content_id}', '评论列表', '某内容的评论，含楼中楼回复。', false, { params: [pp('content_id', 'integer', '内容 ID'), qp('page', 'integer'), qp('page_size', 'integer')], resp: 'CommentListResponse' }),
  e('Comment', 'GET', '/comment/count/{content_id}', '评论计数', '某内容的评论总数。', false, { params: [pp('content_id', 'integer', '内容 ID')], resp: 'CommentCount' }),
  e('Comment', 'POST', '/comment/add', '发表评论', '对内容发表评论，可回复某条评论。', true, { body: jsonBody('CommentAddRequest'), resp: 'Comment' }),
  e('Comment', 'DELETE', '/comment/{id}', '删除评论', '删除评论。', true, { params: [pp('id', 'integer', '评论 ID')], resp: null }),
  e('Comment', 'POST', '/comment/report', '举报评论', '提交对评论的举报。', true, { body: jsonBody('CommentReportRequest'), resp: 'CommentReport' }),

  // ── Poll ──
  e('Poll', 'GET', '/poll/list', '投票列表', '所有投票列表。', false, { resp: 'PollListResponse' }),
  e('Poll', 'GET', '/poll/{id}', '投票详情', '投票详情，含选项计票与我的投票（可选登录）。', false, { params: [pp('id', 'integer', '投票 ID')], resp: 'PollDetail' }),
  e('Poll', 'POST', '/poll/{id}/vote', '投票', '对某个选项投票（可选登录）。', false, { params: [pp('id', 'integer', '投票 ID')], body: jsonBody('PollVoteRequest'), resp: null }),
  e('Poll', 'POST', '/poll/create', '创建投票', '创建一个新的投票。', true, { body: jsonBody('PollCreateRequest'), resp: 'Poll' }),
  e('Poll', 'DELETE', '/poll/{id}', '删除投票', '删除投票。', true, { params: [pp('id', 'integer', '投票 ID')], resp: null }),

  // ── Notifications（仅 Go 后端）──
  e('Notifications', 'POST', '/notifications/device', '注册设备', '注册推送设备 token。', true, { body: jsonBody('NotificationRequest'), resp: null }),
  e('Notifications', 'DELETE', '/notifications/device/{token}', '注销设备', '移除设备推送 token。', true, { params: [pp('token', 'string', '设备 token')], resp: null }),
  e('Notifications', 'GET', '/notifications/list', '通知列表', '当前用户的通知列表。', true, { params: [qp('page', 'integer'), qp('page_size', 'integer')], resp: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } }),
  e('Notifications', 'GET', '/notifications/unread-count', '未读计数', '当前用户未读通知数。', true, { resp: { type: 'object', properties: { count: int }, required: ['count'] } }),
  e('Notifications', 'PUT', '/notifications/{id}/read', '标记已读', '标记单条通知为已读。', true, { params: [pp('id', 'integer', '通知 ID')], resp: null }),
  e('Notifications', 'PUT', '/notifications/read-all', '全部已读', '标记全部通知为已读。', true, { resp: null }),

  // ── Admin ──
  e('Admin', 'POST', '/admin/audit/{id}', '审核内容', '通过或驳回内容。', true, { params: [pp('id', 'integer', '内容 ID')], body: jsonBody('AuditRequest'), resp: 'Content' }),
  e('Admin', 'GET', '/admin/pending', '待审核列表', '待审核内容分页列表。', true, { params: [qp('page', 'integer'), qp('page_size', 'integer')], resp: 'PaginatedContent' }),
  e('Admin', 'GET', '/admin/content/all', '全部内容', '管理视角的全部内容列表。', true, { params: listParamsQ, resp: 'PaginatedContent' }),
  e('Admin', 'PUT', '/admin/content/{id}/author', '变更作者', '将内容作者变更为指定用户。', true, { params: [pp('id', 'integer', '内容 ID')], body: jsonBody('AuthorRequest'), resp: 'UpdateContentAuthorResponse' }),
  e('Admin', 'POST', '/admin/content/{id}/regenerate-thumbnail', '重生成缩略图', '为单条内容重新生成缩略图。', true, { params: [pp('id', 'integer', '内容 ID')], resp: 'RegenerateThumbnailResponse' }),
  e('Admin', 'POST', '/admin/content/regenerate-all-thumbnails', '批量重生成缩略图', '批量重新生成所有缩略图。', true, { resp: 'RegenerateAllResponse' }),
  e('Admin', 'DELETE', '/admin/content/purge', '清理已删内容', '彻底清理已软删除的内容。', true, { resp: null }),
  e('Admin', 'DELETE', '/admin/files/clean', '清理孤立文件', '清理无引用关系的孤立上传文件。', true, { resp: null }),
  e('Admin', 'GET', '/admin/users', '用户列表', '分页/关键词查询用户。', true, { params: [qp('page', 'integer'), qp('page_size', 'integer'), qp('keyword', 'string')], resp: 'PaginatedUser' }),
  e('Admin', 'PUT', '/admin/users/{id}/role', '设置管理员', '设置/取消用户的管理员角色。', true, { params: [pp('id', 'integer', '用户 ID')], body: jsonBody('RoleRequest'), resp: 'User' }),
  e('Admin', 'PUT', '/admin/users/{id}/ban', '封禁用户', '封禁或解封用户。', true, { params: [pp('id', 'integer', '用户 ID')], body: jsonBody('BanRequest'), resp: 'User' }),
  e('Admin', 'DELETE', '/admin/users/{id}', '删除用户', '删除用户。', true, { params: [pp('id', 'integer', '用户 ID')], resp: null }),
  e('Admin', 'GET', '/admin/comments/reports', '评论举报列表', '列出所有评论举报。', true, { resp: { type: 'array', items: { $ref: '#/components/schemas/CommentReport' } } }),
  e('Admin', 'POST', '/admin/comments/reports/{id}/handle', '处理举报', '处理某条评论举报。', true, { params: [pp('id', 'integer', '举报 ID')], resp: null }),
  e('Admin', 'GET', '/admin/claims', '认领申请列表', '分页查询内容认领申请。', true, { params: [qp('page', 'integer'), qp('page_size', 'integer'), qp('status', 'string', { enum: ['pending', 'approved', 'rejected'] })], resp: 'ClaimListResponse' }),
  e('Admin', 'POST', '/admin/claims/{id}/handle', '处理认领', '通过或驳回认领申请。', true, { params: [pp('id', 'integer', '申请 ID')], body: jsonBody('ClaimHandleRequest'), resp: null }),

  // ── ApiKeys ──
  e('ApiKeys', 'POST', '/api-keys', '创建密钥', '创建 API 密钥，返回完整 key 一次。', true, { body: jsonBody('ApiKeyCreateRequest'), resp: 'ApiKeyCreated' }),
  e('ApiKeys', 'GET', '/api-keys', '密钥列表', '当前用户的密钥列表。', true, { resp: 'ApiKeyListResponse' }),
  e('ApiKeys', 'PUT', '/api-keys/{id}', '更新密钥', '更新密钥名称/权限/启用状态。', true, { params: [pp('id', 'integer', '密钥 ID')], body: jsonBody('ApiKeyUpdateRequest'), resp: 'ApiKey' }),
  e('ApiKeys', 'DELETE', '/api-keys/{id}', '删除密钥', '删除密钥。', true, { params: [pp('id', 'integer', '密钥 ID')], resp: null }),
]

// ───────────────────────── 构建 OpenAPI 文档 ─────────────────────────
function buildOpenApi(title, description, includeNotifications) {
  const list = includeNotifications ? endpoints : endpoints.filter((x) => !x.path.startsWith('/notifications'))
  const paths = {}
  for (const ep of list) {
    const p = (paths[ep.path] ||= {})
    const op = {
      tags: [ep.tag],
      summary: ep.summary,
      description: ep.description,
      security: ep.auth ? [{ cookieAuth: [] }] : [],
      parameters: ep.params,
      responses: {
        '200': { description: '成功', content: { 'application/json': { schema: wrap(ep.resp) } } },
        '400': errResp('请求参数错误'),
        '401': errResp('未认证'),
        '403': errResp('无权限'),
        '500': errResp('服务器错误'),
      },
    }
    if (ep.body) op.requestBody = ep.body
    p[ep.method.toLowerCase()] = op
  }
  const tags = [...new Set(list.map((x) => x.tag))].map((t) => ({ name: t }))
  return {
    openapi: '3.1.0',
    info: { title, description, version: '1.0.0' },
    servers: [{ url: '/', description: '当前服务（同源，Try it out 直接打本服务）' }],
    tags,
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token', description: '登录后由后端写入的会话 Cookie' },
    },
    components: { schemas },
    paths,
  }
}

// ───────────────────────── Markdown 导出 ─────────────────────────
function buildMarkdown(doc, title) {
  const lines = [`# ${title}`, '', '> 由 OpenAPI 规范自动生成。接口前缀 `/api`。统一响应包装 `{ code, message, data }`。', '']
  const groups = {}
  for (const ep of doc.paths ? flatten(doc) : []) {
    ;(groups[ep.tag] ||= []).push(ep)
  }
  for (const [tag, eps] of Object.entries(groups)) {
    lines.push(`## ${tag}`, '')
    lines.push('| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |')
    lines.push('|------|------|------|------|------|-----------|')
    for (const ep of eps) {
      const auth = ep.auth ? '是' : '否'
      const req = ep.body
        ? (ep.body.content['multipart/form-data'] ? 'multipart' : 'JSON')
        : (ep.params.length ? 'query' : '—')
      const resp = ep.resp == null ? '—' : (typeof ep.resp === 'string' ? ep.resp : 'object')
      lines.push(`| ${ep.method} | ${ep.path} | ${auth} | ${ep.summary} | ${req} | ${resp} |`)
    }
    lines.push('')
  }
  lines.push('### 通用响应结构', '')
  lines.push('```json', '{ "code": 200, "message": "ok", "data": { } }', '```', '')
  return lines.join('\n')
}
function flatten(doc) {
  const out = []
  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      let resp = '—'
      const r200 = op.responses?.['200']?.content?.['application/json']?.schema
      const dataSchema = r200?.allOf?.[1]?.properties?.data
      if (dataSchema) {
        if (dataSchema.$ref) resp = dataSchema.$ref.split('/').pop()
        else if (dataSchema.type === 'array') {
          const it = dataSchema.items
          resp = `array<${it?.$ref ? it.$ref.split('/').pop() : (it?.type || 'object')}>`
        } else if (dataSchema.type && dataSchema.type !== 'object') resp = dataSchema.type
      }
      out.push({ tag: op.tags[0], method: method.toUpperCase(), path, summary: op.summary, auth: op.security.length > 0, body: op.requestBody, params: op.parameters, resp })
    }
  }
  return out
}

// ───────────────────────── 写出 ─────────────────────────
function ensure(dir) { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }) }

const goDoc = buildOpenApi('xqecz API（Go 后端）', '小泉动漫二创站后端接口。Go/Fiber 实现，含通知接口。', true)
const nodeDoc = buildOpenApi('xqecz API（Node 后端）', '小泉动漫二创站后端接口。Node/Express 实现（与 Go 版同一契约，不含通知接口）。', false)

const golangEmbed = resolve(golangDocs, '..', 'internal', 'docs')
ensure(golangDocs)
ensure(nodeDocs)
ensure(golangEmbed)
writeFileSync(resolve(golangDocs, 'openapi.json'), JSON.stringify(goDoc, null, 2))
writeFileSync(resolve(nodeDocs, 'openapi.json'), JSON.stringify(nodeDoc, null, 2))
writeFileSync(resolve(golangEmbed, 'openapi.json'), JSON.stringify(goDoc, null, 2))
writeFileSync(resolve(golangDocs, 'openapi.md'), buildMarkdown(goDoc, 'xqecz API 文档（Go 后端）'))
writeFileSync(resolve(nodeDocs, 'openapi.md'), buildMarkdown(nodeDoc, 'xqecz API 文档（Node 后端）'))

console.log(`Go 端点数: ${Object.keys(goDoc.paths).length} 路径 / ${countOps(goDoc)} 操作`)
console.log(`Node 端点数: ${Object.keys(nodeDoc.paths).length} 路径 / ${countOps(nodeDoc)} 操作`)
console.log('已写出:')
console.log(' ', resolve(golangDocs, 'openapi.json'))
console.log(' ', resolve(golangDocs, 'openapi.md'))
console.log(' ', resolve(golangEmbed, 'openapi.json'), '(go:embed 用)')
console.log(' ', resolve(nodeDocs, 'openapi.json'))
console.log(' ', resolve(nodeDocs, 'openapi.md'))

function countOps(doc) {
  let n = 0
  for (const m of Object.values(doc.paths)) n += Object.keys(m).length
  return n
}
