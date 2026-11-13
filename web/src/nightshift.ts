// Night Shift engine. Two sources behind one store:
//  - live:   the server queues a job, the runner on the Mac drives the real iPhone through PhoneUse,
//            and we poll the run for steps + screenshots. Yes/Skip/Change resume the LangGraph interrupt.
//  - replay: no runner online, so we play back the last recorded real run (if the server has one)
//            or the bundled demo run. Always labelled "Replay".
import { useSyncExternalStore } from "react";
import { TASKS } from "./data";
import type { DemoStep } from "./types";
import { Run, Status, type RunT, type StatusT, type TaskStatusT } from "./schema";
import { cheer } from "./art";

export type Screen = { mock: [string, Record<string, unknown>] } | { shot: string };
export type LogLine = { ag: string; text: string; at: string; stop?: boolean };
export type Frame = { screen: Screen; text: string };
export type Mode = "live" | "replay";

type State = {
  mode: Mode;
  source: "live" | "recording" | "demo";
  status: StatusT | null;
  on: boolean;
  agent: string | null;
  cur: Screen;
  log: LogLine[];
  st: Record<string, TaskStatusT>;
  brief: boolean;
  runs: number;
  steps: number;
  pages: number;
  film: Record<string, Frame[]>;
  trace: Record<string, string | null>;
  runId: string | null;
};

const KEY = "bfns_state";
const IDLE: Screen = { mock: ["idle", {}] };
const load = (): Partial<State> => {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};
const persisted = load();

let S: State = {
  mode: "replay", source: "demo", status: null, on: false, agent: null, cur: IDLE, log: [],
  st: persisted.st || {}, brief: persisted.brief || false, runs: persisted.runs || 0,
  steps: persisted.steps || 0, pages: persisted.pages || 0, film: persisted.film || {}, trace: persisted.trace || {},
  runId: persisted.runId || null,
};
const subs = new Set<() => void>();
function set(p: Partial<State>) {
  S = { ...S, ...p };
  try {
    const { st, brief, runs, steps, pages, film, trace, runId } = S;
    localStorage.setItem(KEY, JSON.stringify({ st, brief, runs, steps, pages, film, trace, runId }));
  } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export const useNS = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => S);
export const getNS = () => S;

let calm = false;
export const setCalm = (c: boolean) => { calm = c; };
let notify: (m: string) => void = () => {};
let morning: () => void = () => {};
export const onMorning = (f: () => void) => { morning = f; };
export const onToast = (f: (m: string) => void) => { notify = f; };

const nowT = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const addLog = (ag: string, text: string, stop?: boolean) =>
  set({ log: [{ ag, text, at: nowT(), stop }, ...S.log].slice(0, 40), steps: S.steps + 1 });

let timer = 0;
let gen = 0; // bumps on stop, so stale loops exit
const sleep = (ms: number) => new Promise<void>((r) => { timer = window.setTimeout(r, calm ? Math.min(ms, 250) : ms); });

// ---------- server ----------
// The phone's owner opens /?owner=<OWNER_TOKEN> once; that device can then drive the live phone.
// Everyone else (judges scanning the QR) gets the replay.
const OWNER_KEY = "bfns_owner";
try {
  const q = new URLSearchParams(location.search);
  const t = q.get("owner");
  if (t && /^[A-Za-z0-9_-]{8,128}$/.test(t)) {
    localStorage.setItem(OWNER_KEY, t);
    q.delete("owner");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
  }
} catch { /* private mode */ }
const ownerToken = () => { try { return localStorage.getItem(OWNER_KEY) || ""; } catch { return ""; } };

async function api<T>(path: string, init?: RequestInit, parse?: (j: unknown) => T): Promise<T> {
  const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", "X-Owner-Token": ownerToken(), ...(init?.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status}`);
  const j = await r.json();
  return parse ? parse(j) : (j as T);
}

export async function refreshStatus() {
  try {
    const st = await api("/api/status", undefined, (j) => Status.parse(j));
    set({ status: st, mode: st.runner_online && st.phone_online ? "live" : "replay" });
  } catch {
    set({ status: null, mode: "replay" });
  }
}

