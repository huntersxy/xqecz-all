#!/bin/bash
# xqecz-all 一键部署脚本（宝塔版）
# 用法: ./deploy.sh

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PID_FILE="$SCRIPT_DIR/dist/logs/server.pid"
LOG_FILE="$SCRIPT_DIR/dist/logs/server.log"

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

# 5. 停止旧服务
echo ""
echo "=== 4. 重启服务 ==="
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null
        sleep 2
        kill -9 "$OLD_PID" 2>/dev/null
    fi
    rm -f "$PID_FILE"
fi

# 6. 启动新服务（带自重启）
nohup bash -c '
while true; do
    ./server 2>&1
    echo "[$(date)] 服务异常退出，3秒后重启..." >> logs/server.log
    sleep 3
done
' >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✓ 服务已启动 (PID: $(cat "$PID_FILE"))"
else
    echo "✗ 服务启动失败"
    tail -20 "$LOG_FILE"
    exit 1
fi

echo ""
echo "=== 部署完成 ==="
echo ""
echo "常用命令："
echo "  tail -f dist/logs/server.log  # 查看日志"
echo "  kill \$(cat dist/logs/server.pid)  # 停止服务"
