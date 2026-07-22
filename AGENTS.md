# AGENTS.md — xqecz-nodejs

## 项目概述

小泉动漫二创站 Node.js 版 — Node.js + TypeScript + Express + MySQL + Redis，内嵌 Vue 3 前端。
与 Go 版（`xqecz-golang/`）共享同一份 MySQL 数据和 Redis 登录态。
> 分支：`concept/node-fullstack`

**核心约束**：路由、请求参数、响应格式必须与前端 `frontend/src/api/index.ts` 完全一致。

## 目录结构

```
server/src/
  index.ts           # 入口：MySQL 迁移 → Redis 连接 → seed → Express 监听
  app.ts             # Express 装配（中间件 + 路由 + 静态托管）
  seed.ts            # 演示数据
  types.ts           # 共享 TypeScript 类型
  db/
    mysql.ts         # MySQL 连接池（mysql2/promise）
    redis.ts         # Redis 客户端（ioredis）：session / cache / view / recommend
    index.ts         # Schema 迁移 + 所有 async 数据访问函数
  routes/            # auth / content / comment / poll / admin / apikey
  middleware/        # index.ts（合并 auth / error / rateLimit）
  util/              # response / pagination / media / security / thumbnail / compress / linkPreview / storage
  validation/        # zod schemas + validate 中间件

docs/                # OpenAPI 接口文档
frontend/            # git submodule → xqecz_frontend
```

## 构建与测试

```bash
cd server
npm run dev        # tsx watch 热重载（端口 3000）
npm run build      # tsc 编译到 dist/
npm run typecheck  # 仅类型检查
npm run seed       # 手动初始化演示数据
```

## 架构分层

| 层 | 职责 |
|---|---|
| `routes/` | 参数校验、AuthUser 校验、调用 db 函数、返回响应 |
| `db/` | MySQL Schema 迁移 + async 数据访问函数 |
| `util/` | 无状态工具函数 |

- `routes/` 内禁止直接拼接 SQL，DB 操作通过 `db/index.ts` 导出函数
- `util/response.ts` 提供 `success` / `error` / `paginated`
- 前端编码规范见 `xqecz_frontend/AGENTS.md`

## 编码规范

- 响应格式：`{ code, message, data }` — 用 `success` / `error` / `paginated`
- 认证：Redis Session，`session_id` Cookie（HTTPOnly，30 天），`requireAuth` / `optionalAuth` / `requireAdmin`
- 软删除：`deleted_at`（MySQL DATETIME(3)），查询加 `WHERE deleted_at IS NULL`
- 数据库：MySQL（mysql2/promise async），Redis（ioredis），key 前缀 `xqecz:`
- 配置：环境变量 `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE`，`REDIS_HOST/PORT/PASSWORD/DB/PREFIX`
- 校验：Zod schema + `validate` 中间件
- 错误处理：`error(res, code, msg)`

## 开发工作流

1. `db/index.ts` — 建表迁移 / 新增 async 数据访问函数
2. `validation/schemas.ts` — 定义 zod 请求校验 schema
3. `routes/*.ts` — 新增路由
4. 如需复用逻辑，放入 `util/`

**关键**：对照前端 `frontend/src/api/index.ts` 接口定义，确保参数名、响应字段名完全一致。

## Docker 部署

- `docker compose build && docker compose up -d`
- 4 个服务：mysql（MariaDB 10.5）+ redis（Redis 8）+ app + nginx（8080→3000）
- 数据持久化：`./docker_data/{uploads,mysql,redis}`

## 关键文件速查

| 用途 | 文件 |
|------|------|
| 入口 | `server/src/index.ts` |
| MySQL 连接池 | `server/src/db/mysql.ts` |
| Redis 客户端 | `server/src/db/redis.ts` |
| Schema + 数据访问 | `server/src/db/index.ts` |
| 认证中间件 | `server/src/middleware/index.ts` |
| 统一响应 | `server/src/util/response.ts` |
| OpenAPI 文档 | `docs/openapi.json` |
| 前端 API 封装 | `frontend/src/api/index.ts` |
