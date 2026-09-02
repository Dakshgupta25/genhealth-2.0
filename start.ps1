# GenHealth 2.0 - One-Click PowerShell Launcher
$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootPath

$PythonExe = "python"
if (Test-Path "$RootPath\.venv\Scripts\python.exe") {
    $PythonExe = "$RootPath\.venv\Scripts\python.exe"
}

& $PythonExe "$RootPath\start.py" $args

