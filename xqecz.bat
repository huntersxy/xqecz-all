@echo off
setlocal

set REMOTE=http://8.134.190.23:9300
set API_KEY=vqtDMIEprDUvY9I-DhG7_J3ITPNyguzeuTjqjNQB8N0
set PANEL_DIR=%~dp0xqecz-panel

:menu
cls
echo ========================================
echo     xqecz-all 部署管理面板
echo ========================================
echo.
echo   1. 一键部署
echo   2. 仅构建
echo   3. 重启服务
echo   4. 启动服务
echo   5. 停止服务
echo   6. 查看状态
echo   7. 查看日志
echo   8. 启动 API 服务器
echo   0. 退出
echo.
echo ========================================
set /p choice=请选择操作 [0-8]:

if "%choice%"=="1" goto deploy
if "%choice%"=="2" goto build
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto start
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto status
if "%choice%"=="7" goto logs
if "%choice%"=="8" goto server
if "%choice%"=="0" goto exit
echo 无效选择，请重试
timeout /t 2 >nul
goto menu

:deploy
cls
echo 正在部署...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% deploy
echo.
pause
goto menu

:build
cls
echo 正在构建...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% build
echo.
pause
goto menu

:restart
cls
echo 正在重启...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% restart
echo.
pause
goto menu

:start
cls
echo 正在启动...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% start
echo.
pause
goto menu

:stop
cls
echo 正在停止...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% stop
echo.
pause
goto menu

:status
cls
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% status
echo.
pause
goto menu

:logs
cls
set /p lines=显示行数 (默认100):
if "%lines%"=="" set lines=100
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% logs %lines%
echo.
pause
goto menu

:server
cls
echo 启动 API 服务器...
python "%PANEL_DIR%\server.py"
pause
goto menu

:exit
exit
