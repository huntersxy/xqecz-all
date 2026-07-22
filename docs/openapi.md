# xqecz API 文档（Node 后端）

> 由 OpenAPI 规范自动生成。接口前缀 `/api`。统一响应包装 `{ code, message, data }`。

## Auth

| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |
|------|------|------|------|------|-----------|
| POST | /auth/register | 否 | 用户注册 | JSON | RegisterResponse |
| POST | /auth/login | 否 | 用户登录 | JSON | LoginResponse |
| POST | /auth/logout | 否 | 退出登录 | — | — |
| POST | /auth/init-admin | 否 | 初始化管理员 | JSON | — |
| GET | /auth/me | 是 | 获取当前用户 | — | User |

## Content

| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |
|------|------|------|------|------|-----------|
| GET | /content/list | 否 | 内容列表 | query | PaginatedContent |
| GET | /content/search | 否 | 搜索内容 | query | PaginatedContent |
| GET | /content/recommend | 否 | 推荐内容 | query | RecommendResponse |
| GET | /content/tags | 否 | 全部标签 | — | array<string> |
| GET | /content/{id} | 否 | 内容详情 | query | Content |
| PUT | /content/{id} | 是 | 更新内容 | multipart | Content |
| DELETE | /content/{id} | 是 | 删除内容 | query | — |
| POST | /content/upload | 是 | 上传内容 | multipart | Content |
| POST | /content/upload-image | 是 | 上传单图 | multipart | UploadImageResponse |
| GET | /content/my | 是 | 我的内容 | query | PaginatedContent |
| POST | /content/{content_id}/claim | 是 | 提交认领 | JSON | — |

## Comment

| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |
|------|------|------|------|------|-----------|
| GET | /comment/list/{content_id} | 否 | 评论列表 | query | CommentListResponse |
| GET | /comment/count/{content_id} | 否 | 评论计数 | query | CommentCount |
| POST | /comment/add | 是 | 发表评论 | JSON | Comment |
| DELETE | /comment/{id} | 是 | 删除评论 | query | — |
| POST | /comment/report | 是 | 举报评论 | JSON | CommentReport |

## Poll

| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |
|------|------|------|------|------|-----------|
| GET | /poll/list | 否 | 投票列表 | — | PollListResponse |
| GET | /poll/{id} | 否 | 投票详情 | query | PollDetail |
| DELETE | /poll/{id} | 是 | 删除投票 | query | — |
| POST | /poll/{id}/vote | 否 | 投票 | JSON | — |
| POST | /poll/create | 是 | 创建投票 | JSON | Poll |

## Admin

| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |
|------|------|------|------|------|-----------|
| POST | /admin/audit/{id} | 是 | 审核内容 | JSON | Content |
| GET | /admin/pending | 是 | 待审核列表 | query | PaginatedContent |
| GET | /admin/content/all | 是 | 全部内容 | query | PaginatedContent |
| PUT | /admin/content/{id}/author | 是 | 变更作者 | JSON | UpdateContentAuthorResponse |
| POST | /admin/content/{id}/regenerate-thumbnail | 是 | 重生成缩略图 | query | RegenerateThumbnailResponse |
| POST | /admin/content/regenerate-all-thumbnails | 是 | 批量重生成缩略图 | — | RegenerateAllResponse |
| DELETE | /admin/content/purge | 是 | 清理已删内容 | — | — |
| DELETE | /admin/files/clean | 是 | 清理孤立文件 | — | — |
| GET | /admin/users | 是 | 用户列表 | query | PaginatedUser |
| PUT | /admin/users/{id}/role | 是 | 设置管理员 | JSON | User |
| PUT | /admin/users/{id}/ban | 是 | 封禁用户 | JSON | User |
| DELETE | /admin/users/{id} | 是 | 删除用户 | query | — |
| GET | /admin/comments/reports | 是 | 评论举报列表 | — | array<CommentReport> |
| POST | /admin/comments/reports/{id}/handle | 是 | 处理举报 | query | — |
| GET | /admin/claims | 是 | 认领申请列表 | query | ClaimListResponse |
| POST | /admin/claims/{id}/handle | 是 | 处理认领 | JSON | — |

## ApiKeys

| 方法 | 路径 | 认证 | 功能 | 请求 | 响应 data |
|------|------|------|------|------|-----------|
| POST | /api-keys | 是 | 创建密钥 | JSON | ApiKeyCreated |
| GET | /api-keys | 是 | 密钥列表 | — | ApiKeyListResponse |
| PUT | /api-keys/{id} | 是 | 更新密钥 | JSON | ApiKey |
| DELETE | /api-keys/{id} | 是 | 删除密钥 | query | — |

### 通用响应结构

```json
{ "code": 200, "message": "ok", "data": { } }
```
