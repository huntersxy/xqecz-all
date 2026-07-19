@echo off
REM xqecz-all 快速启动脚本

echo ========================================
echo xqecz-all 开发环境初始化
echo ========================================

REM 检查Go是否安装
go version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Go，请先安装Go 1.22+
    echo 下载地址: https://go.dev/dl/
    pause
    exit /b 1
)

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Node.js，请先安装Node.js 22+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查Docker是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [警告] 未找到Docker，将无法使用Docker部署
    echo 下载地址: https://www.docker.com/products/docker-desktop
)

echo.
echo [步骤1] 安装Go依赖...
go mod tidy
if errorlevel 1 (
    echo [错误] Go依赖安装失败
    pause
    exit /b 1
)

echo.
echo [步骤2] 检查配置文件...
if not exist "config\config.yaml" (
    echo 创建配置文件...
    copy config\config.example.yaml config\config.yaml
    echo [提示] 请编辑 config\config.yaml 配置数据库连接
)

echo.
echo [步骤3] 启动基础设施 (MySQL + Redis)...
docker compose --profile dev up -d mysql redis
if errorlevel 1 (
    echo [警告] Docker启动失败，请手动启动MySQL和Redis
)

echo.
echo [步骤4] 等待数据库就绪...
timeout /t 10 /nobreak >nul

echo.
echo [步骤5] 启动后端服务器...
start "xqecz-backend" cmd /k "go run ./cmd/server/"

echo.
echo [步骤6] 启动前端开发服务器...
cd frontend
start "xqecz-frontend" cmd /k "npm install && npm run dev"
cd ..

echo.
echo ========================================
echo 启动完成！
echo ========================================
echo.
echo 后端API: http://localhost:8080
echo 前端界面: http://localhost:5173
echo.
echo 按任意键退出...
pause >nul
