# xqecz-all 部署镜像 (Node.js 后端 + Vue 前端，同源托管)
ARG NODE_IMAGE=node:22-bookworm

# ── 阶段1: 前端构建 ──
FROM ${NODE_IMAGE} AS frontend-build
WORKDIR /app
COPY frontend/ .
RUN npm ci && npm run build

# ── 阶段2: 后端构建 (TS -> JS) ──
FROM ${NODE_IMAGE} AS backend-build
WORKDIR /app
COPY node-server/package.json node-server/package-lock.json ./
RUN npm ci
COPY node-server/ ./
RUN npm run build && npm prune --omit=dev

# ── 阶段3: 运行时 ──
FROM ${NODE_IMAGE}
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg ca-certificates curl tzdata \
    && rm -rf /var/lib/apt/lists/*

# 后端运行产物 + 生产依赖
COPY --from=backend-build /app/node-server/dist ./node-server/dist
COPY --from=backend-build /app/node-server/node_modules ./node-server/node_modules
COPY --from=backend-build /app/node-server/package.json ./node-server/package.json
# 前端产物（由 Node 同源托管）
COPY --from=frontend-build /app/dist ./frontend/dist

# 运行时目录
RUN mkdir -p /app/node-server/data /app/node-server/uploads /app/node-server/uploads/thumbs

ENV PORT=3000 \
    DB_PATH=/app/node-server/data/app.db \
    TZ=Asia/Shanghai

EXPOSE 3000
CMD ["node", "node-server/dist/index.js"]
