@echo off
REM xqecz-all 无 Docker 启动脚本 (Windows)
REM 用法: start.bat

echo === xqecz-all 启动脚本 ===

REM 检查 Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: Go 未安装
    echo 安装: https://go.dev/dl/
    pause
    exit /b 1
)
echo ✓ Go 已安装

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装
    echo 安装: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js 已安装

REM 构建前端
echo.
echo === 构建前端 ===
cd frontend
if not exist node_modules (
    echo 安装前端依赖...
    call npm install
)
echo 构建前端...
call npm run build
cd ..
echo ✓ 前端构建完成

REM 构建后端
echo.
echo === 构建后端 ===
echo 下载 Go 依赖...
go mod download
echo 编译后端...
set CGO_ENABLED=0
go build -ldflags="-s -w" -o server.exe ./cmd/server
echo ✓ 后端构建完成

REM 创建目录
if not exist uploads mkdir uploads
if not exist thumbnails mkdir thumbnails
if not exist images mkdir images

REM 启动服务
echo.
echo === 启动服务 ===
echo 访问: http://localhost:8080
echo 按 Ctrl+C 停止
echo.
server.exe
