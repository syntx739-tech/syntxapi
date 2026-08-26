@echo off
title ARCTIC Server Manager
color 0B
echo.
echo  ============================================
echo          ARCTIC SERVER MANAGER
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%~dp0"

:: Kill everything on our ports first
echo  [1/5] Cleaning up...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8082 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4040 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo         Done.
echo.

:: Start API Server (background, no window)
echo  [2/5] Starting API on port 5000...
start "ARCTIC-API" /min node server/api-server.mjs
timeout /t 3 /nobreak >nul
curl -s http://127.0.0.1:5000/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         API is running.
) else (
    echo         [WARNING] API might not have started.
)
echo.

:: Start Admin Website (port 8081)
echo  [3/5] Starting Admin Website on port 8081...
start "ARCTIC-Admin" cmd /k "title ARCTIC Admin - Port 8081 && npx vite --host 127.0.0.1 --port 8081"
timeout /t 4 /nobreak >nul
echo         Admin: http://127.0.0.1:8081
echo.

:: Start Staff Website (port 8082)
echo  [4/5] Starting Staff Website on port 8082...
start "ARCTIC-Staff" cmd /k "title ARCTIC Staff - Port 8082 && npx vite --config vite.staff.config.ts --host 127.0.0.1 --port 8082"
timeout /t 4 /nobreak >nul
echo         Staff: http://127.0.0.1:8082
echo.

:: Start ngrok (optional)
echo  [5/5] Starting ngrok tunnel...
where ngrok >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "ARCTIC-ngrok" /min ngrok http 5000
    timeout /t 5 /nobreak >nul
    echo         ngrok: http://127.0.0.1:4040
) else (
    echo         ngrok not found - skipped.
)
echo.

:: Final summary
echo  ============================================
echo            ALL SERVICES RUNNING
echo  ============================================
echo.
echo   Admin Keypanel:  http://127.0.0.1:8081
echo   Staff Website:   http://127.0.0.1:8082
echo   API Server:      http://127.0.0.1:5000
echo   ngrok Inspector: http://127.0.0.1:4040
echo.
echo   Admin Login:     user42 / K8#mP2$vL9@xR5!w
echo   Staff Login:     teststaff / staff123
echo.
echo  ============================================
echo   Press any key to STOP all services...
echo  ============================================
pause >nul

:: Stop everything
echo.
echo  Stopping all services...

:: Kill API
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: Kill Admin
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: Kill Staff
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8082 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: Kill ngrok
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4040 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: Kill by window title as backup
taskkill /FI "WindowTitle eq ARCTIC-API" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq ARCTIC-Admin" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq ARCTIC-Staff" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq ARCTIC-ngrok" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq ARCTIC Admin - Port 8081" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq ARCTIC Staff - Port 8082" /T /F >nul 2>&1

echo  All services stopped.
timeout /t 2 /nobreak >nul
