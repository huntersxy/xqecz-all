# AGENTS.md — xqecz-all

## 项目概述

小泉动漫二创站 — Node.js + TypeScript + Express 后端 + Vue 3 全栈应用（`concept/node-fullstack` 分支）。
用户上传/浏览二次创作内容（图片、视频、图文、链接），含评论、投票、管理后台。

> 迁移说明：后端已从 Go（`cmd/`、`internal/`）完整迁移到 Node（`server/`），**无残留 Go 代码**。

**核心约束：前后端端点对齐** — Node 后端的路由、请求参数、响应格式必须与前端 `frontend/src/api/index.ts` 中定义的接口完全一致。以前端契约为准。

## 目录结构

```
server/                 # Node.js + TypeScript 后端（当前后端实现）
  src/
    index.ts                 # 入口：监听端口、首启自动 seed
    app.ts                   # Express 装配（中间件 + 路由 + 静态托管）
    db/index.ts              # SQLite 连接、建表、所有数据访问函数
    routes/                  # 各业务路由（handler + service + repo 一体）
    middleware/              # auth / error / rateLimit
    util/                    # media / pagination / response / security / thumbnail / compress(Tinify) / linkPreview(OG) / storage(S3 兼容)
    validation/              # zod schemas + validate 中间件
    seed.ts  types.ts
  data/                      # SQLite 数据库文件（gitignore）
  uploads/                   # 上传文件 + 缩略图（gitignore）

frontend/                    # Vue 3 + TypeScript + Vite + Ant Design Vue + Tailwind CSS
  src/api/index.ts           # ofetch 封装，统一 401/重试/错误处理
  src/types/schemas.ts       # Zod schema（前端类型单一来源）
  src/stores/                # Pinia 状态管理
  src/views/                 # 路由页面

scripts/                     # 部署 / 运维脚本（build / deploy / run / panel）
  build.sh  deploy.sh  run.sh   # 构建 / 一键部署 / 运行（路径以脚本自身定位仓库根）
  xqecz.bat                  # Windows 一键部署菜单（调用 scripts/panel）
  panel/                     # Python 部署管理面板（FastAPI + CLI）
assets/                      # 静态资源（默认封面等）
Dockerfile  docker-compose.yml  .dockerignore   # Node 容器部署（nginx:8080 -> app:3000）
docker/nginx.conf                              # nginx 反向代理（含可选 HTTPS 块）
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

移植时参考 Rust 的 `handlers/` 和 `services/` 实现对应的 Node 版本（`server/src/routes/`）。

## 构建与测试命令

```bash
# 后端 (Node.js)
cd server
npm install
npm run dev        # tsx watch 热重载（端口 3000）
npm run build      # tsc 编译到 dist/
npm run typecheck  # 仅类型检查
npm start          # node dist/index.js
npm run seed       # 手动初始化演示数据

# 前端
cd frontend && npm run build        # 生产构建（含 type-check + vite build）
cd frontend && npx vue-tsc --noEmit # 仅类型检查
cd frontend && npm run dev          # 开发服务器

