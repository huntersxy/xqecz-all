#!/bin/bash
# xqecz-all 一键部署脚本
# 用法: ./deploy.sh

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

echo "=== xqecz-all 一键部署 ==="

# 加载环境变量
source /etc/profile 2>/dev/null || true
source ~/.bashrc 2>/dev/null || true
source ~/.nvm/nvm.sh 2>/dev/null || true
export HOME=${HOME:-/root}
export GOPATH=$HOME/go
export GOMODCACHE=$GOPATH/pkg/mod
export GOCACHE=$HOME/.cache/go-build
export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin:/usr/local/bin:/usr/local/node/bin:$HOME/.nvm/versions/node/*/bin

cd "$SCRIPT_DIR"

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
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi
echo "构建前端..."
npm run build
cd ..
echo "✓ 前端构建完成"

# 3. 构建后端
echo ""
echo "=== 3. 构建后端 ==="
go mod download
CGO_ENABLED=0 go build -ldflags="-s -w" -o dist/server ./cmd/server
echo "✓ 后端构建完成"

# 4. 复制前端产物
mkdir -p dist/frontend dist/logs
rm -rf dist/frontend/dist
cp -r frontend/dist dist/frontend/

# 5. 发送重启信号
echo ""
echo "=== 4. 重启服务 ==="
cd dist

if [ -f "logs/server.pid" ]; then
    PID=$(cat logs/server.pid)
    if kill -0 "$PID" 2>/dev/null; then
        echo "发送重启信号给 PID: $PID"
        kill -USR1 "$PID"
        sleep 2
        if kill -0 "$PID" 2>/dev/null; then
            echo "✓ 服务已重启"
        else
            echo "服务正在重启..."
        fi
    else
        echo "服务未运行，启动新服务"
        nohup ./server >> logs/server.log 2>&1 &
        echo $! > logs/server.pid
    fi
else
    echo "启动新服务"
    nohup ./server >> logs/server.log 2>&1 &
    echo $! > logs/server.pid
fi

cd ..
echo ""
echo "=== 部署完成 ==="
echo "查看日志: tail -f dist/logs/server.log"
