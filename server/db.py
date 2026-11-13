"""SQLite storage for runs, steps, approvals and push subscriptions."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path

STATE = Path(os.environ.get("BENEFEED_STATE_DIR", Path(__file__).resolve().parent / ".state"))
MEDIA = STATE / "media"
STATE.mkdir(parents=True, exist_ok=True)
MEDIA.mkdir(parents=True, exist_ok=True)
DB_PATH = STATE / "benefeed.db"
SCREENSHOT_TTL = 24 * 3600

_lock = threading.Lock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
_conn.row_factory = sqlite3.Row
_conn.executescript(
    """
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created_at REAL, data TEXT, stop_requested INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT, task_id TEXT, approved INTEGER,
      change TEXT, created_at REAL, consumed INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS runner (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, data TEXT, created_at REAL);
    CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, data TEXT, fetched_at REAL);
    """
)


def q(sql: str, args: tuple = ()) -> list[sqlite3.Row]:
    with _lock:
        return list(_conn.execute(sql, args))


def save_run(run: dict) -> None:
    q("INSERT INTO runs(id, created_at, data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      (run["id"], run["created_at"], json.dumps(run)))


def get_run(run_id: str) -> dict | None:
    r = q("SELECT data FROM runs WHERE id=?", (run_id,))
    return json.loads(r[0]["data"]) if r else None


def latest_run(where: str = "1=1") -> dict | None:
    r = q(f"SELECT data FROM runs WHERE {where} ORDER BY created_at DESC LIMIT 1")
    return json.loads(r[0]["data"]) if r else None


def all_runs() -> list[dict]:
    return [json.loads(r["data"]) for r in q("SELECT data FROM runs ORDER BY created_at DESC")]


def request_stop(run_id: str) -> None:
    q("UPDATE runs SET stop_requested=1 WHERE id=?", (run_id,))


def stop_requested(run_id: str) -> bool:
    r = q("SELECT stop_requested FROM runs WHERE id=?", (run_id,))
    return bool(r and r[0]["stop_requested"])


def add_approval(run_id: str, task_id: str, approved: bool, change: str | None) -> int:
    with _lock:
        cur = _conn.execute(
            "INSERT INTO approvals(run_id, task_id, approved, change, created_at) VALUES(?,?,?,?,?)",
            (run_id, task_id, int(approved), change, time.time()))
        return int(cur.lastrowid)


def pending_approvals(run_id: str) -> list[dict]:
    return [dict(r) for r in q("SELECT * FROM approvals WHERE run_id=? AND consumed=0 ORDER BY id", (run_id,))]


def consume_approval(approval_id: int) -> None:
    q("UPDATE approvals SET consumed=1 WHERE id=?", (approval_id,))


def runner_set(k: str, v: object) -> None:
    q("INSERT INTO runner(k, v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, json.dumps(v)))


def runner_get(k: str, default: object = None) -> object:
    r = q("SELECT v FROM runner WHERE k=?", (k,))
    return json.loads(r[0]["v"]) if r else default


def purge_old_media(now: float | None = None) -> int:
    now = now or time.time()
    n = 0
    for f in MEDIA.glob("*.png"):
        if now - f.stat().st_mtime > SCREENSHOT_TTL:
            f.unlink(missing_ok=True)
            n += 1
    return n


def erase_everything() -> None:
    for f in MEDIA.glob("*"):
        f.unlink(missing_ok=True)
    q("DELETE FROM runs")
    q("DELETE FROM approvals")
    q("DELETE FROM push_subs")
