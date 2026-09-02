"""
GenHealth 2.0 - Unified Process Runner

Runs FastAPI Backend, Vite Frontend, and Local Ollama (Qwen2.5-VL) concurrently with hot reload:
    python start.py

Optionally launch with the standalone ML Model Testing Playground:
    python start.py --playground

Optionally skip Ollama / Qwen auto-start:
    python start.py --no-qwen
"""

import os
import sys
import time
import json
import signal
import shutil
import argparse
import subprocess
import webbrowser
import urllib.request
import urllib.error
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


def get_default_ollama_config():
    """Reads OLLAMA_BASE_URL and OLLAMA_MODEL from backend config or environment if available."""
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = os.environ.get("OLLAMA_MODEL", "qwen2.5vl:7b")
    env_file = ROOT_DIR / ".env"
    if not env_file.exists():
        env_file = BACKEND_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip('"').strip("'")
                    if k == "OLLAMA_BASE_URL":
                        base_url = v
                    elif k == "OLLAMA_MODEL":
                        model_name = v
        except Exception:
            pass
    return base_url, model_name


def check_ollama_status(base_url: str):
    """Checks if Ollama server is reachable and returns the list of loaded model tags."""
    try:
        req = urllib.request.Request(
            f"{base_url.rstrip('/')}/api/tags",
            headers={"User-Agent": "GenHealth-Launcher"},
        )
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name", "") for m in data.get("models", [])]
            return True, models
    except Exception:
        return False, []


def ensure_ollama_and_qwen(base_url: str, model_name: str, procs: list):
    """
    Ensures Ollama server is running and verifies Qwen model availability.
    If Ollama is not running, attempts to start `ollama serve`.
    """
    print(f"\n[1/4] Checking Ollama & Qwen Vision AI ({model_name})...")
    is_running, models = check_ollama_status(base_url)

    if not is_running:
        ollama_bin = shutil.which("ollama")
        if not ollama_bin:
            print(f"  [!] Ollama executable not found in PATH.")
            print(f"      To use local Qwen-VL extraction, install Ollama from https://ollama.ai")
            return "Not Installed / Offline"

        print(f"  [*] Starting Ollama daemon (`ollama serve`) in background...")
        try:
            ollama_proc = subprocess.Popen(
                [ollama_bin, "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            procs.append(("Ollama (Qwen-VL)", ollama_proc))

            # Poll for readiness up to 8 seconds
            for _ in range(16):
                time.sleep(0.5)
                is_running, models = check_ollama_status(base_url)
                if is_running:
                    break
        except Exception as err:
            print(f"  [!] Failed to spawn Ollama process: {err}")
            return "Failed to start"

    if is_running:
        # Check if the requested model (or model without tag) is in Ollama
        has_model = any(
            model_name in m or m.startswith(model_name.split(":")[0]) for m in models
        )
        if has_model:
            print(f"  [+] Ollama is active at {base_url}")
            print(f"  [+] Qwen model '{model_name}' is ready.")
            return f"Active ({model_name})"
        else:
            print(f"  [+] Ollama is active at {base_url}")
            print(f"  [!] Model '{model_name}' is not downloaded yet.")
            print(f"      Run: `ollama pull {model_name}` to enable local document extraction.")
            return f"Active (Model '{model_name}' not pulled)"
    else:
        print(f"  [!] Could not connect to Ollama at {base_url}. Continuing with cloud fallback (Gemini)...")
        return "Offline (Fallback to Gemini)"


def main():
    default_url, default_model = get_default_ollama_config()

    parser = argparse.ArgumentParser(description="GenHealth 2.0 Unified Launcher")
    parser.add_argument(
        "--playground",
        action="store_true",
        help="Also launch the isolated Hereditary ML Model Testing Playground on http://127.0.0.1:8001",
    )
    parser.add_argument(
        "--no-qwen",
        "--no-ollama",
        action="store_true",
        dest="no_qwen",
        help="Skip starting/checking Ollama and Qwen Vision AI",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=default_model,
        help=f"Ollama model name for local vision extraction (default: {default_model})",
    )
    parser.add_argument(
        "--ollama-url",
        type=str,
        default=default_url,
        help=f"Ollama base URL (default: {default_url})",
    )
    args = parser.parse_args()

    print("=" * 65)
    print("       GenHealth 2.0 - Starting Full Stack Environment")
    print("=" * 65)

    python_bin = find_python()
    print(f"[*] Using Python:    {python_bin}")
    print(f"[*] Root Directory:  {ROOT_DIR}")

    # Set PYTHONPATH to backend directory for clean module imports
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_DIR)

    procs = []

    # 1. Start / Verify Ollama & Qwen
    qwen_status = "Skipped (--no-qwen)"
    if not args.no_qwen:
        qwen_status = ensure_ollama_and_qwen(args.ollama_url, args.model, procs)

    # 2. Launch FastAPI Backend with hot reload
    print("\n[2/4] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [python_bin, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(BACKEND_DIR),
        env=env,
    )
    procs.append(("FastAPI Backend", backend_proc))

    # 3. Launch Standalone ML Playground (if requested)
    if args.playground:
        print("[*] Starting Hereditary ML Model Testing Playground on http://127.0.0.1:8001 ...")
        playground_proc = subprocess.Popen(
            [python_bin, "-m", "hereditary_risk.model_test_server.app"],
            cwd=str(BACKEND_DIR),
            env=env,
        )
        procs.append(("ML Playground", playground_proc))

    # 4. Launch Frontend with Vite Hot Module Replacement (HMR)
    print("\n[3/4] Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=str(FRONTEND_DIR),
        env=env,
    )
    procs.append(("Vite Frontend", frontend_proc))

    # 5. Open Browser
    print("\n[4/4] Opening browser at http://localhost:5173 ...")
    time.sleep(2.5)
    webbrowser.open("http://localhost:5173")

    print("\n" + "=" * 65)
    print(" GenHealth 2.0 is RUNNING!")
    print(" Active Services:")
    print(" - Backend API:       http://127.0.0.1:8000 (Docs: /docs)")
    print(" - Frontend App:      http://localhost:5173")
    print(f" - Vision AI (Qwen):  {args.ollama_url} [{qwen_status}]")
    if args.playground:
        print(" - ML Playground:     http://127.0.0.1:8001")
    print(" Hot-Reload is active. Any code edits will auto-reload.")
    print(" Press Ctrl+C in this window to stop all servers.")
    print("=" * 65 + "\n")

    def handle_exit(signum=None, frame=None):
        print("\nShutting down GenHealth servers...")
        for name, proc in procs:
            try:
                if os.name == "nt":
                    subprocess.call(
                        ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
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

