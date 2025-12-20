@echo off
TITLE DocLink Launcher
echo ===================================================
echo           DocLink Web App Launcher
echo ===================================================
echo.

:: 1. Start Backend
echo [1/2] Launching Backend Server...
:: We use /k to keep the window open so you can see logs
start "DocLink Backend (Port 8080)" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8080"

:: 2. Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: 3. Start Frontend
echo [2/2] Launching Frontend Server...
start "DocLink Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo           Services started!
echo ===================================================
echo Backend API: http://localhost:8080
echo Frontend UI: http://localhost:5173
echo.
echo You can close this launcher window now, 
echo but keep the other two command windows open.
echo.
pause
