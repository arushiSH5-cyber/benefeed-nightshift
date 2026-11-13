"""Tells the server the runner and phone are online (outbound HTTPS only). Run: uv run python -m runner.heartbeat"""
import os, time
import httpx
from .phoneuse import PhoneUse

SERVER = os.environ.get("BENEFEED_SERVER", "http://127.0.0.1:8090")
H = {"X-Runner-Secret": os.environ["RUNNER_SECRET"]}
while True:
    try:
        ok = any(d.get("online") and d.get("automation") == "ready" for d in PhoneUse().devices())
    except Exception:
        ok = False
    try:
        httpx.post(f"{SERVER}/api/runner/heartbeat", headers=H, json={"phone_online": ok, "device": "iPhone"}, timeout=10)
    except Exception as e:
        print("server unreachable:", e)
    time.sleep(8)
