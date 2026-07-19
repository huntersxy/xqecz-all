# xqecz-all

小泉动漫二创站 - Go + Vue 3 全栈应用

## 项目概述

这是一个动漫二次创作社区平台，用户可以上传、浏览和互动各种类型的二创内容（图片、视频、图文、链接）。

## 技术栈

### 后端
- **Web框架**: [Fiber](https://gofiber.io/) v2 - 基于fasthttp，高性能
- **数据库**: [sqlx](https://github.com/jmoiron/sqlx) + MySQL - 轻量级，类型安全
- **缓存**: [go-redis](https://github.com/redis/go-redis) v9 - Redis客户端
- **认证**: bcrypt + Session Cookie
- **配置**: [Viper](https://github.com/spf13/viper) - 支持YAML、环境变量
- **日志**: [zerolog](https://github.com/rs/zerolog) - 高性能结构化日志
- **JSON**: [sonic](https://github.com/bytedance/sonic) - 高性能JSON序列化

### 前端
- **框架**: Vue 3 + TypeScript
- **构建**: Vite 8
- **UI**: Ant Design Vue 4 + Tailwind CSS 4
- **状态**: Pinia 3
- **路由**: Vue Router 5 (Hash模式)

## 目录结构

```
xqecz-all/
├── cmd/server/          # 应用入口
├── internal/
│   ├── config/          # 配置管理
│   ├── handler/         # HTTP处理器
│   ├── service/         # 业务逻辑
│   ├── repository/      # 数据访问层
│   ├── middleware/       # 中间件
│   ├── model/           # 数据模型
│   ├── dto/             # 请求/响应结构
│   └── util/            # 工具函数
├── frontend/            # 前端代码
├── config/              # 配置文件
├── docker/              # Docker配置
└── assets/              # 静态资源
```

## 快速开始

### 环境要求

- Go 1.22+
- Node.js 22+
- MySQL 8.0+ / MariaDB 10.5+
- Redis 7.0+

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/huntersxy/xqecz-all.git
cd xqecz-all
```

2. **配置数据库**
```bash
# 复制配置文件
cp config/config.yaml.example config/config.yaml

# 编辑配置文件，配置MySQL和Redis连接
vim config/config.yaml
```

3. **启动后端**
```bash
go run ./cmd/server/
```

4. **启动前端**
```bash
cd frontend
npm install
npm run dev
```

5. **访问应用**
- 前端: http://localhost:5173
- API: http://localhost:8080

### Docker部署

#### 生产环境（远程MySQL + Redis）
```bash
docker compose build
docker compose up -d
```

#### 本地开发（包含MySQL + Redis）
```bash
docker compose --profile dev up -d
```

#### 仅启动基础设施
```bash
docker compose --profile dev up -d mysql redis
```

访问: http://localhost:9200

## 配置说明

配置文件位于 `config/config.yaml`，支持以下配置：

- **mysql**: 数据库连接配置
- **redis**: Redis连接配置
- **server**: 服务器端口、上传目录、允许的源等
- **recommend**: 推荐算法配置
- **push**: 推送通知配置（JPush）
- **spam_api**: 垃圾评论检测API
- **tinify**: 图片压缩配置

## API文档

API遵循RESTful风格，所有接口以 `/api` 为前缀。

### 主要接口

- **认证**: `/api/auth/*`
- **内容**: `/api/content/*`
- **评论**: `/api/comment/*`
- **投票**: `/api/poll/*`
- **通知**: `/api/notifications/*`
- **管理**: `/api/admin/*`
- **API密钥**: `/api/api-keys/*`

## 开发指南

### 添加新的API端点

1. 在 `internal/model/` 中定义数据模型
2. 在 `internal/dto/` 中定义请求/响应结构
3. 在 `internal/repository/` 中实现数据访问
4. 在 `internal/service/` 中实现业务逻辑
5. 在 `internal/handler/` 中实现HTTP处理器
6. 在 `cmd/server/main.go` 中注册路由

### 代码规范

- 使用 `gofmt` 格式化代码
- 使用 `golint` 检查代码风格
- 错误处理使用 `?` 传播模式
- 所有数据库操作使用参数化查询
- 敏感信息不记录到日志

## 部署说明

### 环境变量

- `XQ_APP_PORT`: 应用端口（默认9200）
- `XQ_MYSQL_ROOT_PASSWORD`: MySQL root密码
- `XQ_MYSQL_DATABASE`: 数据库名
- `XQ_MYSQL_USER`: 数据库用户
- `XQ_MYSQL_PASSWORD`: 数据库密码
- `XQ_MYSQL_PORT`: MySQL端口（默认13306）

### 目录权限

确保以下目录可写：
- `uploads/` - 用户上传文件
- `thumbnails/` - 缩略图
- `images/` - 图片

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

- GitHub: https://github.com/huntersxy/xqecz-all
