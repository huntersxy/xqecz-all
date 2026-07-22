# AGENTS.md — xqecz-nodejs

## 项目概述

小泉动漫二创站 Node.js 版 — Node.js + TypeScript + Express + SQLite 后端，内嵌 Vue 3 前端。
从 Go 版（`xqecz-golang/`）迁移而来，**无残留 Go 代码**。

> 分支：`concept/node-fullstack`（当前开发分支）

**核心约束：前后端端点对齐** — Node 后端的路由、请求参数、响应格式必须与前端 `frontend/src/api/index.ts` 中定义的接口完全一致。以前端契约为准。

## 目录结构

```
server/
  src/
    index.ts                # 入口：监听端口、首启自动 seed
    app.ts                  # Express 装配（中间件 + 路由 + 静态托管）
    seed.ts                 # 演示数据 seed
    types.ts                # 共享 TypeScript 类型
    db/
      index.ts              # SQLite 连接、建表（8 张表）、所有数据访问函数
    routes/                 # 路由层（handler + service + repo 一体）
      auth.ts               # 注册 / 登录 / 登出 / 初始化管理员 / 获取当前用户
      content.ts            # 内容 CRUD / 搜索 / 推荐 / 标签 / 上传 / 认领
      comment.ts            # 评论列表 / 添加 / 删除 / 举报
      poll.ts               # 投票列表 / 详情 / 投票 / 创建 / 删除
      admin.ts              # 审核 / 用户管理 / 缩略图 / 清理
      apikey.ts             # API 密钥 CRUD
    middleware/
      auth.ts               # JWT Cookie 认证（requireAuth / optionalAuth / requireAdmin）
      error.ts              # 全局错误处理 + 404
      rateLimit.ts          # express-rate-limit 封装
    util/
      response.ts           # 统一响应：success / error / paginated
      pagination.ts         # 分页参数解析
      media.ts              # multer 磁盘存储、文件类型检查
      security.ts           # bcrypt / JWT / API Key 生成 / SHA-256
      thumbnail.ts          # sharp（图片）/ ffmpeg-static（视频）缩略图
      compress.ts           # Tinify API 压缩（env 门控）
      linkPreview.ts        # OG/Twitter Card 元数据抓取
      storage.ts            # S3 兼容对象存储（AWS SigV4，env 门控）
    validation/
      schemas.ts            # Zod 请求校验 schema
      validate.ts           # Express 中间件：validate + coerce req.body
  data/                     # SQLite 数据库文件（gitignore）
  uploads/                  # 上传文件 + 缩略图（gitignore）

frontend/                   # Vue 3 前端（git submodule → xqecz_frontend）

scripts/
  build.sh                  # 构建脚本（git pull + 前后端构建）
  deploy.sh                 # 一键部署（pull + build + restart）
  dev-frontend.sh           # 前端开发服务器（VITE_PROXY_TARGET → localhost:3000）
  run.sh                    # 进程管理（前台/后台/停止/重启/状态）
  xqecz.bat                 # Windows 部署菜单
  panel/                    # Python 部署管理面板配置

docker/                     # Docker 相关
  nginx.conf                # Nginx 反向代理（含可选 HTTPS 块）

Dockerfile                  # 3 阶段构建（frontend-builder → backend-builder → runtime）
docker-compose.yml          # app + nginx 服务
```

## 构建与测试命令

```bash
# 后端
cd server
npm install
npm run dev        # tsx watch 热重载（端口 3000）
npm run build      # tsc 编译到 dist/
npm run typecheck  # 仅类型检查
npm start          # node dist/index.js
npm run seed       # 手动初始化演示数据

# 前端
cd frontend && npm run dev          # 开发服务器
cd frontend && npm run build        # 生产构建（含 type-check + vite build）

# Docker
docker compose build                # 多阶段构建
docker compose up -d                # 生产部署（nginx:8080 → app:3000）
```

## 架构分层规则

### 后端：routes → db → util

| 层 | 职责 | 文件位置 |
|---|---|---|
| `routes/` | 参数校验、AuthUser 校验、调用 db 函数、返回响应 | `server/src/routes/` |
| `db/` | SQLite 连接、建表、所有数据访问函数（better-sqlite3 参数化查询） | `server/src/db/index.ts` |
| `util/` | 无状态工具函数（media / pagination / response / security / ...） | `server/src/util/` |

