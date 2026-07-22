# AGENTS.md — xqecz-golang

## 项目概述

小泉动漫二创站 Go 后端 — Go + Fiber + MySQL + Redis，内嵌 Vue 3 前端。
**核心约束**：路由、请求参数、响应格式必须与前端 `frontend/src/api/index.ts` 完全一致。

## 目录结构

```
cmd/server/
  main.go              # 入口：配置加载、DB/Redis 初始化、路由注册
  scheduler.go         # 后台定时任务（推荐列表刷新、Tinify 压缩）

internal/
  config/              # Viper 配置加载
  handler/             # HTTP 处理器（薄层：解析参数 → 调用 service → 返回响应）
  middleware/          # 认证（Redis Session）、CORS、错误处理、限流（合并为 middleware.go）
  repository/          # 纯数据库操作（sqlx 查询），无业务逻辑
  service/             # 业务逻辑（缓存策略、外部调用）、media.go（上传 + Tinify 压缩）
  util/                # 响应 / 分页 / Redis / 安全 / 文件 / 视频
  docs/                # OpenAPI 接口文档（go:embed）

config/                # config.yaml 配置文件
docker/                # Docker + Nginx 部署
frontend/              # git submodule → xqecz_frontend
```

## 构建与测试

```bash
go build ./cmd/server/              # 编译
go run ./cmd/server/                # 运行（需 config/config.yaml）
go test ./...                       # 测试
go vet ./...                        # 静态检查
```

## 架构分层

| 层 | 职责 |
|---|---|
| `handler/` | 解析请求参数、校验 AuthUser、调用 service、返回响应 |
| `service/` | 业务逻辑、调用 repository、缓存策略 |
| `repository/` | 纯数据库操作（sqlx），无业务逻辑 |
| `util/` | 无状态工具函数 |

- Handler 禁止直接写 SQL
- `util/response.go` 提供 `Success` / `Error` / `Paginated` / `NewPaginated`
- 前端编码规范见 `xqecz_frontend/AGENTS.md`

## 编码规范

**Fiber v2 API**（非 Gin）：
```go
id := c.Params("id")                    // 路径参数
page := c.Query("page", "1")            // 查询参数
c.BodyParser(&req)                      // 请求体解析
middleware.GetAuthUser(c)               // 获取认证用户
c.Cookie(&fiber.Cookie{Name: "...", ...}) // 设置 Cookie
util.Success(c, fiber.Map{...})         // 成功响应
util.Error(c, 400, "msg")               // 错误响应
util.Paginated(c, list, total, page, pageSize) // 分页响应
util.NewPaginated(list, total, page, pageSize) // 分页 data 构造
```

**其他约定**：
- 响应格式：`{ code, message, data }` — 用 `util.Success` / `util.Error` / `util.Paginated`
- 认证：Redis Session，`session_id` Cookie（HTTPOnly，30 天），`middleware.Auth()` / `OptionalAuth()` / `Admin()`
- 软删除：`SET deleted_at = NOW(3)`，查询加 `WHERE deleted_at IS NULL`
- 缓存：Redis，TTL 定义在 service 层（列表 1h，详情 12h，评论计数 5min，推荐 ZSet 5min 刷新）
- 配置：Viper `config/config.yaml`，环境变量前缀 `XQ_`
- JSON：`github.com/bytedance/sonic`
- 日志：`github.com/rs/zerolog`
- ORM：`github.com/jmoiron/sqlx`，手动 SQL
- 错误处理：`util.Error(c, code, msg)`，不 panic

## 开发工作流

1. `internal/model/` — 确认数据模型（注意：`model/` 已删除，模型在 `repository/` 和 `service/` 中定义）
2. `internal/repository/` — 实现数据访问
3. `internal/service/` — 实现业务逻辑
4. `internal/handler/` — 实现 HTTP 处理器
5. `cmd/server/main.go` — 注册路由

**关键**：对照前端 `frontend/src/api/index.ts` 接口定义，确保参数名、响应字段名完全一致。

## Docker 部署

- `docker compose up -d` — 端口 `9200:8080`
- `docker compose --profile dev up -d` — 含 MariaDB + Redis
- 数据持久化：`./docker_data/{uploads,thumbnails,images,mysql,redis}`

## 关键文件速查

| 用途 | 文件 |
|------|------|
| 入口 & 路由 | `cmd/server/main.go` |
| 数据库迁移 | `internal/util/database.go` |
| 统一响应 | `internal/util/response.go` |
| Redis 客户端 | `internal/util/redis.go` |
| 认证中间件 | `internal/middleware/middleware.go` |
| OpenAPI 文档 | `docs/openapi.json` |
| 前端 API 封装 | `frontend/src/api/index.ts` |