// ---------- replay ----------
type ReplayTask = { id: string; ag: string; steps: [Screen, string, boolean][]; fin: [Screen, string, boolean][] };
const fromDemo = (s: DemoStep): [Screen, string, boolean] => [{ mock: [s[0], s[1]] }, s[2], !!s[3]];
const DEMO: ReplayTask[] = TASKS.map((t) => ({ id: t.id, ag: t.ag, steps: t.steps.map(fromDemo), fin: t.fin.map(fromDemo) }));

/** Turn a recorded real run into replay tasks: steps up to the hard stop, then the steps after the yes. */
function fromRecording(run: RunT): ReplayTask[] {
  return TASKS.map((t) => {
    const mine = run.steps.filter((s) => s.task_id === t.id);
    const k = mine.findIndex((s) => s.stop);
    const conv = (s: (typeof mine)[number]): [Screen, string, boolean] =>
      [s.screenshot ? { shot: s.screenshot } : IDLE, s.text, !!s.stop];
    return { id: t.id, ag: t.ag, steps: (k < 0 ? mine : mine.slice(0, k + 1)).map(conv), fin: (k < 0 ? [] : mine.slice(k + 1)).map(conv) };
  }).filter((t) => t.steps.length);
}

let replayTasks: ReplayTask[] = DEMO;

async function runReplay() {
  const g = ++gen;
  replayTasks = DEMO;
  let source: State["source"] = "demo";
  if (S.status?.has_recording) {
    try {
      const rec = await api("/api/runs/latest", undefined, (j) => Run.parse(j));
      const t = fromRecording(rec);
      if (t.length) { replayTasks = t; source = "recording"; }
    } catch { /* fall back to the bundled demo */ }
  }
  const st: Record<string, TaskStatusT> = {};
  TASKS.forEach((t) => (st[t.id] = "queued"));
  set({ on: true, source, log: [], brief: false, st, runs: S.runs + 1, film: {}, trace: {} });
  set({ agent: "fern" });
  addLog("fern", "Fern checks 3 official pages via Tavily (fns.usda.gov, dhcs.ca.gov, irs.gov)");
  set({ pages: S.pages + 3 });
  await sleep(1300); if (g !== gen) return;
  set({ agent: "pip" });
  addLog("pip", "Pip asks PhoneUse for your iPhone and holds it for 10 minutes");
  await sleep(1000);
  for (const t of replayTasks) {
    if (g !== gen) return;
    set({ st: { ...S.st, [t.id]: "running" }, agent: t.ag });
    const film: Frame[] = [];
    for (const [screen, text, stop] of t.steps) {
      if (g !== gen) return;
      film.push({ screen, text });
      set({ cur: screen, film: { ...S.film, [t.id]: [...film] } });
      addLog(t.ag, text, stop);
      await sleep(stop ? 1500 : 1150);
    }
    if (g !== gen) return;
    set({ st: { ...S.st, [t.id]: "ready" } });
  }
  set({ on: false, agent: null, cur: IDLE, brief: true });
  addLog("pip", "All 3 paused before the final tap. The phone goes back to sleep");
  morning();
}

async function approveReplay(id: string) {
  const t = replayTasks.find((x) => x.id === id) || DEMO.find((x) => x.id === id);
  if (!t) return;
  const g = ++gen;
  set({ on: true, agent: t.ag, st: { ...S.st, [id]: "running" } });
  for (const [screen, text] of t.fin) {
    if (g !== gen) return;
    set({ cur: screen });
    addLog(t.ag, text);
    await sleep(1300);
  }
  set({ on: false, agent: null, st: { ...S.st, [id]: "done" } });
  doneToast(id);
}

