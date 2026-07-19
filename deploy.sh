#!/bin/bash
# xqecz-all 一键部署脚本
# 用法: ./deploy.sh

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SERVICE_NAME="xqecz"

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

# 2. 安装 systemd 服务（首次）
if [ ! -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    echo ""
    echo "=== 安装 systemd 服务 ==="
    cp xqecz.service /etc/systemd/system/${SERVICE_NAME}.service
    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME}
    echo "✓ 服务已安装并启用"
fi

# 3. 构建前端
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

# 4. 构建后端
echo ""
echo "=== 3. 构建后端 ==="
go mod download
CGO_ENABLED=0 go build -ldflags="-s -w" -o dist/server ./cmd/server
echo "✓ 后端构建完成"

# 5. 复制前端产物
mkdir -p dist/frontend
rm -rf dist/frontend/dist
cp -r frontend/dist dist/frontend/

# 6. 重启服务
echo ""
echo "=== 4. 重启服务 ==="
systemctl restart ${SERVICE_NAME}
sleep 2

if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✓ 服务已启动"
else
    echo "✗ 服务启动失败"
    journalctl -u ${SERVICE_NAME} --no-pager -n 20
    exit 1
fi

echo ""
echo "=== 部署完成 ==="
echo ""
echo "常用命令："
echo "  systemctl status xqecz    # 查看状态"
echo "  systemctl restart xqecz   # 重启服务"
echo "  journalctl -u xqecz -f    # 查看日志"
