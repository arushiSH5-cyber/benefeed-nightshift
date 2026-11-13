"""Benefeed Night Shift server (runs on Replit).

Serves the PWA, the public API the PWA uses, the runner API (shared secret) and the practice portal.
The runner on the Mac only makes outbound calls to this server. PhoneUse is never exposed.
"""
from __future__ import annotations

import hmac
import json
import os
import secrets
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from shared.models import TASK_IDS, Approval, Run, Step, TaskState

from . import db
from .practice import router as practice_router

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "web" / "dist"
RUNNER_ONLINE_S = 20

app = FastAPI(title="Benefeed Night Shift", docs_url=None, redoc_url=None)
app.include_router(practice_router)
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
_origins = [o for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o]
if _origins:  # e.g. https://benefeed-nightshift.vercel.app
    app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type", "X-Owner-Token"])
from .extras import fern_check, router as extras_router, send_morning  # noqa: E402
app.include_router(extras_router)


# ---------- limits ----------
_hits: dict[tuple[str, str], deque] = defaultdict(deque)
LIMITS = {"default": (180, 60), "start": (6, 60), "tts": (12, 60), "write": (40, 60)}


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return (fwd.split(",")[0].strip() or (request.client.host if request.client else "?"))[:64]


def limit(bucket: str = "default"):
    def dep(request: Request) -> None:
        n, window = LIMITS[bucket]
        key = (_client_ip(request), bucket)
        now = time.time()
        dq = _hits[key]
        while dq and now - dq[0] > window:
            dq.popleft()
        if len(dq) >= n:
            raise HTTPException(429, "Too many requests. Try again in a minute.")
        dq.append(now)
    return dep


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    if request.url.path.startswith("/api/"):
        resp.headers.setdefault("Cache-Control", "no-store")
    return resp


# ---------- auth ----------
def require_runner(x_runner_secret: str = Header(default="")) -> None:
    secret = os.environ.get("RUNNER_SECRET", "")
    if not secret:
        raise HTTPException(503, "Runner API disabled: RUNNER_SECRET is not set")
    if not hmac.compare_digest(x_runner_secret.encode(), secret.encode()):
        raise HTTPException(401, "bad runner secret")


def is_owner(x_owner_token: str = Header(default="")) -> bool:
    """Only the owner can start a live run or approve a final tap. Everyone else sees a replay.
    With no OWNER_TOKEN set (local dev) everyone is the owner."""
    tok = os.environ.get("OWNER_TOKEN", "")
    return not tok or hmac.compare_digest(x_owner_token.encode(), tok.encode())


def require_owner(owner: bool = Depends(is_owner)) -> None:
    if not owner:
        raise HTTPException(403, "Only the phone's owner can drive the live phone. You're seeing a replay.")


# ---------- helpers ----------
def _runner_online() -> tuple[bool, bool, str | None, float | None]:
    hb = db.runner_get("heartbeat") or {}
    seen = hb.get("at")
    online = bool(seen and time.time() - seen < RUNNER_ONLINE_S)
    return online, online and bool(hb.get("phone_online")), hb.get("device"), seen


def _active_run() -> dict | None:
    for r in db.all_runs()[:5]:
        if r["status"] in ("queued", "running"):
            return r
        if r["status"] == "waiting" and any(t["status"] in ("ready", "running") for t in r["tasks"]):
            return r
    return None


def _recording() -> dict | None:
    """The latest real run worth replaying: it reached at least one hard stop with screenshots."""
    for r in db.all_runs():
        if r.get("mode") == "live" and any(s.get("stop") for s in r["steps"]) and any(s.get("screenshot") for s in r["steps"]):
            return r
    return None


def _public(run: dict) -> dict:
    return Run.model_validate(run).model_dump()


def _get(run_id: str) -> dict:
    if not run_id or len(run_id) > 40:
        raise HTTPException(404)
    r = db.get_run(run_id)
    if not r:
        raise HTTPException(404, "run not found")
    return r


