@echo off
REM Helper script to start the Super Admin Portal Backend

echo.
echo ========================================
echo   Super Admin Portal - Backend Server
echo ========================================
echo.

REM Check if port 5000 is in use
echo [1/3] Checking port 5000...
netstat -ano | findstr :5000 | findstr LISTENING > nul
if %errorlevel% equ 0 (
    echo WARNING: Port 5000 is already in use!
    echo.
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
        echo Killing process on port 5000 (PID: %%a)...
        taskkill /F /PID %%a > nul 2>&1
    )
    timeout /t 2 /nobreak > nul
    echo Port 5000 is now available.
) else (
    echo Port 5000 is available.
)

echo.
echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed.
)

echo.
echo [3/3] Starting server...
echo.
echo ========================================
echo   Server starting in development mode
echo   Press Ctrl+C to stop
echo ========================================
echo.

call npm run dev
