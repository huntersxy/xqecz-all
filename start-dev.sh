#!/bin/bash
# xqecz-all 快速启动脚本

set -e

echo "========================================"
echo "xqecz-all 开发环境初始化"
echo "========================================"

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "[错误] 未找到Go，请先安装Go 1.22+"
    echo "下载地址: https://go.dev/dl/"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到Node.js，请先安装Node.js 22+"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "[警告] 未找到Docker，将无法使用Docker部署"
    echo "下载地址: https://www.docker.com/products/docker-desktop"
fi

echo ""
echo "[步骤1] 安装Go依赖..."
go mod tidy

echo ""
echo "[步骤2] 检查配置文件..."
if [ ! -f "config/config.yaml" ]; then
    echo "创建配置文件..."
    cp config/config.example.yaml config/config.yaml
    echo "[提示] 请编辑 config/config.yaml 配置数据库连接"
fi

echo ""
echo "[步骤3] 启动基础设施 (MySQL + Redis)..."
if command -v docker &> /dev/null; then
    docker compose --profile dev up -d mysql redis
    echo "等待数据库就绪..."
    sleep 10
else
    echo "[警告] Docker未安装，请手动启动MySQL和Redis"
fi

echo ""
echo "[步骤4] 启动后端服务器..."
go run ./cmd/server/ &
BACKEND_PID=$!

echo ""
echo "[步骤5] 启动前端开发服务器..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "启动完成！"
echo "========================================"
echo ""
echo "后端API: http://localhost:8080"
echo "前端界面: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
