@echo off
setlocal

set REMOTE=http://8.134.190.23:9300
set API_KEY=vqtDMIEprDUvY9I-DhG7_J3ITPNyguzeuTjqjNQB8N0
set PANEL_DIR=%~dp0xqecz-panel

:menu
cls
echo ========================================
echo     xqecz-all Deploy Panel
echo ========================================
echo.
echo   1. Deploy
echo   2. Build
echo   3. Restart
echo   4. Start
echo   5. Stop
echo   6. Status
echo   7. Logs
echo   8. Start API Server
echo   0. Exit
echo.
echo ========================================
set /p choice=Select [0-8]:

if "%choice%"=="1" goto deploy
if "%choice%"=="2" goto build
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto start
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto status
if "%choice%"=="7" goto logs
if "%choice%"=="8" goto server
if "%choice%"=="0" goto exit
echo Invalid choice
timeout /t 2 >nul
goto menu

:deploy
cls
echo Deploying...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% deploy
echo.
pause
goto menu

:build
cls
echo Building...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% build
echo.
pause
goto menu

:restart
cls
echo Restarting...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% restart
echo.
pause
goto menu

:start
cls
echo Starting...
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% start
echo.
pause
goto menu

:stop
cls
echo Stopping...
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
set /p lines=Lines (default 100):
if "%lines%"=="" set lines=100
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% logs %lines%
echo.
pause
goto menu

:server
cls
echo Starting API Server...
python "%PANEL_DIR%\server.py"
pause
goto menu

:exit
exit
