"""Runner: lives on the Mac next to PhoneUse. Outbound HTTPS only.
Polls the server for jobs, runs the crew graph, uploads every step, resumes on approvals, obeys Stop.
Run: uv run python -m runner.main"""
from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path

import httpx
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command

from .crew import Phone, build
from .phoneuse import PhoneUse
from .hosted import HostedPhoneUse
from .safety import Stopped

SERVER = os.environ.get("BENEFEED_SERVER", "http://127.0.0.1:8090").rstrip("/")
STATE = Path(__file__).parent / ".state"
STATE.mkdir(exist_ok=True)
http = httpx.Client(base_url=SERVER, headers={"X-Runner-Secret": os.environ["RUNNER_SECRET"]}, timeout=30)
CTX = {"helper": os.environ.get("HELPER_CONTACT", "Maria"),
       "note": os.environ.get("HELPER_NOTE", "Hola Maria, soy Rosa. Benefeed llenó la solicitud de CalFresh conmigo. Solo falta una foto de mi talón de pago. ¿Me ayudas mañana?")}


def reporter(run_id: str):
    def report(task_id, agent, text, action=None, target=None, result=None, stop=False, shot=None):
        meta = {"task_id": task_id, "agent": agent, "text": text[:300], "at": time.time(), "stop": stop,
                "action": action, "target": (target or None) and str(target)[:200], "result": result}
        files = {"screenshot": ("s.png", shot, "image/png")} if shot else None
        try:
            http.post(f"/api/runner/runs/{run_id}/steps", data={"meta": json.dumps(meta)}, files=files)
        except httpx.HTTPError as e:
            print("step upload failed:", e)
        print(f"[{agent}] {text}")
    return report


def watch_stop(run_id: str, stop: threading.Event, done: threading.Event):
    while not done.is_set():
        try:
            if http.get(f"/api/runner/runs/{run_id}/control").json().get("stop"):
                stop.set()
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.5)


def run(job: dict, pu: PhoneUse, device: str, saver: SqliteSaver):
    run_id = job["run"]["id"]
    stop, done = threading.Event(), threading.Event()
    threading.Thread(target=watch_stop, args=(run_id, stop, done), daemon=True).start()
    phone = Phone(pu, device, SERVER, stop)
    set_status = lambda tid, s: http.patch(f"/api/runner/runs/{run_id}", json={"tasks": [{"id": tid, "status": s}]})
    env = {"phone": phone, "report": reporter(run_id), "ctx": CTX, "set_status": set_status,
           "tasks": [t.strip() for t in os.environ.get("CREW_TASKS", "calfresh,cal,msg").split(",")]}
    graph = build(env).compile(checkpointer=saver)
    cfg = {"configurable": {"thread_id": run_id}, "run_name": f"night-shift {run_id}", "tags": ["benefeed"]}
    pu.lease(device, 600)
    try:
        if job["kind"] == "start":
            graph.invoke({"run_id": run_id}, cfg)
        else:
            for a in job["approvals"]:
                http.post(f"/api/runner/runs/{run_id}/approvals/{a['id']}/consume")
                graph.invoke(Command(resume={"task_id": a["task_id"], "approved": bool(a["approved"]),
                                             "change": a["change"], "approval_id": a["id"]}), cfg)
        snap = graph.get_state(cfg)
        http.patch(f"/api/runner/runs/{run_id}", json={"status": "waiting" if snap.next else "done"})
    except Stopped:
        env["report"](None, "pip", "You tapped Stop. Nothing was submitted or sent", result="stopped", stop=True)
        http.patch(f"/api/runner/runs/{run_id}", json={"status": "stopped"})
    finally:
        done.set()
        pu.release(device)  # Stop releases the lease immediately


def main():
    mode = os.environ.get("PHONEUSE_MODE", "hosted")
    if mode == "browser":
        from .browserphone import BrowserPhone
        pu = BrowserPhone()
    else:
        pu = HostedPhoneUse() if mode == "hosted" else PhoneUse()
    import sqlite3
    saver = SqliteSaver(sqlite3.connect(str(STATE / "checkpoints.db"), check_same_thread=False))
    print("runner up, server:", SERVER)
    while True:
        try:
            devs = [d for d in pu.devices() if d.get("online")]
            device = os.environ.get("PHONEUSE_DEVICE_ID") or (devs[0]["id"] if devs else None)
            ready = bool(device) and any(d["id"] == device and d.get("automation") == "ready" for d in devs)
        except Exception:
            device, ready = None, False
        try:
            http.post("/api/runner/heartbeat", json={"phone_online": ready, "device": "iPhone"})
            job = http.get("/api/runner/next").json() if ready else {"kind": "idle"}
        except httpx.HTTPError as e:
            print("server unreachable:", e)
            job = {"kind": "idle"}
        if job["kind"] != "idle":
            try:
                run(job, pu, device, saver)
            except Exception as e:  # never crash the loop; mark the run failed
                print("run failed:", repr(e))
                http.patch(f"/api/runner/runs/{job['run']['id']}", json={"status": "failed"})
        time.sleep(2)


if __name__ == "__main__":
    main()
