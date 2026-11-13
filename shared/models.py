"""Shared run / step / task models for server and runner.

The TypeScript mirror lives in web/src/schema.ts (Zod). Keep them in sync.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TaskId = Literal["calfresh", "cal", "msg"]
Agent = Literal["pip", "fern", "bun", "nimbus"]
TaskStatus = Literal["queued", "running", "ready", "done", "stopped", "skipped", "need_human"]
RunStatus = Literal["queued", "running", "waiting", "done", "stopped", "failed"]
RunMode = Literal["live", "replay"]

TASK_IDS: tuple[str, ...] = ("calfresh", "cal", "msg")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Step(Strict):
    """One line in the audit log: what an agent did on the phone, and what it saw after."""

    seq: int = Field(ge=0)
    task_id: TaskId | None = None
    agent: Agent
    text: str = Field(min_length=1, max_length=300)
    at: float  # unix seconds
    stop: bool = False  # this step is a hard stop waiting for a yes
    action: str | None = Field(default=None, max_length=40)
    target: str | None = Field(default=None, max_length=200)
    result: Literal["ok", "failed", "blocked", "stopped"] | None = None
    screenshot: str | None = Field(default=None, max_length=300)  # server URL path, never a device path


class TaskState(Strict):
    id: TaskId
    status: TaskStatus = "queued"
    trace_url: str | None = Field(default=None, max_length=500)
    note: str | None = Field(default=None, max_length=300)


class Run(Strict):
    id: str = Field(pattern=r"^[a-z0-9-]{6,40}$")
    mode: RunMode = "live"
    status: RunStatus = "queued"
    created_at: float
    tasks: list[TaskState]
    steps: list[Step] = []
    device: str | None = Field(default=None, max_length=60)  # display label only, e.g. "iPhone"


class Approval(Strict):
    """What the PWA sends for Yes / Skip / Change. Resumes the LangGraph interrupt."""

    task_id: TaskId
    approved: bool
    change: str | None = Field(default=None, max_length=500)
