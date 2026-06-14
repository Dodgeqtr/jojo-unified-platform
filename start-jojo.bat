@echo off
title Jojo Unified Platform Launcher
cd /d "%~dp0"

echo [1/4] Checking node_modules...
if not exist "node_modules" (
    echo [1/4] Installing packages...
    call npm install
) else (
    echo [1/4] Packages exist.
)

echo [2/4] Starting Operations API on port 3000...
start "Operations API" cmd /k "node_modules\.bin\tsx packages\api\operations-service\src\index.ts"

timeout /t 2 /nobreak >nul

echo [3/4] Starting CRM API on port 3001...
start "CRM API" cmd /k "node_modules\.bin\tsx packages\api\crm-service\src\index.ts"

timeout /t 2 /nobreak >nul

echo [4/4] Starting Frontend on port 5173...
start "Frontend" cmd /k "cd packages\web && ..\..\node_modules\.bin\vite"

echo Done! Services launched.
