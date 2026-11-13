"""Web Push (morning notification) and Fern's Tavily source checks (official domains only)."""
from __future__ import annotations

import hashlib
import json
import os
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from . import db

router = APIRouter()

# ---------- Web Push ----------
class Sub(BaseModel):
    model_config = ConfigDict(extra="allow")
    endpoint: str = Field(pattern=r"^https://", max_length=600)
    keys: dict


@router.get("/api/push/key")
def push_key():
    k = os.environ.get("VAPID_PUBLIC_KEY")
    if not k:
        raise HTTPException(503, "push not configured")
    return {"key": k}


@router.post("/api/push/subscribe")
def subscribe(sub: Sub):
    db.q("INSERT OR REPLACE INTO push_subs(endpoint, data, created_at) VALUES(?,?,?)",
         (sub.endpoint, json.dumps(sub.model_dump()), time.time()))
    return {"ok": True}


def send_morning(ready: int) -> int:
    priv = os.environ.get("VAPID_PRIVATE_KEY")
    if not priv:
        return 0
    from pywebpush import WebPushException, webpush
    body = json.dumps({"title": "Benefeed", "body": f"🌙 Your crew is done. {ready} thing{'s are' if ready != 1 else ' is'} waiting for your yes.", "url": "/?review=1"})
    sent = 0
    for r in db.q("SELECT endpoint, data FROM push_subs"):
        try:
            webpush(json.loads(r["data"]), body, vapid_private_key=priv, vapid_claims={"sub": "mailto:benefeed-demo@example.com"}, ttl=12 * 3600)
            sent += 1
        except WebPushException as e:
            if e.response is not None and e.response.status_code in (404, 410):
                db.q("DELETE FROM push_subs WHERE endpoint=?", (r["endpoint"],))
    return sent


# ---------- Fern + Tavily ----------
OFFICIAL = ["fns.usda.gov", "dhcs.ca.gov", "cdss.ca.gov", "irs.gov", "ssa.gov", "medicare.gov", "lifelinesupport.org"]
CHECKS = {
    "snap": "CalFresh SNAP eligibility who can get it",
    "medicaid": "Medi-Cal renewal annual redetermination",
    "vita": "VITA free tax return preparation who qualifies",
    "extra": "Extra Help Medicare Part D low income subsidy",
    "lifeline": "Lifeline program eligibility",
}


def fern_check() -> list[dict]:
    key = os.environ.get("TAVILY_API_KEY")
    if not key:
        raise HTTPException(503, "Tavily not configured")
    out = []
    for pid, query in CHECKS.items():
        r = httpx.post("https://api.tavily.com/search", timeout=30, json={
            "api_key": key, "query": query, "include_domains": OFFICIAL, "max_results": 1, "search_depth": "basic"})
        res = (r.json().get("results") or []) if r.status_code == 200 else []
        if not res:
            continue
        top = res[0]
        url, quote = top.get("url", ""), (top.get("content") or "")[:400]
        if not any(url.split("/")[2].endswith(d) for d in OFFICIAL):  # belt and braces
            continue
        rec = {"id": pid, "url": url, "title": top.get("title", "")[:200], "quote": quote,
               "fetchedAt": time.time(), "sha256": hashlib.sha256(quote.encode()).hexdigest()}
        db.q("INSERT OR REPLACE INTO sources(id, data, fetched_at) VALUES(?,?,?)", (pid, json.dumps(rec), rec["fetchedAt"]))
        out.append(rec)
    return out


@router.get("/api/sources")
def sources():
    return {r["id"]: json.loads(r["data"]) for r in db.q("SELECT id, data FROM sources")}
