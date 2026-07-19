# xqecz-all 开发计划

## 项目状态

✅ **已完成**
- Go模块初始化
- 目录结构创建
- 配置系统 (Viper)
- 数据库迁移脚本
- Redis连接工具
- 中间件 (认证、CORS、限流、错误处理)
- 数据模型定义
- 工具函数 (安全、分页、视频、文件)
- Docker配置
- 前端代码复制
- Git仓库初始化

## 下一步开发计划

### Phase 1: 核心功能实现 (优先级：高)

#### 1.1 Repository层 (`internal/repository/`)
- `user.go` - 用户数据访问
- `content.go` - 内容数据访问
- `comment.go` - 评论数据访问
- `poll.go` - 投票数据访问

#### 1.2 Service层 (`internal/service/`)
- `auth.go` - 认证服务（注册、登录、登出）
- `content.go` - 内容服务（CRUD、上传、搜索）
- `comment.go` - 评论服务（添加、删除、举报）
- `admin.go` - 管理服务（审核、用户管理）

#### 1.3 Handler层 (`internal/handler/`)
- 实现所有API处理器
- 请求验证
- 响应格式化

### Phase 2: 高级功能 (优先级：中)

- 推荐系统
- 通知系统
- API密钥管理
- 外部视频解析
- 图片压缩 (Tinify)

### Phase 3: 优化和测试 (优先级：低)

- 单元测试
- 性能优化
- 文档完善

## 初始化指南

### 1. 克隆项目

```bash
git clone https://github.com/huntersxy/xqecz-all.git
cd xqecz-all
```

### 2. 安装Go依赖

```bash
go mod tidy
```

### 3. 配置环境

```bash
# 复制配置文件
cp config/config.example.yaml config/config.yaml

# 编辑配置文件
# 配置MySQL和Redis连接信息
vim config/config.yaml
```

### 4. 启动基础设施

```bash
# 使用Docker启动MySQL和Redis
docker compose --profile dev up -d mysql redis
```

### 5. 运行后端

```bash
go run ./cmd/server/
```

### 6. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 7. 访问应用

- 前端: http://localhost:5173
- API: http://localhost:8080

## 开发工作流

### 添加新功能

1. 在 `internal/model/` 定义数据模型
2. 在 `internal/dto/` 定义请求/响应结构
3. 在 `internal/repository/` 实现数据访问
4. 在 `internal/service/` 实现业务逻辑
5. 在 `internal/handler/` 实现HTTP处理器
6. 在 `cmd/server/main.go` 注册路由

### 测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/service/...

# 生成测试覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### 构建和部署

```bash
# 本地构建
go build -o server ./cmd/server/

# Docker构建
docker compose build

# Docker部署
docker compose up -d
```

## 注意事项

1. **数据库连接**: 确保MySQL和Redis已启动并配置正确
2. **配置文件**: 首次运行需要配置 `config/config.yaml`
3. **端口冲突**: 默认后端端口8080，前端端口5173
4. **文件权限**: 确保 `uploads/`、`thumbnails/`、`images/` 目录可写

## 常见问题

### Q: 数据库连接失败
A: 检查MySQL是否启动，配置文件中的连接信息是否正确

### Q: Redis连接失败
A: 检查Redis是否启动，项目会降级到内存存储Session

### Q: 前端无法访问API
A: 检查 `frontend/vite.config.ts` 中的代理配置

### Q: 编译错误
A: 运行 `go mod tidy` 确保所有依赖已下载

## 联系方式

- GitHub: https://github.com/huntersxy/xqecz-all
- Issues: https://github.com/huntersxy/xqecz-all/issues
