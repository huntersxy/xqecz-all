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
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# Stage 3: 运行阶段
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
# 后端运行产物 + 生产依赖
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY --from=backend-builder /app/server/package.json ./server/package.json
# 前端产物（由后端同源托管）
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
# 运行时目录（上传文件）
RUN mkdir -p /app/server/uploads /app/server/uploads/thumbs
ENV PORT=3000 \
    TZ=Asia/Shanghai
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
