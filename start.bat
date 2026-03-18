@echo off
title Solus City Launcher
echo ============================================
echo           SOLUS CITY - Launcher
echo ============================================
echo.

:: ---- Resolve the folder this .bat lives in ----
set "ROOT=%~dp0"

:: ---- 1. Install server dependencies ----
echo [1/7] Installing server dependencies...
cd /d "%ROOT%solus-city-server"
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Server npm install failed.
    pause
    exit /b 1
)
echo.

:: ---- 2. Run database migrations ----
echo [2/7] Running database migrations...
call npx prisma migrate deploy
if %ERRORLEVEL% neq 0 (
    echo ERROR: Database migration failed. Is PostgreSQL running?
    echo        Check your .env file and make sure the soluscity database exists.
    pause
    exit /b 1
)
echo.

:: ---- 3. Seed the database ----
echo [3/7] Seeding database...
call npm run db:seed
echo.

:: ---- 4. Start the server in a new window ----
echo [4/7] Starting server...
start "Solus City Server" cmd /k "cd /d "%ROOT%solus-city-server" && npm run dev"
echo       Server starting in a new window. Waiting 5 seconds...
timeout /t 5 /nobreak >nul
echo.

:: ---- 5. Install mobile app dependencies ----
echo [5/7] Installing mobile app dependencies...
cd /d "%ROOT%soluscitymobile"
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Mobile npm install failed.
    pause
    exit /b 1
)
echo.

:: ---- 6. Set up ADB reverse port forwarding ----
echo [6/7] Setting up ADB reverse port forwarding...
adb reverse tcp:3000 tcp:3000
if %ERRORLEVEL% neq 0 (
    echo WARNING: adb reverse failed. Make sure your emulator is running.
    echo          Start the emulator in Android Studio, then re-run this script.
    pause
    exit /b 1
)
echo.

:: ---- 7. Build and launch the Android app ----
echo [7/7] Building and launching Android app...
echo       This will take a few minutes on the first run.
echo.
start "Solus City Metro" cmd /k "cd /d "%ROOT%soluscitymobile" && npx react-native run-android"

echo.
echo ============================================
echo   Solus City is starting!
echo.
echo   - Server window:  "Solus City Server"
echo   - App build:      "Solus City Metro"
echo   - This window can be closed.
echo ============================================
echo.
pause
