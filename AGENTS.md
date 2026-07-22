# AGENTS.md — xqecz-golang

## 项目概述

小泉动漫二创站 Go 后端 — Go + Fiber + MySQL + Redis 全栈应用，内嵌 Vue 3 前端。
用户上传/浏览二次创作内容（图片、视频、图文、链接），含评论、投票、通知、管理后台。

**核心约束：前后端端点对齐** — Go 后端的路由、请求参数、响应格式必须与前端 `frontend/src/api/index.ts` 中定义的接口完全一致。以前端契约为准。

## 目录结构

```
cmd/server/
  main.go              # 入口：配置加载、DB/Redis 初始化、路由注册、信号处理
  scheduler.go         # 后台定时任务（推荐列表刷新、Tinify 压缩）

internal/
  config/
    config.go          # 配置结构体定义
    loader.go          # Viper 配置加载（单例，支持环境变量 XQ_ 前缀）
  handler/             # HTTP 处理器（薄层：解析参数 → 调用 service → 返回响应）
    auth.go            # 认证：Register / Login / Logout / InitAdmin / GetMe
    content.go         # 内容：CRUD / 搜索 / 推荐 / 标签 / 上传 / 认领
    comment.go         # 评论：列表 / 添加 / 删除 / 举报
    poll.go            # 投票：列表 / 详情 / 投票 / 创建 / 删除
    admin.go           # 管理：审核 / 用户管理 / 缩略图 / 清理
    notification.go    # 通知：设备注册 / 列表 / 已读
    api_key.go         # API 密钥：CRUD
  middleware/
    auth.go            # JWT Session 认证（Redis 存储，30 天过期）
    cors.go            # CORS 跨域
    error.go           # 全局错误处理
    ratelimit.go       # 内存令牌桶限流（每 IP）
  model/
    model.go           # 10 个数据表的完整模型定义（User/Content/Comment/Poll/...）
  repository/          # 纯数据库操作（sqlx 查询），无业务逻辑
    content.go
    user.go
    comment.go
    poll.go
  service/             # 业务逻辑（缓存策略、外部调用、定时任务调度）
    auth.go / content.go / comment.go / poll.go / admin.go
    notification.go / api_key.go / claim.go / file_upload.go / tinify.go
  util/                # 无状态工具函数
    database.go        # 数据库迁移（11 张表）
    response.go        # 统一响应：Success / Error / Paginated / BadRequest / ...
    pagination.go      # 分页参数解析与 SQL 排序
    redis.go           # Redis 客户端：缓存 / Session / 浏览量 / 推荐 ZSet
    security.go        # bcrypt / SHA256 / HTML 转义 / 输入校验
    file.go            # 文件验证、保存、删除
    video.go           # FFmpeg 视频/图片缩略图生成

config/
  config.example.yaml  # 配置示例

docker/                # Docker + Nginx 部署方案
  docker-compose.yml   # 多环境（production + dev 含 MySQL + Redis）
  nginx.conf           # 反向代理 + 静态资源缓存
  Dockerfile           # Nginx + Go 运行时
  entrypoint.sh
  config.yaml          # Docker 环境配置

frontend/              # Vue 3 前端（git submodule → xqecz_frontend）
```

## 构建与测试命令

```bash
go build ./cmd/server/              # 编译
go run ./cmd/server/                # 运行（需 config/config.yaml）
go test ./...                       # 运行所有测试
go vet ./...                        # 静态检查

# Docker
docker compose build                # 多阶段构建
docker compose up -d                # 生产部署
docker compose --profile dev up -d  # 本地开发（含 MySQL + Redis）
```

## 架构分层规则

### Handler → Service → Repository 三层分离

| 层 | 职责 | 文件位置 |
|---|---|---|
| `handler/` | 解析请求参数、校验 AuthUser、调用 service、返回响应 | `internal/handler/` |
| `service/` | 业务逻辑、调用 repository、缓存策略、外部调用 | `internal/service/` |
| `repository/` | 纯数据库操作（sqlx 查询），无业务逻辑 | `internal/repository/` |
| `util/` | 无状态工具函数，跨层复用 | `internal/util/` |

