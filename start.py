"""
GenHealth 2.0 - Unified Process Runner

Runs FastAPI Backend and Vite Frontend concurrently with hot reload:
    python start.py

Optionally launch with the standalone ML Model Testing Playground:
    python start.py --playground
"""

import os
import sys
import time
import signal
import argparse
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
    parser = argparse.ArgumentParser(description="GenHealth 2.0 Unified Launcher")
    parser.add_argument(
        "--playground",
        action="store_true",
        help="Also launch the isolated Hereditary ML Model Testing Playground on http://127.0.0.1:8001",
    )
    args = parser.parse_args()

    print("=" * 65)
    print("       GenHealth 2.0 - Starting Full Stack Environment")
    print("=" * 65)

    python_bin = find_python()
    print(f"[*] Using Python: {python_bin}")
    print(f"[*] Root Directory: {ROOT_DIR}")

    # Set PYTHONPATH to backend directory for clean module imports
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_DIR)

    procs = []

    # 1. Launch FastAPI Backend with hot reload
    print("\n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(BACKEND_DIR),
        env=env,
    )
    procs.append(("FastAPI Backend", backend_proc))

    # 2. Launch Standalone ML Playground (if requested)
    playground_proc = None
    if args.playground:
        print("[*] Starting Hereditary ML Model Testing Playground on http://127.0.0.1:8001 ...")
        playground_proc = subprocess.Popen(
            [python_bin, "-m", "hereditary_risk.model_test_server.app"],
            cwd=str(BACKEND_DIR),
            env=env,
        )
        procs.append(("ML Playground", playground_proc))

    # 3. Launch Frontend with Vite Hot Module Replacement (HMR)
    print("[2/3] Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=str(FRONTEND_DIR),
        env=env,
    )
    procs.append(("Vite Frontend", frontend_proc))

    # 4. Open Browser
    print("[3/3] Opening browser at http://localhost:5173 ...")
    time.sleep(2.5)
    webbrowser.open("http://localhost:5173")

    print("\n" + "=" * 65)
    print(" GenHealth 2.0 is RUNNING!")
    print(" Active Services:")
    print(" - Backend API:     http://127.0.0.1:8000 (Docs: /docs)")
    print(" - Frontend App:    http://localhost:5173")
    if args.playground:
        print(" - ML Playground:   http://127.0.0.1:8001")
    print(" Hot-Reload is active. Any code edits will auto-reload.")
    print(" Press Ctrl+C in this window to stop all servers.")
    print("=" * 65 + "\n")

    def handle_exit(signum=None, frame=None):
        print("\nShutting down GenHealth servers...")
        for name, proc in procs:
            try:
                if os.name == "nt":
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    proc.terminate()
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
