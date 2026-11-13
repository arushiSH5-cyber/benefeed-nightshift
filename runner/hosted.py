"""Hosted PhoneUse (cloud Android phone) behind the same interface as the local client.
Talks MCP over HTTPS to mcp.phoneuse.com with PHONEUSE_API_KEY (runner-side only).
Coordinates: PhoneUse uses a 0-1000 grid; the crew uses 0-1, so we scale here."""
from __future__ import annotations

import base64
import itertools
import json
import os
import re
import time
import uuid

import httpx

URL = os.environ.get("PHONEUSE_MCP_URL", "https://mcp.phoneuse.com/mcp")
CHROME, GCAL, GMSG = "com.android.chrome", "com.google.android.calendar", "com.google.android.apps.messaging"
# The crew's task definitions name iOS apps; on the cloud Android phone they map to these.
APP_MAP = {"com.apple.mobilesafari": CHROME, "com.apple.mobilecal": GCAL, "com.apple.MobileSMS": GMSG}


class HostedPhoneUse:
    def __init__(self, key: str | None = None):
        key = key or os.environ["PHONEUSE_API_KEY"]
        self.http = httpx.Client(timeout=60, headers={
            "Authorization": f"Bearer {key}", "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"})
        self.ids = itertools.count(1)
        self.lease_id: str | None = None
        self.nodes: dict[str, dict] = {}

    # ---------- MCP ----------
    def call(self, name: str, **args) -> dict:
        args = {k: v for k, v in args.items() if v is not None}
        r = self.http.post(URL, json={"jsonrpc": "2.0", "id": next(self.ids), "method": "tools/call",
                                      "params": {"name": name, "arguments": args}})
        r.raise_for_status()
        m = re.search(r"\{.*\}", r.text, re.S)
        d = json.loads(m.group(0)) if m else {}
        if "error" in d:
            raise RuntimeError(f"{name}: {d['error']}")
        res = d.get("result", {})
        if res.get("isError"):
            raise RuntimeError(f"{name}: {self._text(res)[:300]}")
        return res

    @staticmethod
    def _text(res: dict) -> str:
        return "".join(c.get("text", "") for c in res.get("content", []) if c.get("type") == "text")

    def _json(self, res: dict):
        if res.get("structuredContent") is not None:
            return res["structuredContent"]
        t = self._text(res)
        try:
            return json.loads(t)
        except ValueError:
            return t

    def _act(self, name: str, dev: str, **a):
        return self._json(self.call(name, deviceId=dev, leaseId=self.lease_id, idempotencyKey=uuid.uuid4().hex, **a))

    # ---------- same interface as runner.phoneuse.PhoneUse ----------
    def devices(self) -> list[dict]:
        v = self._json(self.call("list_devices"))
        items = v.get("devices", v) if isinstance(v, dict) else v
        out = []
        for d in items or []:
            st = str(d.get("status", d.get("state", ""))).lower()
            ok = st in ("", "online", "ready", "available", "idle")
            out.append({"id": d.get("deviceId") or d.get("id"), "name": d.get("name", "cloud phone"),
                        "online": ok, "automation": "ready" if ok else st})
        return out

    def lease(self, dev: str, seconds: int = 600):
        v = self._json(self.call("acquire_device", deviceId=dev))
        self.lease_id = (v or {}).get("leaseId") if isinstance(v, dict) else None
        return v

    def release(self, dev: str):
        if self.lease_id:
            try:
                self.call("release_device", deviceId=dev, leaseId=self.lease_id)
            finally:
                self.lease_id = None

    def screenshot(self, dev: str) -> bytes:
        res = self.call("screenshot", deviceId=dev, leaseId=self.lease_id)
        for c in res.get("content", []):
            if c.get("type") == "image":
                return base64.b64decode(c["data"])
        raise RuntimeError("no image in screenshot result")

    def _snapshot(self, dev: str):
        return self._json(self.call("ui_snapshot", deviceId=dev, leaseId=self.lease_id))

    def _flat(self, tree) -> list[dict]:
        """Every node with a label and bounds, in the 0-1000 grid."""
        out, stack = [], [tree]
        while stack:
            n = stack.pop()
            if isinstance(n, list):
                stack.extend(n); continue
            if not isinstance(n, dict):
                continue
            label = n.get("text") or n.get("label") or n.get("contentDescription") or n.get("content_desc") or n.get("hint") or ""
            b = n.get("bounds") or n.get("rect") or n.get("frame")
            if label and b:
                if isinstance(b, dict):
                    x, y = b.get("x", b.get("left", 0)), b.get("y", b.get("top", 0))
                    w = b.get("width", b.get("right", 0) - x); h = b.get("height", b.get("bottom", 0) - y)
                else:
                    x, y, r, btm = b[:4]; w, h = r - x, btm - y
                out.append({"label": str(label)[:120], "rect": {"x": x, "y": y, "width": w, "height": h},
                            "editable": bool(n.get("editable") or "EditText" in str(n.get("class", n.get("type", "")))),
                            "enabled": n.get("enabled", True)})
            for k in ("children", "nodes", "elements", "root", "tree"):
                if k in n:
                    stack.append(n[k])
        return out

    def _tap_rect(self, dev: str, r: dict):
        self._act("tap", dev, x=round(r["x"] + r["width"] / 2), y=round(r["y"] + r["height"] / 2))

    def action(self, dev: str, action: str, **p):
        if action == "source_fast":
            nodes = self._flat(self._snapshot(dev))
            return "\n".join(f"[{n['label']}]{' (field)' if n['editable'] else ''}" for n in nodes)[:20000]
        if action == "find_elements":
            q = p["query"].lower()
            hits = [n for n in self._flat(self._snapshot(dev)) if q in n["label"].lower()][:8]
            els = []
            for n in hits:
                eid = uuid.uuid4().hex[:12]
                self.nodes[eid] = n
                els.append({"element_id": eid, "session_id": "cloud", "attributes": {
                    "label": n["label"], "rect": n["rect"], "enabled": n["enabled"],
                    "type": "field" if n["editable"] else "element"}})
            return {"elements": els, "count": len(els)}
        if action == "element_click":
            return self._tap_rect(dev, self.nodes[p["element_id"]]["rect"])
        if action == "element_fill":
            self._tap_rect(dev, self.nodes[p["element_id"]]["rect"])
            time.sleep(0.4)
            return self._act("type_text", dev, text=p["text"])
        if action == "launch_app":
            return self._act("open_app", dev, appId=APP_MAP.get(p["bundle_id"], p["bundle_id"]))
        if action == "open_url":  # Chrome: focus the address bar, type the URL, press enter
            self._act("open_app", dev, appId=CHROME)
            time.sleep(1.2)
            bar = [n for n in self._flat(self._snapshot(dev)) if re.search(r"search or type|address|url", n["label"], re.I)]
            if bar:
                self._tap_rect(dev, bar[0]["rect"])
            time.sleep(0.4)
            self._act("type_text", dev, text=p["url"])
            return self._act("press_key", dev, key="enter")
        if action == "tap":
            return self._act("tap", dev, x=round(p["x"] * 1000), y=round(p["y"] * 1000))
        if action == "swipe":
            return self._act("swipe", dev, fromX=round(p["x"] * 1000), fromY=round(p["y"] * 1000),
                             toX=round(p["x2"] * 1000), toY=round(p["y2"] * 1000))
        if action == "window_size":
            return {"width": 1000, "height": 1000}  # rects are already in the 0-1000 grid
        if action == "active_app":
            return None
        raise ValueError(f"unsupported action {action}")