# ---------- public API ----------
@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/status", dependencies=[Depends(limit())])
def status(owner: bool = Depends(is_owner)):
    online, phone, device, seen = _runner_online()
    active = _active_run()
    return {
        "runner_online": online and owner,
        "phone_online": phone and owner,
        "device": device if owner else None,
        "last_seen": seen,
        "active_run": active["id"] if (active and owner) else None,
        "has_recording": _recording() is not None,
    }


@app.post("/api/runs", dependencies=[Depends(limit("start")), Depends(require_owner)])
def start_run():
    online, phone, device, _ = _runner_online()
    if not (online and phone):
        raise HTTPException(409, "The phone is offline. Showing a replay.")
    active = _active_run()
    if active:
        return _public(active)
    run = Run(
        id=uuid.uuid4().hex[:12], mode="live", status="queued", created_at=time.time(),
        tasks=[TaskState(id=t) for t in TASK_IDS], steps=[], device="iPhone",
    ).model_dump()
    db.save_run(run)
    return _public(run)


@app.get("/api/runs/latest", dependencies=[Depends(limit())])
def latest_recording():
    r = _recording()
    if not r:
        raise HTTPException(404, "no recorded run yet")
    return _public(r)


@app.get("/api/runs/{run_id}", dependencies=[Depends(limit())])
def get_run(run_id: str):
    return _public(_get(run_id))


@app.post("/api/runs/{run_id}/stop", dependencies=[Depends(limit("write"))])
def stop_run(run_id: str):
    """Anyone may press Stop. The runner sees it on its next check (it polls every 0.5 s)."""
    r = _get(run_id)
    db.request_stop(run_id)
    if r["status"] in ("queued", "running", "waiting"):
        for t in r["tasks"]:
            if t["status"] in ("queued", "running"):
                t["status"] = "stopped"
        r["status"] = "stopped" if r["status"] == "queued" else r["status"]
        db.save_run(r)
    return {"ok": True}


@app.post("/api/runs/{run_id}/approve", dependencies=[Depends(limit("write")), Depends(require_owner)])
def approve(run_id: str, body: Approval):
    r = _get(run_id)
    task = next((t for t in r["tasks"] if t["id"] == body.task_id), None)
    if not task or task["status"] != "ready":
        raise HTTPException(409, "That task isn't waiting for a yes")
    aid = db.add_approval(run_id, body.task_id, body.approved, body.change)
    task["status"] = "running" if (body.approved or body.change) else "skipped"
    if r["status"] in ("waiting", "done"):
        r["status"] = "running" if task["status"] == "running" else r["status"]
    db.save_run(r)
    return {"ok": True, "approval_id": aid}


class TTSIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=600)
    lang: str = Field(default="en", pattern=r"^(en|es)$")


@app.post("/api/tts", dependencies=[Depends(limit("tts"))])
def tts(body: TTSIn):
    from . import voice  # lazy: optional dependency on ElevenLabs keys
    audio = voice.synthesize(body.text, body.lang)
    if audio is None:
        raise HTTPException(503, "ElevenLabs is not configured")
    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/erase", dependencies=[Depends(limit("write")), Depends(require_owner)])
def erase():
    db.erase_everything()
    return {"ok": True}


@app.get("/media/{name}")
def media(name: str):
    if not name.endswith(".png") or "/" in name or ".." in name or len(name) > 60:
        raise HTTPException(404)
    f = db.MEDIA / name
    if not f.exists():
        raise HTTPException(404)
    if time.time() - f.stat().st_mtime > db.SCREENSHOT_TTL:
        f.unlink(missing_ok=True)
        raise HTTPException(404)
    return FileResponse(f, media_type="image/png", headers={"Cache-Control": "private, max-age=86400"})


@app.post("/api/sources/refresh", dependencies=[Depends(limit("start")), Depends(require_owner)])
def refresh_sources():
    return {"checked": fern_check()}


