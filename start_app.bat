@echo off
echo ========================================================
echo       AI Corporate Publicity Generator Launcher
echo ========================================================

echo.
echo [1/3] Starting Python Backend API (Port 8000)...
start "Backend API (Python)" cmd /k "python -m uvicorn api.index:app --reload --port 8000"

echo.
echo [2/3] Starting Next.js Frontend (Port 3000)...
start "Frontend App (Next.js)" cmd /k "npm run dev"

echo.
echo [3/3] Waiting for services to initialize...
timeout /t 5 >nul

echo.
echo Opening application in default browser...
start http://localhost:3000

echo.
echo ========================================================
echo       Success! Application is running.
echo       Frontend: http://localhost:3000
echo       Backend:  http://localhost:8000
echo ========================================================
echo.
echo Press any key to close this launcher window (services will keep running)...
pause >nul
