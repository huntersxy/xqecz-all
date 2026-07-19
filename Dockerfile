ARG NODE_IMAGE=node:22-alpine
ARG GOLANG_IMAGE=golang:1.25-alpine
ARG ALPINE_IMAGE=alpine:3.20

# Stage 1: 前端构建
FROM ${NODE_IMAGE} AS frontend-builder
WORKDIR /app/frontend
RUN npm config set registry https://registry.npmmirror.com
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: 后端构建
FROM ${GOLANG_IMAGE} AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://goproxy.cn,direct && go mod download
COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# Stage 3: 运行阶段
FROM ${ALPINE_IMAGE}
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache ffmpeg ca-certificates tzdata
WORKDIR /app
COPY --from=backend-builder /app/server .
COPY --from=backend-builder /app/frontend/dist ./frontend/dist
COPY docker/config.yaml ./config/config.yaml
RUN mkdir -p /app/uploads /app/thumbnails /app/images
EXPOSE 8080
CMD ["/app/server"]
