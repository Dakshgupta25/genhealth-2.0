@echo off
title GenHealth 2.0 - Starting Services
echo ========================================================
echo        GenHealth 2.0 - One-Click Launcher
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking environment...
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    set "UVICORN_EXE=.venv\Scripts\uvicorn.exe"
) else (
    set "PYTHON_EXE=python"
    set "UVICORN_EXE=uvicorn"
)

echo [2/3] Launching FastAPI Backend (Port 8000)...
start "GenHealth Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && if exist "..\\.venv\\Scripts\\activate.bat" (call ..\\.venv\\Scripts\\activate.bat) && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Launching Vite Frontend (Port 5173)...
start "GenHealth Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo  All services started!
echo  Backend API:   http://127.0.0.1:8000 (Docs: /docs)
echo  Frontend App:  http://localhost:5173
echo ========================================================
echo.
echo Opening GenHealth App in default browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

exit