// ---------- live ----------
let poll = 0;
function applyRun(run: RunT) {
  const film: Record<string, Frame[]> = {};
  const trace: Record<string, string | null> = {};
  const st: Record<string, TaskStatusT> = {};
  run.tasks.forEach((t) => { st[t.id] = t.status; trace[t.id] = t.trace_url ?? null; });
  for (const s of run.steps) {
    if (!s.task_id) continue;
    (film[s.task_id] ||= []).push({ screen: s.screenshot ? { shot: s.screenshot } : IDLE, text: s.text });
  }
  const last = [...run.steps].reverse().find((s) => s.screenshot);
  const running = run.status === "running" || run.status === "queued";
  const lastAgent = run.steps.length ? run.steps[run.steps.length - 1].agent : null;
  set({
    runId: run.id, st, film, trace,
    on: running,
    agent: running ? lastAgent : null,
    cur: last?.screenshot ? { shot: last.screenshot } : IDLE,
    log: [...run.steps].reverse().slice(0, 40).map((s) => ({
      ag: s.agent, text: s.text, stop: s.stop,
      at: new Date(s.at * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    })),
    brief: Object.values(st).some((x) => x === "ready" || x === "done"),
  });
}

function startPolling(id: string) {
  clearInterval(poll);
  let prevReady = 0;
  poll = window.setInterval(async () => {
    try {
      const run = await api(`/api/runs/${encodeURIComponent(id)}`, undefined, (j) => Run.parse(j));
      applyRun(run);
      const ready = run.tasks.filter((t) => t.status === "ready").length;
      if (ready > prevReady) cheer();
      prevReady = ready;
      if (["done", "stopped", "failed", "waiting"].includes(run.status) && !run.tasks.some((t) => t.status === "running")) {
        if (run.status === "waiting" && ready) morning();
        clearInterval(poll);
      }
    } catch { /* keep trying; network-first */ }
  }, 1000);
}

async function runLive() {
  const run = await api("/api/runs", { method: "POST", body: "{}" }, (j) => Run.parse(j));
  set({ runs: S.runs + 1, log: [], film: {}, trace: {}, brief: false, on: true, agent: "fern" });
  applyRun(run);
  startPolling(run.id);
}

// ---------- public actions ----------
export async function runNight() {
  if (S.on) return;
  await refreshStatus();
  if (S.mode === "live" && S.status?.active_run) { await resume(); return; }  // someone's run is live: watch it
  if (S.mode === "live" && S.status?.owner !== false) {
    try { await runLive(); return; } catch { notify("The phone isn't reachable. Showing a replay"); set({ mode: "replay" }); }
  }
  await runReplay();
}

export async function stopRun() {
  gen++;
  clearTimeout(timer);
  const was = S.on;
  if (S.mode === "live" && S.runId) {
    try { await api(`/api/runs/${encodeURIComponent(S.runId)}/stop`, { method: "POST", body: "{}" }); } catch { /* best effort */ }
  }
  const st = { ...S.st };
  Object.keys(st).forEach((k) => { if (st[k] === "running" || st[k] === "queued") st[k] = "stopped"; });
  set({ on: false, agent: null, st, brief: Object.values(st).some((s) => s === "ready") });
  if (was) addLog("pip", "You tapped Stop. Nothing was submitted or sent", true);
  notify("Stopped. Nothing was sent");
}

export async function decide(id: string, approved: boolean, change?: string) {
  if (S.st[id] !== "ready" || S.on) return;
  if (S.mode === "live" && S.runId) {
    await api(`/api/runs/${encodeURIComponent(S.runId)}/approve`, { method: "POST", body: JSON.stringify({ task_id: id, approved, change: change || null }) });
    set({ st: { ...S.st, [id]: approved ? "running" : "skipped" }, on: approved });
    startPolling(S.runId);
    if (!approved) notify("Skipped. Nothing was sent");
    return;
  }
  if (!approved) { set({ st: { ...S.st, [id]: "skipped" } }); notify("Skipped. Nothing was sent"); return; }
  await approveReplay(id);
}

function doneToast(id: string) {
  cheer();
  notify(id === "calfresh" ? "Submitted! Bun added the interview step to My plan" : id === "cal" ? "2 events saved to your Calendar" : "Sent to Maria with a voice note");
}

export const readyN = () => TASKS.filter((t) => S.st[t.id] === "ready").length;
export const doneN = () => TASKS.filter((t) => S.st[t.id] === "done").length;

/** Open the latest live run if we come back to the app mid-run (or from a push). */
export async function resume() {
  await refreshStatus();
  const id = S.status?.active_run || S.runId;
  if (S.mode === "live" && id) {
    set({ runId: id });
    try { applyRun(await api(`/api/runs/${encodeURIComponent(id)}`, undefined, (j) => Run.parse(j))); startPolling(id); } catch { /* old run gone */ }
  }
}
