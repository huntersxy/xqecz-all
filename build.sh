#!/bin/bash
# xqecz-all 构建脚本 (Node.js 后端)
# 用法: ./build.sh

set -e

export HOME=${HOME:-/root}
export PATH=$PATH:/usr/local/bin:/usr/local/node/bin:$HOME/.nvm/versions/node/*/bin

APP_DIR=$(cd "$(dirname "$0")" && pwd)
echo "=== xqecz-all 构建脚本 (Node) ==="
echo "项目目录: $APP_DIR"

# 拉取最新代码
echo ""
echo "=== 拉取最新代码 ==="
cd "$APP_DIR"
git config pull.rebase false
git pull
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
cd "$APP_DIR/node-server"
if [ ! -d "node_modules" ]; then npm install; fi
npm run build
echo "✓ 后端构建完成 -> node-server/dist"

# ==================== 准备运行时目录 ====================
echo ""
echo "=== 准备运行时目录 ==="
mkdir -p "$APP_DIR/node-server/uploads/thumbs" "$APP_DIR/node-server/data"
echo "✓ 目录就绪: node-server/uploads, node-server/data"

echo ""
echo "=== 构建完成 ==="
echo "启动后端: node node-server/dist/index.js   (或 ./run.sh start)"
echo "前端产物已构建到 frontend/dist，由后端同源托管"
