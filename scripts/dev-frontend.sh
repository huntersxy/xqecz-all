#!/bin/bash
# 启动前端开发服务器（Node 概念版后端）
# 前端源码来自 git submodule xqecz_frontend；开发态 /api、/uploads、/thumbnails、/images
# 的代理目标通过环境变量 VITE_PROXY_TARGET 注入（Node 后端默认 3000，Go 后端为 8080）。
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT/frontend"

# Node 概念版后端监听 3000；如需指向其它端口，可前置 export VITE_PROXY_TARGET=... 再运行本脚本
export VITE_PROXY_TARGET=${VITE_PROXY_TARGET:-http://localhost:3000}

echo "前端开发服务器（开发代理目标: $VITE_PROXY_TARGET）"
if [ ! -d "node_modules" ]; then
  echo "安装前端依赖..."
  npm install
fi
npm run dev
