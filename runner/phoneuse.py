"""Thin client for PhoneUse Local (loopback only, Bearer key). Never point this at a public host."""
from __future__ import annotations
import os
from pathlib import Path
from urllib.parse import quote, urlparse
import httpx

DEFAULT_TOKEN = Path(__file__).resolve().parents[2] / "phoneuse" / "platform" / ".state" / "admin-token"


class PhoneUse:
    def __init__(self, base: str | None = None, key: str | None = None):
        self.base = base or os.environ.get("PHONEUSE_API_URL", "http://127.0.0.1:8765")
        if urlparse(self.base).hostname not in ("127.0.0.1", "localhost", "::1"):
            raise ValueError("PhoneUse must be loopback only")
        key = key or os.environ.get("PHONEUSE_API_KEY") or Path(os.environ.get("PHONEUSE_TOKEN_FILE", DEFAULT_TOKEN)).read_text().strip()
        self.http = httpx.Client(base_url=self.base, headers={"Authorization": f"Bearer {key}"}, timeout=30)

    def _d(self, dev: str) -> str:
        return f"/api/devices/{quote(dev, safe='')}"

    def devices(self) -> list[dict]:
        return self.http.get("/api/devices").raise_for_status().json()["devices"]

    def lease(self, dev: str, seconds: int = 600) -> dict:
        return self.http.post(self._d(dev) + "/lease", json={"seconds": seconds}).raise_for_status().json()

    def release(self, dev: str) -> None:
        self.http.delete(self._d(dev) + "/lease")

    def screenshot(self, dev: str) -> bytes:
        return self.http.get(self._d(dev) + "/screenshot").raise_for_status().content

    def action(self, dev: str, action: str, **p) -> object:
        return self.http.post(self._d(dev) + "/actions", json={"action": action, **p}).raise_for_status().json().get("value")