- Handler 禁止直接写 SQL，所有 DB 操作在 repository 层
- `util/response.go` 提供 `Success` / `Error` / `Paginated` / `BadRequest` 等统一响应
- `util/pagination.go` 提供分页参数解析

### 前端架构

前端是 `xqecz_frontend` 的 git submodule，编码规范见 `xqecz_frontend/AGENTS.md`。

## 编码规范

### Fiber API 风格

本项目使用 **Fiber v2**（非 Gin），API 风格如下：

```go
// 路径参数
id := c.Params("id")

// 查询参数
page := c.Query("page", "1")

// 请求体解析
var req RegisterRequest
if err := c.BodyParser(&req); err != nil { ... }

// 获取认证用户（中间件注入）
user := middleware.GetAuthUser(c)  // 返回 *AuthUser 或 nil

// 设置 Cookie
c.Cookie(&fiber.Cookie{
    Name:     "session_id",
    Value:    sessionID,
    MaxAge:   30 * 24 * 3600,
    Path:     "/",
    HTTPOnly: true,
    SameSite: "Lax",
})

// 响应
return util.Success(c, fiber.Map{"key": "value"})
return util.Error(c, 400, "错误信息")
return util.Paginated(c, list, total, page, pageSize)
```

### 响应格式

统一 `ApiResponse { code, message, data }`，使用 `util.Success` / `util.Error` / `util.Paginated`。

### 认证

Session 存储在 Redis，通过 `session_id` Cookie 传递（HTTPOnly，30 天过期）。
中间件：`middleware.Auth()`（必须登录）、`middleware.OptionalAuth()`（可选）、`middleware.Admin()`（管理员）。

### 软删除

所有删除用 `SET deleted_at = NOW(3)`，查询加 `WHERE deleted_at IS NULL`。

### 缓存策略

Redis 缓存通过 `util/redis.go`，TTL 常量定义在 service 层：
- 内容列表：1 小时
- 内容详情：12 小时
- 评论计数：5 分钟
- 推荐列表：ZSet，每 5 分钟刷新
- 浏览量：每日计数器，保留 30 天

### 其他约定

- **配置**: Viper 加载 `config/config.yaml`，环境变量前缀 `XQ_`
- **JSON**: 使用 `github.com/bytedance/sonic` 高性能序列化
- **日志**: `github.com/rs/zerolog` 结构化日志
- **ORM**: `github.com/jmoiron/sqlx`，手动写 SQL，不用 ORM
- **校验**: `github.com/go-playground/validator/v10`
- **错误处理**: 返回 `util.Error(c, code, msg)`，不 panic

## 开发工作流

添加新功能的顺序：
1. `internal/model/` — 定义/确认数据模型
2. `internal/repository/` — 实现数据访问
3. `internal/service/` — 实现业务逻辑
4. `internal/handler/` — 实现 HTTP 处理器
5. `cmd/server/main.go` — 注册路由（如需要）

**关键**: 实现 handler 时必须对照前端 `frontend/src/api/index.ts` 中的接口定义，确保请求参数名、响应字段名完全一致。

## Docker 部署

### 方案一：根目录（简洁版，单容器）

- `docker compose up -d` — 直接构建运行，端口映射 `9200:8080`
- 数据持久化: `./uploads`、`./thumbnails`、`./images`

### 方案二：docker/ 目录（Nginx 版）

- `docker compose --profile dev up -d` — 本地开发（含 MariaDB + Redis）
- `docker compose up -d` — 生产部署（Nginx 反代 → Go 后端）
- 端口映射: `${XQ_APP_PORT:-9200}` → Nginx 80
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
| 入口 & 路由 | `cmd/server/main.go` |
| 后台任务 | `cmd/server/scheduler.go` |
| 数据模型 | `internal/model/model.go` |
| 统一响应 | `internal/util/response.go` |
| Redis 客户端 | `internal/util/redis.go` |
| 数据库迁移 | `internal/util/database.go` |
| 认证中间件 | `internal/middleware/auth.go` |
| 配置结构体 | `internal/config/config.go` |
| 配置加载 | `internal/config/loader.go` |
| 配置示例 | `config/config.example.yaml` |
| 前端 API 封装 | `frontend/src/api/index.ts` |
| 前端类型定义 | `frontend/src/types/schemas.ts` |
