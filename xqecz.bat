@echo off
setlocal

set REMOTE=http://8.134.190.23:9300
set API_KEY=vqtDMIEprDUvY9I-DhG7_J3ITPNyguzeuTjqjNQB8N0
set PANEL_DIR=%~dp0xqecz-panel

if "%1"=="" goto help

if "%1"=="deploy" goto deploy
if "%1"=="build" goto build
if "%1"=="restart" goto restart
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="status" goto status
if "%1"=="logs" goto logs
if "%1"=="server" goto server
goto help

:deploy
echo 正在部署...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% deploy
goto end

:build
echo 正在构建...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% build
goto end

:restart
echo 正在重启...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% restart
goto end

:start
echo 正在启动...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% start
goto end

:stop
echo 正在停止...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% stop
goto end

:status
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% status
goto end

:logs
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% logs %2
goto end

:server
echo 启动 API 服务器...
python "%PANEL_DIR%\server.py"
goto end

:help
echo xqecz-all 部署管理工具
echo.
echo 用法: xqecz.bat [命令]
echo.
echo 命令:
echo   deploy    一键部署
echo   build     仅构建
echo   restart   重启服务
echo   start     启动服务
echo   stop      停止服务
echo   status    查看状态
echo   logs      查看日志 (可加行数: logs 50)
echo   server    启动 API 服务器
echo.
echo 示例:
echo   xqecz.bat deploy
echo   xqecz.bat logs 200
goto end

:end
endlocal
