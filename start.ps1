# GenHealth 2.0 - One-Click PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GenHealth 2.0 - One-Click Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootPath

# 1. Start Backend in separate window
Write-Host "[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
$BackendCmd = "cd '$RootPath\backend'; if (Test-Path '..\.venv\Scripts\Activate.ps1') { . ..\.venv\Scripts\Activate.ps1 }; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd

# 2. Start Frontend in separate window
Write-Host "[2/3] Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
$FrontendCmd = "cd '$RootPath\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd

# 3. Wait and open browser
Write-Host "[3/3] Opening browser at http://localhost:5173 ..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "`nAll services are up and running!" -ForegroundColor Cyan