# ---------- runner API (shared secret, outbound from the Mac) ----------
class Heartbeat(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phone_online: bool
    device: str | None = Field(default=None, max_length=60)


@app.post("/api/runner/heartbeat", dependencies=[Depends(require_runner)])
def heartbeat(body: Heartbeat):
    db.runner_set("heartbeat", {"at": time.time(), "phone_online": body.phone_online, "device": body.device})
    db.purge_old_media()
    return {"ok": True}


@app.get("/api/runner/next", dependencies=[Depends(require_runner)])
def runner_next():
    """Hand the runner the oldest queued run, plus any run that has fresh approvals to resume."""
    for r in sorted(db.all_runs(), key=lambda x: x["created_at"]):
        if r["status"] == "queued" and not db.stop_requested(r["id"]):
            r["status"] = "running"
            db.save_run(r)
            return {"kind": "start", "run": _public(r)}
    for r in db.all_runs():
        if db.pending_approvals(r["id"]) and not db.stop_requested(r["id"]):
            return {"kind": "resume", "run": _public(r), "approvals": db.pending_approvals(r["id"])}
    return {"kind": "idle"}


@app.get("/api/runner/runs/{run_id}/control", dependencies=[Depends(require_runner)])
def runner_control(run_id: str):
    _get(run_id)
    return {"stop": db.stop_requested(run_id), "approvals": db.pending_approvals(run_id)}


@app.post("/api/runner/runs/{run_id}/approvals/{aid}/consume", dependencies=[Depends(require_runner)])
def runner_consume(run_id: str, aid: int):
    if not any(a["id"] == aid for a in db.pending_approvals(run_id)):
        raise HTTPException(404, "no such pending approval")
    db.consume_approval(aid)
    return {"ok": True}


PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@app.post("/api/runner/runs/{run_id}/steps", dependencies=[Depends(require_runner)])
async def runner_step(run_id: str, meta: str = Form(...), screenshot: UploadFile | None = File(default=None)):
    r = _get(run_id)
    try:
        raw = json.loads(meta)
        raw.setdefault("seq", len(r["steps"]))
        raw["seq"] = len(r["steps"])
        raw.setdefault("at", time.time())
        raw.pop("screenshot", None)
        step = Step.model_validate(raw).model_dump()
    except (ValidationError, json.JSONDecodeError) as e:
        raise HTTPException(422, f"bad step: {e}") from e
    if screenshot is not None:
        data = await screenshot.read(5 * 1024 * 1024 + 1)
        if len(data) > 5 * 1024 * 1024 or not (data.startswith(PNG_MAGIC) or data[:3] == b"\xff\xd8\xff"):
            raise HTTPException(422, "screenshot must be a PNG under 5 MB")
        name = f"{run_id}-{step['seq']:03d}-{secrets.token_hex(4)}.png"
        (db.MEDIA / name).write_bytes(data)
        step["screenshot"] = f"/media/{name}"
    r = db.get_run(run_id) or r  # re-read: status may have changed while uploading
    r["steps"].append(step)
    db.save_run(r)
    return {"ok": True, "seq": step["seq"], "screenshot": step["screenshot"]}


class RunPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str | None = Field(default=None, pattern=r"^(running|waiting|done|stopped|failed)$")
    tasks: list[TaskState] | None = None


@app.patch("/api/runner/runs/{run_id}", dependencies=[Depends(require_runner)])
def runner_patch(run_id: str, body: RunPatch):
    r = _get(run_id)
    if body.status == "waiting" and r["status"] != "waiting":
        send_morning(sum(t["status"] == "ready" for t in r["tasks"]))
    if body.status:
        r["status"] = body.status
    for t in body.tasks or []:
        for cur in r["tasks"]:
            if cur["id"] == t.id:
                cur.update({k: v for k, v in t.model_dump().items() if v is not None})
    db.save_run(r)
    return _public(r)


# ---------- the PWA ----------
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str):
    if path.startswith(("api/", "media/")):
        raise HTTPException(404)
    f = (DIST / path).resolve()
    if path and f.is_file() and DIST.resolve() in f.parents:
        headers = {"Cache-Control": "no-cache"} if f.name in ("sw.js", "manifest.webmanifest", "index.html") else {}
        return FileResponse(f, headers=headers)
    index = DIST / "index.html"
    if not index.exists():
        return JSONResponse({"error": "PWA not built. Run: cd web && npm run build"}, status_code=503)
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
