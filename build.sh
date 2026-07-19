#!/bin/bash
# xqecz-all 构建脚本
# 用法: ./build.sh

set -e

# 加载环境变量
source /etc/profile 2>/dev/null || true
source ~/.bashrc 2>/dev/null || true
source ~/.nvm/nvm.sh 2>/dev/null || true
export HOME=${HOME:-/root}
export GOPATH=$HOME/go
export GOMODCACHE=$GOPATH/pkg/mod
export GOCACHE=$HOME/.cache/go-build
export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin:/usr/local/bin:/usr/local/node/bin:$HOME/.nvm/versions/node/*/bin

APP_DIR=$(cd "$(dirname "$0")" && pwd)
DIST_DIR="$APP_DIR/dist"

echo "=== xqecz-all 构建脚本 ==="
echo "输出目录: $DIST_DIR"

# 拉取最新代码
echo ""
echo "=== 拉取最新代码 ==="
cd "$APP_DIR"
git config pull.rebase false
git pull
echo "✓ 代码已更新"

# 准备 dist 目录（保留运行时数据）
mkdir -p "$DIST_DIR"
mkdir -p "$DIST_DIR/config"
mkdir -p "$DIST_DIR/frontend"
mkdir -p "$DIST_DIR/uploads"
mkdir -p "$DIST_DIR/thumbnails"
mkdir -p "$DIST_DIR/images"
mkdir -p "$DIST_DIR/logs"

# 清理构建产物（不影响运行时数据）
rm -rf "$DIST_DIR/frontend/dist"

# ==================== 构建前端 ====================
echo ""
echo "=== 构建前端 ==="
cd "$APP_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "构建前端..."
npm run build

# 复制前端产物到 dist
cp -r "$APP_DIR/frontend/dist" "$DIST_DIR/frontend/"
echo "✓ 前端构建完成 -> dist/frontend/dist"

# ==================== 构建后端 ====================
echo ""
echo "=== 构建后端 ==="
cd "$APP_DIR"

echo "下载 Go 依赖..."
go mod download

echo "编译后端..."
CGO_ENABLED=0 go build -ldflags="-s -w" -o "$DIST_DIR/server" ./cmd/server
echo "✓ 后端构建完成 -> dist/server"

# ==================== 复制配置 ====================
echo ""
echo "=== 复制配置 ==="
if [ -f "$DIST_DIR/config/config.yaml" ]; then
    echo "✓ 配置文件已存在，跳过 (dist/config/config.yaml)"
elif [ -f "$APP_DIR/config/config.yaml" ]; then
    cp "$APP_DIR/config/config.yaml" "$DIST_DIR/config/"
    echo "✓ 配置文件 -> dist/config/config.yaml"
else
    echo "警告: config/config.yaml 不存在，请手动创建 dist/config/config.yaml"
fi

# ==================== 完成 ====================
echo ""
echo "=== 构建完成 ==="
echo ""
echo "目录结构:"
echo "  dist/"
echo "  ├── server              # 后端二进制"
echo "  ├── config/"
echo "  │   └── config.yaml     # 配置文件"
echo "  ├── frontend/"
echo "  │   └── dist/           # 前端产物（配置 nginx 指向这里）"
echo "  ├── uploads/            # 上传文件"
echo "  ├── thumbnails/         # 缩略图"
echo "  ├── images/             # 图片"
echo "  └── logs/               # 日志"
echo ""
echo "部署步骤:"
echo "  1. 将 dist/ 目录复制到服务器"
echo "  2. 编辑 dist/config/config.yaml 配置数据库"
echo "  3. 配置 nginx 指向 dist/frontend/dist"
echo "  4. 运行 ./dist/run.sh 启动后端"
