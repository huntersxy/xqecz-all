#!/bin/bash
# xqecz-all 构建脚本 (Node.js 后端)
# 用法: ./build.sh

set -e

export HOME=${HOME:-/root}
export PATH=$PATH:/usr/local/bin:/usr/local/node/bin:$HOME/.nvm/versions/node/*/bin

APP_DIR=$(cd "$(dirname "$0")/.." && pwd)
echo "=== xqecz-all 构建脚本 (Node) ==="
echo "项目目录: $APP_DIR"

# 拉取最新代码
echo ""
echo "=== 拉取最新代码 ==="
cd "$APP_DIR"
git config pull.rebase false
git pull
# 同步前端 submodule（统一控制：前端源码在独立仓库 xqecz_frontend，跟踪 dev 分支）
git submodule update --init --remote frontend
echo "✓ 代码已更新"

# ==================== 构建前端 ====================
echo ""
echo "=== 构建前端 ==="
cd "$APP_DIR/frontend"
if [ ! -d "node_modules" ]; then npm install; fi
npm run build
echo "✓ 前端构建完成 -> frontend/dist"

# ==================== 构建后端 (TS -> JS) ====================
echo ""
echo "=== 构建后端 (Node) ==="
cd "$APP_DIR/server"
if [ ! -d "node_modules" ]; then npm install; fi
npm run build
echo "✓ 后端构建完成 -> server/dist"

# ==================== 准备运行时目录 ====================
echo ""
echo "=== 准备运行时目录 ==="
mkdir -p "$APP_DIR/server/uploads/thumbs" "$APP_DIR/server/data"
echo "✓ 目录就绪: server/uploads, server/data"

echo ""
echo "=== 构建完成 ==="
echo "启动后端: node server/dist/index.js   (或 scripts/run.sh start)"
echo "前端产物已构建到 frontend/dist，由后端同源托管"
