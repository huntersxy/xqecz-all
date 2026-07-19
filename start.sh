#!/bin/bash
# xqecz-all 无 Docker 启动脚本
# 用法: ./start.sh [dev|prod]

# 加载环境变量
source /etc/profile 2>/dev/null || true
source ~/.bashrc 2>/dev/null || true
source ~/.nvm/nvm.sh 2>/dev/null || true
export HOME=${HOME:-/root}
export GOPATH=$HOME/go
export GOMODCACHE=$GOPATH/pkg/mod
export GOCACHE=$HOME/.cache/go-build
export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin:/usr/local/bin:/usr/local/node/bin:$HOME/.nvm/versions/node/*/bin

set -e

MODE=${1:-prod}
APP_DIR=$(cd "$(dirname "$0")" && pwd)

echo "=== xqecz-all 启动脚本 (${MODE}模式) ==="

# 检查依赖
check_deps() {
    echo "检查依赖..."

    # Go
    if ! command -v go &> /dev/null; then
        echo "错误: Go 未安装"
        echo "安装: https://go.dev/dl/"
        exit 1
    fi
    echo "✓ Go $(go version | awk '{print $3}')"

    # Node.js
    if ! command -v node &> /dev/null; then
        echo "错误: Node.js 未安装"
        echo "安装: https://nodejs.org/"
        exit 1
    fi
    echo "✓ Node.js $(node -v)"

    # MySQL
    if ! command -v mysql &> /dev/null; then
        echo "警告: mysql 客户端未安装"
    else
        echo "✓ MySQL 客户端"
    fi

    # Redis
    if ! command -v redis-cli &> /dev/null; then
        echo "警告: redis-cli 未安装"
    else
        echo "✓ Redis 客户端"
    fi
}

# 构建前端
build_frontend() {
    echo ""
    echo "=== 构建前端 ==="
    cd "$APP_DIR/frontend"

    if [ ! -d "node_modules" ]; then
        echo "安装前端依赖..."
        npm install
    fi

    echo "构建前端..."
    npm run build

    echo "✓ 前端构建完成"
}

# 构建后端
build_backend() {
    echo ""
    echo "=== 构建后端 ==="
    cd "$APP_DIR"

    echo "下载 Go 依赖..."
    go mod download

    echo "编译后端..."
    CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server

    echo "✓ 后端构建完成"
}

# 启动服务
start_server() {
    echo ""
    echo "=== 启动服务 ==="
    cd "$APP_DIR"

    # 创建必要目录
    mkdir -p uploads thumbnails images

    CONFIG_FILE="config/config.yaml"

    if [ ! -f "$CONFIG_FILE" ]; then
        echo "错误: 配置文件不存在: $CONFIG_FILE"
        echo "请先创建配置文件"
        exit 1
    fi

    echo "使用配置: $CONFIG_FILE"
    echo "启动服务..."
    echo ""
    echo "=== 服务已启动 ==="
    echo "访问: http://localhost:8080"
    echo "按 Ctrl+C 停止"
    echo ""

    ./server
}

# 主流程
check_deps
build_frontend
build_backend
start_server
