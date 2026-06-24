#!/usr/bin/env python3
# ErrorLab watchdog — ensures python http.server stays up on :8734
import os, sys, subprocess, urllib.request, json, time

PORT = 8734
HEALTH = f"http://127.0.0.1:{PORT}/index.html"
ROOT = r"C:\Users\yaros\errorlab"

def healthy():
    try:
        req = urllib.request.urlopen(HEALTH, timeout=5)
        return req.status == 200
    except Exception:
        return False

if __name__ == "__main__":
    if healthy():
        sys.exit(0)
    # Restart
    flags = subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS if os.name == "nt" else 0
    subprocess.Popen(
        ["python", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=flags
    )
    for _ in range(10):
        time.sleep(1.5)
        if healthy():
            print("ErrorLab restarted")
            sys.exit(0)
    sys.exit(1)