- `routes/` 内禁止直接拼接 SQL，所有 DB 操作在 `db/index.ts`
- `util/response.ts` 提供 `success` / `error` / `paginated` 统一响应
- `util/pagination.ts` 提供分页参数解析

### 前端架构

前端是 `xqecz_frontend` 的 git submodule，编码规范见 `xqecz_frontend/AGENTS.md`。

## 编码规范

### 响应格式

统一 `{ code, message, data }`，使用 `server/src/util/response.ts` 的 `success` / `error` / `paginated`。

### 认证

JWT Cookie 认证（httpOnly，7 天过期），用户信息挂到 `req.user`。
中间件：`requireAuth`（必须登录）、`optionalAuth`（可选）、`requireAdmin`（管理员）。

### 软删除

所有删除在 `contents` / `comments` / `polls` 表写 `deleted_at`（Unix 时间戳），查询加 `WHERE deleted_at IS NULL`。

### 数据库

better-sqlite3 同步 API，参数化查询防注入，不用 ORM。
WAL 模式，外键开启。DB 文件：`server/data/app.db`（可通过 `DB_PATH` 环境变量覆盖）。

### 配置

通过环境变量，无配置文件：
- `PORT`（默认 3000）
- `DB_PATH`（SQLite 文件路径）
- `JWT_SECRET` / `JWT_EXPIRES_IN`
- `TINIFY_API_KEY`（可选，开启图片压缩）
- `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`（可选，开启对象存储）

### 错误处理

路由内 `try/catch` 后 `error(res, code, msg)`，不抛未捕获异常。

### Zod 校验

请求体通过 `server/src/validation/schemas.ts` 定义 schema，`validate` 中间件自动校验 + coerce。

## 开发工作流

添加新功能的顺序：
1. `server/src/db/index.ts` — 建表 / 新增数据访问函数
2. `server/src/validation/schemas.ts` — 定义 zod 请求校验 schema
3. `server/src/routes/*.ts` — 新增路由（参数校验 → 调用 db → 统一响应）
4. 如需复用逻辑，放入 `server/src/util/`

**关键**: 实现路由时必须对照前端 `frontend/src/api/index.ts` 中的接口定义，确保请求参数名、响应字段名完全一致。

## 可选进阶能力（env 门控，缺省不启用）

- **原图压缩 (Tinify)**：设置 `TINIFY_API_KEY` 后，图片上传自动压缩原图并写入 `compressed_path`，读取时优先返回；未设置则原图直出。
- **链接 / 外部视频元数据**：`link` 类型内容缺省标题/缩略图时，自动抓取目标页 OG 元数据补全标题、封面、来源平台（`platform`，如 bilibili/youtube）。
- **对象存储 (S3 兼容)**：配齐 S3 环境变量后，上传原图自动推送至 COS/OSS/S3/MinIO/Cloudflare R2 并返回 CDN 地址；失败回落本地磁盘。

## Docker 部署

- `docker-compose.yml` 构建 Node 后端 + Vue 前端（多阶段）：
  - `app` 服务仅对内网暴露（`expose: 3000`）
  - `nginx` 监听 `${XQ_HTTP_PORT:-8080}:80`，反代到 `app:3000`
  - 启用 HTTPS 时取消 `docker/nginx.conf` 中 443 块并放开 compose 的 `XQ_HTTPS_PORT`
- 健康检查: `http://localhost:8080/api/health`
- 数据持久化: `./docker_data/uploads` 和 `./docker_data/data`

## 已知约束

- 后端使用 SQLite（better-sqlite3），单机部署；无 MySQL / Redis
- 对象存储模式下缩略图仍存本地磁盘（原图走远端）
- 前端用 hash 路由，SEO 不适用
- `server/uploads/`、`server/uploads/thumbs/`、`server/data/` 目录需可写
- 视频缩略图依赖 `ffmpeg-static`（随依赖安装，无需系统 FFmpeg）

## 关键文件速查

| 用途 | 文件 |
|------|------|
| 入口 | `server/src/index.ts` |
| Express 装配 | `server/src/app.ts` |
| 数据库 + 数据访问 | `server/src/db/index.ts` |
| Zod 校验 schema | `server/src/validation/schemas.ts` |
| 统一响应 | `server/src/util/response.ts` |
| 认证中间件 | `server/src/middleware/auth.ts` |
| 共享类型 | `server/src/types.ts` |
| 前端 API 封装 | `frontend/src/api/index.ts` |
| 前端类型定义 | `frontend/src/types/schemas.ts` |
