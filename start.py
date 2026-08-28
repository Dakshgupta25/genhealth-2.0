"""
GenHealth 2.0 - Unified Process Runner
Runs both FastAPI Backend and Vite Frontend concurrently with hot reload:
    python start.py
"""

import os
import sys
import time
import signal
import subprocess
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def find_python():
    venv_py = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    if venv_py.exists():
        return str(venv_py)
    venv_py_unix = ROOT_DIR / ".venv" / "bin" / "python"
    if venv_py_unix.exists():
        return str(venv_py_unix)
    return sys.executable

def main():
    print("=" * 60)
    print("       GenHealth 2.0 - Starting Full Stack Environment")
    print("=" * 60)
    
    python_bin = find_python()
    print(f"[*] Using Python: {python_bin}")
    print(f"[*] Root Directory: {ROOT_DIR}")

    # Launch Backend with hot reload
    print("\n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(BACKEND_DIR),
    )

    # Launch Frontend with Vite Hot Module Replacement (HMR)
    print("[2/3] Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=str(FRONTEND_DIR),
    )

    # Open Browser
    print("[3/3] Opening browser at http://localhost:5173 ...")
    time.sleep(2.5)
    webbrowser.open("http://localhost:5173")

    print("\n" + "=" * 60)
    print(" GenHealth 2.0 is RUNNING!")
    print(" Both servers have Hot-Reload active:")
    print(" - Backend API:  http://127.0.0.1:8000 (Docs: /docs)")
    print(" - Frontend App: http://localhost:5173")
    print(" Any code edits will auto-reload without restarting.")
    print(" Press Ctrl+C in this window to stop both servers.")
    print("=" * 60 + "\n")

    def handle_exit(signum=None, frame=None):
        print("\nShutting down GenHealth servers...")
        try:
            if os.name == "nt":
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)])
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)])
            else:
                backend_proc.terminate()
                frontend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, handle_exit)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        handle_exit()

if __name__ == "__main__":
    main()
