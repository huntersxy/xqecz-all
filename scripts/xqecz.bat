@echo off
chcp 65001 >nul
setlocal

set REMOTE=http://8.134.190.23:9300
set API_KEY=vqtDMIEprDUvY9I-DhG7_J3ITPNyguzeuTjqjNQB8N0
set PANEL_DIR=%~dp0scripts\panel

:menu
cls
echo ========================================
echo     xqecz-all Deploy Panel
echo ========================================
echo.
echo   1. Deploy (git pull + build + restart)
echo   2. Build Only
echo   3. Restart Service
echo   4. Start Service
echo   5. Stop Service
echo   6. Check Status
echo   7. View Logs
echo   0. Exit
echo.
echo ========================================
set /p choice=Select [0-7]:

if "%choice%"=="1" goto deploy
if "%choice%"=="2" goto build
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto start
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto status
if "%choice%"=="7" goto logs
if "%choice%"=="0" goto exit
echo Invalid choice
timeout /t 2 >nul
goto menu

:deploy
cls
echo [Deploy] Starting deployment...
echo.
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% deploy
echo.
echo ----------------------------------------
if %errorlevel%==0 (
    echo [SUCCESS] Deploy completed!
) else (
    echo [FAILED] Deploy failed, check errors above
)
echo ----------------------------------------
echo.
pause
goto menu

:build
cls
echo [Build] Building project...
echo.
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% build
echo.
echo ----------------------------------------
if %errorlevel%==0 (
    echo [SUCCESS] Build completed!
) else (
    echo [FAILED] Build failed, check errors above
)
echo ----------------------------------------
echo.
pause
goto menu

:restart
cls
echo [Restart] Restarting service...
echo.
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% restart
echo.
echo ----------------------------------------
if %errorlevel%==0 (
    echo [SUCCESS] Service restarted!
) else (
    echo [FAILED] Restart failed
)
echo ----------------------------------------
echo.
pause
goto menu

:start
cls
echo [Start] Starting service...
echo.
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% start
echo.
echo ----------------------------------------
if %errorlevel%==0 (
    echo [SUCCESS] Service started!
) else (
    echo [FAILED] Start failed
)
echo ----------------------------------------
echo.
pause
goto menu

:stop
cls
echo [Stop] Stopping service...
echo.
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% stop
echo.
echo ----------------------------------------
if %errorlevel%==0 (
    echo [SUCCESS] Service stopped!
) else (
    echo [FAILED] Stop failed
)
echo ----------------------------------------
echo.
pause
goto menu

:status
cls
echo [Status] Checking service status...
echo.
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% status
echo.
pause
goto menu

:logs
cls
set /p lines=Lines to show (default 50):
if "%lines%"=="" set lines=50
echo [Logs] Last %lines% lines:
echo ----------------------------------------
python "%PANEL_DIR%\client.py" -r %REMOTE% -k %API_KEY% logs %lines%
echo ----------------------------------------
echo.
pause
goto menu

:exit
exit