# Docker
docker compose build                # 多阶段构建（前端 + Node 后端）
docker compose up -d                # 生产部署（nginx:8080 反代 -> app:3000）
```

## 架构分层规则

### 后端 routes → db → util 分层（Node）

| 层 | 职责 | 文件位置 |
|---|---|---|
| `routes/` | 参数校验、AuthUser 校验、调用 db 函数、返回响应（handler + service + repo 一体） | `server/src/routes/` |
| `db/` | SQLite 连接、建表、所有数据访问函数（better-sqlite3 参数化查询） | `server/src/db/index.ts` |
| `util/` | 无状态工具函数（media / pagination / response / security / thumbnail），跨层复用 | `server/src/util/` |

- `routes/` 内禁止直接拼接 SQL，所有 DB 操作在 `db/index.ts`
- `util/response.ts` 提供 `success` / `error` / `paginated` 等统一响应
- `util/pagination.ts` 提供分页参数解析

### 前端 API → Store → Composable → View

| 层 | 职责 |
|---|---|
| `api/index.ts` | HTTP 封装，统一错误处理，`request<T>()` 泛型 |
| `stores/` | Pinia 状态管理，调用 API |
| `composables/` | 可复用逻辑 |
| `views/` | 路由页面 |

## API 端点对照表

路由前缀 `/api/`，RESTful 风格。以下为已注册的完整端点（Node 版实现位于 `server/src/routes/`）；表中 "Handler" 列为 Go 时代的标识符，对应实现见同名路由文件（`routes/*.ts`）。

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

### 后端 (Node.js)

- **响应格式**: 统一 `{ code, message, data }`，用 `server/src/util/response.ts` 的 `success` / `error` / `paginated`
- **分页**: `server/src/util/pagination.ts` 解析 `page` / `pageSize`，统一分页响应
- **认证**: `server/src/middleware/auth.ts` 校验 JWT，将用户信息挂到 `req.user`
- **软删除**: 所有删除在 `contents` / `comments` / `polls` 表写 `deleted_at`，查询加 `WHERE deleted_at IS NULL`（SQLite 用 `IS NULL` 判断）
- **缓存**: 当前无 Redis；SQLite 直接查询
- **配置**: 通过环境变量（`PORT` / `DB_PATH` / `JWT_SECRET` / `JWT_EXPIRES_IN`），无配置文件
- **JSON**: Express 内置 `express.json()`
- **日志**: 结构化 `console` 输出
- **数据库**: better-sqlite3 同步 API，参数化查询防注入，不用 ORM
- **错误处理**: 路由内 `try/catch` 后 `error(res, code, msg)`，不抛未捕获异常

### 前端 (TypeScript/Vue)

- **类型安全**: Zod schema 在 `types/schemas.ts`（单一来源），`types/index.ts` re-export
- **Schema 设计**: 用 `z.unknown().transform(...)` 而非 `z.any()`，字段缺失时兜空值
- **API 错误**: `onResponseError` 只 console.error，`request()` catch 统一 `message.error()` 弹 toast
- **401 处理**: 仅 `/admin` 页面跳登录页，公开页面不跳转
- **路由**: Hash 模式 (`createWebHashHistory`)，SEO 不适用

## 开发工作流

添加新功能的顺序：
1. `server/src/db/index.ts` — 建表 / 新增数据访问函数
2. `server/src/validation/schemas.ts` — 定义 zod 请求校验 schema
3. `server/src/routes/*.ts` — 新增路由（参数校验 → 调用 db → 统一响应）
4. 如需复用逻辑，放入 `server/src/util/`
5. 中间件放入 `server/src/middleware/`

**关键**: 实现路由时必须对照前端 `frontend/src/api/index.ts` 中的接口定义，确保请求参数名、响应字段名完全一致。

## Docker 部署

- `docker-compose.yml` 构建 Node 后端 + Vue 前端（多阶段），无 MySQL / Redis：
  - `docker compose build` — 多阶段构建
  - `docker compose up -d` — 生产部署（nginx 监听 `${XQ_HTTP_PORT:-8080}`:80 反代到 `app:3000`）
- `app` 服务仅对内网暴露（`expose: 3000`），公网流量经 `nginx` 服务进入；启用 HTTPS 时取消 `docker/nginx.conf` 中 443 块并放开 compose 的 `XQ_HTTPS_PORT`
- 健康检查: `http://localhost:8080/api/health`
- 数据持久化: `./docker_data/uploads` 与 `./docker_data/data` 分别挂载到 `server/uploads`、`server/data`
- 数据库为 SQLite 文件 `server/data/app.db`（容器内）

## 可选进阶能力（env 门控，缺省不启用）

- **原图压缩 (Tinify)**：设置 `TINIFY_API_KEY` 后，图片上传自动压缩原图并写入 `compressed_path`，读取时优先返回；未设置则原图直出。
- **链接 / 外部视频元数据**：`link` 类型内容缺省标题/缩略图时，自动抓取目标页 OG 元数据补全标题、封面、来源平台（`platform`，如 bilibili/youtube）。
- **对象存储 (S3 兼容)**：配齐 `S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` 后，上传原图自动推送至 COS/OSS/S3/MinIO/Cloudflare R2 并返回 CDN 地址；失败回落本地磁盘。

## 已知约束

- 后端使用 SQLite（better-sqlite3），单机部署；无 MySQL / Redis
- 对象存储模式下缩略图仍存本地磁盘（原图走远端），如需全量上云需另行扩展
- Tinify / 对象存储的线上行为依赖外部密钥，本地无密钥时自动降级，功能不受影响
- 前端用 hash 路由，SEO 不适用
- `server/uploads/`、`server/uploads/thumbs/`、`server/data/` 目录需可写
- 视频缩略图依赖 `ffmpeg-static`（随依赖安装，无需系统 FFmpeg）

## 关键文件速查

| 用途 | 文件 |
|------|------|
| Rust 参考（路由） | `E:\Code\xqdm\xiaoquan-backend\src\main.rs` |
| Rust 参考（handler） | `E:\Code\xqdm\xiaoquan-backend\src\handlers/*.rs` |
| Rust 参考（service） | `E:\Code\xqdm\xiaoquan-backend\src\services/*.rs` |
| Node 入口 | `server/src/index.ts` |
| Node 路由 | `server/src/routes/*.ts` |
| 数据访问 | `server/src/db/index.ts` |
| 统一响应 | `server/src/util/response.ts` |
| 前端 API 封装 | `frontend/src/api/index.ts` |
| 前端类型定义 | `frontend/src/types/schemas.ts` |
