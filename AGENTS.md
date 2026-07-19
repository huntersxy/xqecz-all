# AGENTS.md — xqecz-all

## 项目概述

小泉动漫二创站 — 从 Rust 版本 (`xiaoquan-backend`) 移植的 Go + Vue 3 全栈应用。
用户上传/浏览二次创作内容（图片、视频、图文、链接），含评论、投票、通知、管理后台。

**核心约束：前后端端点对齐** — Go 后端的路由、请求参数、响应格式必须与前端 `frontend/src/api/index.ts` 中定义的接口完全一致。移植时以 Rust 源码为参考，以前端契约为准。

## 目录结构

```
cmd/server/
  main.go              # 入口，路由注册，中间件栈（路由已定义，handler 为 stub）
  handlers.go          # 所有 handler 函数存根（TODO 待实现）

internal/
  config/              # Viper 配置加载 (config.go + loader.go)
  handler/             # HTTP 处理器（待实现，从 handlers.go 迁入）
  service/             # 业务逻辑（待实现）
  repository/          # 数据访问层（待实现）
  middleware/           # auth.go, cors.go, error.go, ratelimit.go（已完成）
  model/model.go       # 10 个数据表的完整模型定义（已完成）
  dto/                 # 请求/响应结构（待实现）
  util/                # 工具函数（已完成）: database, redis, response, pagination, security, file, video

frontend/              # Vue 3 + TypeScript + Vite + Ant Design Vue + Tailwind CSS
  src/api/index.ts     # ofetch 封装，统一 401/重试/错误处理
  src/types/schemas.ts # Zod schema（前端类型单一来源）
  src/stores/          # Pinia 状态管理
  src/views/           # 路由页面

config/                # config.yaml 配置文件
docker/                # Docker 相关配置
assets/                # 静态资源（默认封面等）
```

## Rust 源码参考

Rust 源码位于 `E:\Code\xqdm\xiaoquan-backend\`，结构：

```
src/
  main.rs              # 路由定义（Go 版已对齐）
  config.rs            # 配置
  models.rs            # 数据模型
  handlers/            # 薄层：参数提取 → 委托 services
  services/            # 业务逻辑（DB 查询、缓存、外部调用）
  utils/               # 工具函数（errors, pagination, redis, security, video, cookie）
  mw/                  # 中间件（auth, error, rate_limit）
  scheduler.rs         # 定时任务（推荐列表、tinify、推送）
```

移植时参考 Rust 的 `handlers/` 和 `services/` 实现对应的 Go 版本。

## 构建与测试命令

```bash
# 后端
go build ./cmd/server/              # 编译
go run ./cmd/server/                # 运行
go test ./...                       # 运行所有测试
go vet ./...                        # 静态检查

# 前端
cd frontend && npm run build        # 生产构建（含 type-check + vite build）
cd frontend && npx vue-tsc --noEmit # 仅类型检查
cd frontend && npm run dev          # 开发服务器

