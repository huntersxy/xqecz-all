# ── 阶段1: 前端构建 ──
FROM node:22-bookworm AS frontend-build

WORKDIR /app

# 复制前端代码
COPY frontend/ .

# 安装依赖并构建
RUN npm ci && npm run build

# ── 阶段2: 后端构建 ──
FROM golang:1.22-bookworm AS backend-build

WORKDIR /app

# 复制go.mod和go.sum
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建二进制文件
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o server ./cmd/server

# ── 阶段3: 运行时 ──
FROM nginx:1.27-bookworm

# 安装必要的工具
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制前端构建产物
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# 复制后端二进制文件
COPY --from=backend-build /app/server /app/server

# 复制配置文件
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /app/entrypoint.sh
COPY config/config.yaml /app/config/config.yaml
COPY assets/defaults/dy.webp /app/assets/defaults/dy.webp

# 创建必要的目录
RUN mkdir -p /app/uploads /app/thumbnails /app/images

# 设置执行权限
RUN chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 80

# 设置工作目录
WORKDIR /app

# 启动应用
CMD ["/app/entrypoint.sh"]
