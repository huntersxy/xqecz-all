#!/bin/bash
# xqecz-all 一键部署脚本 (Node.js 后端)
# 用法: ./deploy.sh

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
echo "=== xqecz-all 一键部署 (Node) ==="

export HOME=${HOME:-/root}
export PATH=$PATH:/usr/local/bin:/usr/local/node/bin:$HOME/.nvm/versions/node/*/bin

cd "$REPO_ROOT"

# 1. 拉取代码
echo ""
echo "=== 1. 拉取最新代码 ==="
git config pull.rebase false
git pull
echo "✓ 代码已更新"

# 2. 构建前端
echo ""
echo "=== 2. 构建前端 ==="
cd frontend
if [ ! -d "node_modules" ]; then npm install; fi
npm run build
cd ..
echo "✓ 前端构建完成"

# 3. 构建后端
echo ""
echo "=== 3. 构建后端 (Node) ==="
cd server
if [ ! -d "node_modules" ]; then npm install; fi
npm run build
cd ..
echo "✓ 后端构建完成"

# 4. 重启服务
echo ""
echo "=== 4. 重启服务 ==="
"$SCRIPT_DIR/run.sh" restart

echo ""
echo "=== 部署完成 ==="
echo "查看日志: tail -f server/logs/server.log"
