# xqecz-all

小泉动漫二创站 - Node.js + Vue 3 全栈应用

> 分支说明：`concept/node-fullstack` 为 **Node.js 后端分支**。原 Go 后端（`cmd/`、`internal/`）中，凡 Node 后端已实现的功能均已移除；仅剩 Node 尚未实现的功能仍以 Go 代码保留（见文末「残留 Go 代码」）。

## 项目概述

这是一个动漫二次创作社区平台，用户可以上传、浏览和互动各种类型的二创内容（图片、视频、图文、链接）。前端为 Vue 3 SPA，后端为 Node.js + TypeScript + Express，数据持久化使用本地 SQLite 文件（无需 MySQL / Redis）。

## 技术栈

### 后端 (`node-server/`)
- **运行时**: Node.js 22 (LTS)
- **语言**: TypeScript 5
- **Web 框架**: [Express](https://expressjs.com/) 4
- **数据库**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite 文件，零外部依赖)
- **认证**: JWT (`jsonwebtoken`) + `bcryptjs` 密码哈希
- **缩略图**: [sharp](https://sharp.pixelplumbing.com/) (图片) + [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) (视频抽帧)
- **安全**: [helmet](https://helmetjs.github.io/) + [compression](https://github.com/expressjs/compression) + [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- **校验**: [zod](https://zod.dev/) 4
- **文件上传**: [multer](https://github.com/expressjs/multer)
- **日志**: 结构化 `console` 输出（开发友好，无外部日志服务）

### 前端 (`frontend/`)
- **框架**: Vue 3 + TypeScript
- **构建**: Vite
- **UI**: Ant Design Vue 4 + Tailwind CSS
- **状态**: Pinia
- **路由**: Vue Router (Hash 模式)

## 目录结构

```
xqecz-all/
├── node-server/            # Node.js + TypeScript 后端（当前后端实现）
│   ├── src/
│   │   ├── index.ts        # 入口，监听端口、首启自动 seed
│   │   ├── app.ts          # Express 应用装配（中间件 + 路由 + 静态托管）
│   │   ├── db/index.ts     # SQLite 连接、建表、所有数据访问函数
│   │   ├── routes/         # 各业务路由（handler + service + repo 一体）
│   │   │   ├── auth.ts
│   │   │   ├── content.ts
│   │   │   ├── comment.ts
│   │   │   ├── poll.ts
│   │   │   ├── notification.ts
│   │   │   ├── admin.ts
│   │   │   └── apikey.ts
│   │   ├── middleware/      # auth / error / rateLimit
│   │   ├── util/            # media / pagination / response / security / thumbnail
│   │   ├── validation/      # zod schemas + validate 中间件
│   │   ├── seed.ts          # 演示数据初始化
│   │   └── types.ts         # 全局类型
│   ├── data/               # SQLite 数据库文件（gitignore）
│   └── uploads/            # 用户上传 + 缩略图（gitignore）
├── frontend/               # Vue 3 前端
├── config/                 # 旧 Go 配置（当前后端未使用，保留以备回溯）
├── docker/                 # Docker 相关配置
├── assets/                 # 静态资源（默认封面等）
├── cmd/  internal/  go.mod  go.sum   # 残留 Go 代码（见「残留 Go 代码」）
└── Dockerfile  docker-compose.yml  build.sh  deploy.sh  run.sh  xqecz.bat
```

## 快速开始

### 环境要求

- **Node.js 22+**（无需 Go / MySQL / Redis）
- （可选）FFmpeg 由 `ffmpeg-static` 自动提供，无需系统安装

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/huntersxy/xqecz-all.git
cd xqecz-all
```

2. **启动后端（端口 3000）**
```bash
cd node-server
npm install
npm run dev        # tsx watch，热重载
```
首次启动若数据库中无用户，会自动 seed 演示数据。

3. **启动前端（端口 5173，开发代理 /api -> :3000）**
```bash
cd frontend
npm install
npm run dev
```

4. **访问应用**
- 前端: http://localhost:5173
- API: http://localhost:3000/api
- 健康检查: http://localhost:3000/api/health

### 生产构建

```bash
# 后端编译 TS -> JS
cd node-server && npm install && npm run build   # 产物在 node-server/dist

# 前端构建
cd ../frontend && npm install && npm run build   # 产物在 frontend/dist（由后端同源托管）

# 运行后端
node node-server/dist/index.js
# 或者使用脚本： ./run.sh start
```

### Docker 部署

```bash
docker compose build
docker compose up -d
```
- 访问: http://localhost:9200 （`${XQ_APP_PORT:-9200}:3000`）
- 健康检查: http://localhost:9200/api/health

## 配置说明

后端通过环境变量配置（无配置文件）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 监听端口 |
| `DB_PATH` | `node-server/data/app.db` | SQLite 数据库文件路径 |
| `JWT_SECRET` | `xqecz-concept-secret-change-me` | JWT 签名密钥（生产务必修改） |
| `JWT_EXPIRES_IN` | `7d` | JWT 有效期 |

上传文件与缩略图位于 `node-server/uploads/`（原图）与 `node-server/uploads/thumbs/`（缩略图），由后端以 `/uploads` 静态托管。

## API 文档

API 遵循 RESTful 风格，所有接口以 `/api` 为前缀。

### 主要接口

- **认证**: `/api/auth/*` （register / login / logout / init-admin / me）
- **内容**: `/api/content/*` （list / search / recommend / tags / upload / my / claim / 详情/更新/删除）
- **评论**: `/api/comment/*` （list / count / add / delete / report）
- **投票**: `/api/poll/*` （list / 详情 / vote / create / delete）
- **通知**: `/api/notifications/*` （device / list / unread-count / read）
- **管理**: `/api/admin/*` （audit / pending / content / claims / comments / users / 缩略图重建）
- **API 密钥**: `/api/api-keys/*` （create / list / update / delete）

## 开发指南

### 新增一个 API 端点

1. 在 `node-server/src/db/index.ts` 中按需建表 / 新增数据访问函数
2. 在对应的 `node-server/src/routes/*.ts` 中新增路由（参数校验 → 调用 db → 统一响应）
3. 在 `node-server/src/validation/schemas.ts` 中补充 zod schema
4. 如涉及新中间件，在 `node-server/src/middleware/` 中新增

### 代码规范

- TypeScript `strict` 模式；统一用 `util/response.ts` 的 `success / error / paginated` 返回
- 请求体校验统一走 zod + `validate` 中间件
- 所有数据库访问集中在 `db/index.ts`（better-sqlite3 参数化查询，防注入）
- 密码使用 `bcryptjs` 哈希，认证使用 JWT；敏感信息不记录日志

## 残留 Go 代码

本分支已从 Go 后端迁移到 Node 后端。**Node 已实现的功能对应的 Go 代码已全部删除**。以下 Go 文件因 **Node 后端尚未实现对应功能** 而暂时保留，待 Node 补齐后移除：

| 文件 | 功能 | Node 现状 |
|------|------|-----------|
| `cmd/server/scheduler.go` | 后台定时任务（推荐列表刷新、Tinify 批量压缩、推送） | 无定时任务机制 |
| `internal/service/tinify.go` | 调用 Tinify API 压缩图片 | 仅本地 sharp 缩略图，无外部压缩 |
| `internal/util/redis.go` | Redis 缓存 / 会话 / 推荐 ZSet | 使用 SQLite，无 Redis 缓存层 |

> 这些文件不属于构建产物，不参与 Docker 镜像与 `node-server` 运行；保留仅为功能回溯与后续 Node 化参考。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: https://github.com/huntersxy/xqecz-all