# Docker
docker compose build                # 多阶段构建
docker compose up -d                # 生产部署
docker compose --profile dev up -d  # 本地开发（含 MySQL + Redis）
```

## 架构分层规则

### 后端 Handler → Service → Repository 三层分离

| 层 | 职责 | 文件位置 |
|---|---|---|
| `handler/` | 参数提取、AuthUser 校验、调用 service、返回响应 | `internal/handler/` |
| `service/` | 业务逻辑、调用 repository、缓存策略、外部调用 | `internal/service/` |
| `repository/` | 纯数据库操作（sqlx 查询），无业务逻辑 | `internal/repository/` |
| `util/` | 无状态工具函数，跨层复用 | `internal/util/` |

- Handler 禁止直接写 SQL，所有 DB 操作在 repository 层
- `util/response.go` 提供 `Success` / `Error` / `Paginated` / `BadRequest` 等统一响应
- `util/pagination.go` 提供分页参数解析

### 前端 API → Store → Composable → View

| 层 | 职责 |
|---|---|
| `api/index.ts` | HTTP 封装，统一错误处理，`request<T>()` 泛型 |
| `stores/` | Pinia 状态管理，调用 API |
| `composables/` | 可复用逻辑 |
| `views/` | 路由页面 |

## API 端点对照表

路由前缀 `/api/`，RESTful 风格。以下为已注册的完整端点（Go 版 `cmd/server/main.go`）：

### 认证 `/api/auth`
| 方法 | 路径 | 认证 | Handler |
|------|------|------|---------|
| POST | `/auth/register` | 否（限流） | `handleRegister` |
| POST | `/auth/login` | 否（限流） | `handleLogin` |
| POST | `/auth/logout` | 否（限流） | `handleLogout` |
| POST | `/auth/init-admin` | 否（限流） | `handleInitAdmin` |
| GET | `/auth/me` | 是 | `handleGetMe` |

### 内容 `/api/content`
| 方法 | 路径 | 认证 | Handler |
|------|------|------|---------|
| GET | `/content/list` | 否 | `handleGetContentList` |
| GET | `/content/search` | 否 | `handleSearchContent` |
| GET | `/content/recommend` | 否 | `handleRecommendContent` |
| GET | `/content/tags` | 否 | `handleGetAllTags` |
| GET | `/content/:id` | 否 | `handleGetContent` |
| POST | `/content/upload` | 是 | `handleUploadContent` |
| POST | `/content/upload-image` | 是 | `handleUploadImage` |
| GET | `/content/my` | 是 | `handleGetMyContentList` |
| PUT | `/content/:id` | 是 | `handleUpdateContent` |
| DELETE | `/content/:id` | 是 | `handleDeleteContent` |
| POST | `/content/:content_id/claim` | 是 | `handleCreateClaim` |

### 评论 `/api/comment`
| 方法 | 路径 | 认证 | Handler |
|------|------|------|---------|
| GET | `/comment/list/:content_id` | 否 | `handleGetComments` |
| GET | `/comment/count/:content_id` | 否 | `handleGetCommentCount` |
| POST | `/comment/add` | 是 | `handleAddComment` |
| DELETE | `/comment/:id` | 是 | `handleDeleteComment` |
| POST | `/comment/report` | 是 | `handleReportComment` |

### 投票 `/api/poll`
| 方法 | 路径 | 认证 | Handler |
|------|------|------|---------|
| GET | `/poll/list` | 否 | `handleGetPollList` |
| GET | `/poll/:id` | 可选 | `handleGetPoll` |
| POST | `/poll/:id/vote` | 可选 | `handleVotePoll` |
| POST | `/poll/create` | 是 | `handleCreatePoll` |
| DELETE | `/poll/:id` | 是 | `handleDeletePoll` |

### 通知 `/api/notifications`（需认证）
| 方法 | 路径 | Handler |
|------|------|---------|
| POST | `/notifications/device` | `handleRegisterDevice` |
| DELETE | `/notifications/device/:token` | `handleUnregisterDevice` |
| GET | `/notifications/list` | `handleGetNotifications` |
| GET | `/notifications/unread-count` | `handleGetUnreadCount` |
| PUT | `/notifications/:id/read` | `handleMarkAsRead` |
| PUT | `/notifications/read-all` | `handleMarkAllAsRead` |

### 管理 `/api/admin`（需认证 + 管理员）
| 方法 | 路径 | Handler |
|------|------|---------|
| POST | `/admin/audit/:id` | `handleAuditContent` |
| GET | `/admin/pending` | `handleGetPendingContent` |
| GET | `/admin/content/all` | `handleGetAllContent` |
| PUT | `/admin/content/:id/author` | `handleUpdateContentAuthor` |
| POST | `/admin/content/:id/regenerate-thumbnail` | `handleRegenerateThumbnail` |
| POST | `/admin/content/regenerate-all-thumbnails` | `handleRegenerateAllThumbnails` |
| DELETE | `/admin/content/purge` | `handlePurgeDeletedContent` |
| DELETE | `/admin/files/clean` | `handleCleanOrphanedFiles` |
| GET | `/admin/users` | `handleGetUsers` |
| PUT | `/admin/users/:id/role` | `handleUpdateUserRole` |
| PUT | `/admin/users/:id/ban` | `handleBanUser` |
| DELETE | `/admin/users/:id` | `handleDeleteUser` |
| GET | `/admin/comments/reports` | `handleGetCommentReports` |
| POST | `/admin/comments/reports/:id/handle` | `handleHandleReport` |
| GET | `/admin/claims` | `handleGetClaimList` |
| POST | `/admin/claims/:id/handle` | `handleHandleClaim` |

### API 密钥 `/api/api-keys`（需认证）
| 方法 | 路径 | Handler |
|------|------|---------|
| POST | `/api-keys/` | `handleCreateApiKey` |
| GET | `/api-keys/` | `handleListApiKeys` |
| PUT | `/api-keys/:id` | `handleUpdateApiKey` |
| DELETE | `/api-keys/:id` | `handleDeleteApiKey` |

## 编码规范

### 后端 (Go)

- **响应格式**: 统一 `ApiResponse { code, message, data }`，用 `util.Success` / `util.Error` / `util.Paginated`
- **分页**: `util.ParsePagination(page, pageSize, defaultSize, maxSize)` → `util.Paginated()`
- **认证**: `middleware.Auth()` 中间件提取用户，handler 通过 `c.Locals("user")` 获取
- **软删除**: 所有删除用 `SET deleted_at = NOW()`，查询加 `WHERE deleted_at IS NULL`
- **缓存**: Redis 缓存通过 `util/redis.go`，TTL 常量定义在 service 层
- **配置**: Viper 加载 `config/config.yaml`，结构体在 `internal/config/`
- **JSON**: 使用 `github.com/bytedance/sonic` 高性能序列化
- **日志**: `github.com/rs/zerolog` 结构化日志
- **ORM**: `github.com/jmoiron/sqlx`，手动写 SQL，不用 ORM
- **错误处理**: 返回 `util.Error(c, code, msg)`，不 panic

### 前端 (TypeScript/Vue)

- **类型安全**: Zod schema 在 `types/schemas.ts`（单一来源），`types/index.ts` re-export
- **Schema 设计**: 用 `z.unknown().transform(...)` 而非 `z.any()`，字段缺失时兜空值
- **API 错误**: `onResponseError` 只 console.error，`request()` catch 统一 `message.error()` 弹 toast
- **401 处理**: 仅 `/admin` 页面跳登录页，公开页面不跳转
- **路由**: Hash 模式 (`createWebHashHistory`)，SEO 不适用

## 开发工作流

添加新功能的顺序：
1. `internal/model/` — 定义/确认数据模型
2. `internal/dto/` — 定义请求/响应结构
3. `internal/repository/` — 实现数据访问
4. `internal/service/` — 实现业务逻辑
5. `internal/handler/` — 实现 HTTP 处理器
6. `cmd/server/main.go` — 注册路由（如需要）

**关键**: 实现 handler 时必须对照前端 `frontend/src/api/index.ts` 中的接口定义，确保请求参数名、响应字段名完全一致。

## Docker 部署

- `docker-compose.yml` 使用 profiles 区分环境：
  - `docker compose up -d` — 生产模式（MySQL/Redis 远程）
  - `docker compose --profile dev up -d` — 本地开发（含 MySQL + Redis）
  - `docker compose --profile dev up -d mysql redis` — 仅基础设施
- 端口映射: 宿主 `${XQ_APP_PORT:-9200}` → 容器 80（nginx）
- 数据持久化: `./docker_data/{uploads,thumbnails,images,mysql,redis}`

## 已知约束

- MySQL 用 MariaDB 10.5 兼容语法
- Redis 用于 session、内容缓存、推荐 ZSet、限流计数
- 前端用 hash 路由，SEO 不适用
- `uploads/`、`thumbnails/`、`images/` 目录需可写
- FFmpeg 可选，用于视频封面生成

## 关键文件速查

| 用途 | 文件 |
|------|------|
| Rust 参考（路由） | `E:\Code\xqdm\xiaoquan-backend\src\main.rs` |
| Rust 参考（handler） | `E:\Code\xqdm\xiaoquan-backend\src\handlers/*.rs` |
| Rust 参考（service） | `E:\Code\xqdm\xiaoquan-backend\src\services/*.rs` |
| Go 路由定义 | `cmd/server/main.go` |
| Go handler 存根 | `cmd/server/handlers.go` |
| 数据模型 | `internal/model/model.go` |
| 统一响应 | `internal/util/response.go` |
| 前端 API 封装 | `frontend/src/api/index.ts` |
| 前端类型定义 | `frontend/src/types/schemas.ts` |
