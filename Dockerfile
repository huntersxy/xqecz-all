ARG NODE_IMAGE=node:22-alpine

# Stage 1: 前端构建 (Vue 3 + Vite)
FROM ${NODE_IMAGE} AS frontend-builder
WORKDIR /app/frontend
RUN npm config set registry https://registry.npmmirror.com
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: 后端构建 (TypeScript -> JavaScript)
FROM ${NODE_IMAGE} AS backend-builder
WORKDIR /app/node-server
COPY node-server/package.json node-server/package-lock.json ./
RUN npm ci
COPY node-server/ ./
RUN npm run build && npm prune --omit=dev

# Stage 3: 运行阶段
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
# 后端运行产物 + 生产依赖
COPY --from=backend-builder /app/node-server/dist ./node-server/dist
COPY --from=backend-builder /app/node-server/node_modules ./node-server/node_modules
COPY --from=backend-builder /app/node-server/package.json ./node-server/package.json
# 前端产物（由后端同源托管）
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
# 运行时目录（SQLite 数据库 + 上传文件）
RUN mkdir -p /app/node-server/data /app/node-server/uploads /app/node-server/uploads/thumbs
ENV PORT=3000 \
    DB_PATH=/app/node-server/data/app.db \
    TZ=Asia/Shanghai
EXPOSE 3000
CMD ["node", "node-server/dist/index.js"]
