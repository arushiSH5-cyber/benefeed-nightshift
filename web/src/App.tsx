import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { CATS, IC, burst, cheer, cr, pipLive } from "./art";
import { AG, CPOSTS, P, PCOMMENTS, PEOPLE, TASKS } from "./data";
import type { Comment, Post, Program } from "./types";
import { Phone } from "./Phone";
import * as NS from "./nightshift";
import { readEls, say, stopRead } from "./speech";

/* ---------- tiny helpers ---------- */
const I = ({ h, className, style }: { h: string; className?: string; style?: React.CSSProperties }) => (
  <span className={className} style={style} dangerouslySetInnerHTML={{ __html: h }} />
);
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem("bfns_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem("bfns_" + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const money = (n: number) => "$" + n.toLocaleString("en-US");
const mid = (p: Program) => Math.round((p.est[0] + p.est[1]) / 2);
const dom = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const likesOf = (p: Program) => 380 + ((p.id.charCodeAt(0) * 37 + p.id.length * 91) % 1900);
const SSN = /\b\d{3}-?\d{2}-?\d{4}\b/;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const ADDR_RE = /\b\d{1,6}\s+[A-Za-z0-9.'\s]{2,40}\b(street|st|avenue|ave|road|rd|blvd|boulevard|lane|ln|drive|dr|court|ct|way)\b/i;
/** PII guard for comments and posts: no SSNs, phone numbers or street addresses. */
export function piiProblem(s: string): string | null {
  if (SSN.test(s)) return "That looks like a Social Security number. Please remove it.";
  if (PHONE_RE.test(s)) return "Please don't post phone numbers.";
  if (ADDR_RE.test(s)) return "Please don't post a street address.";
  return null;
}

type U = { done: boolean; who: string[]; inc: string; city: string; night: boolean; big: boolean; calm: boolean };
type SS = { liked: string[]; saved: string[]; clikes: string[]; myComments: Record<string, Comment[]>; myPosts: Post[] };
const DEF_U: U = { done: false, who: [], inc: "low", city: "San Jose", night: false, big: false, calm: false };
const DEF_S: SS = { liked: [], saved: [], clikes: [], myComments: {}, myPosts: [] };

const ORDER = ["snap", "extra", "medicaid", "eitc", "lifeline", "wic", "msp", "ssi", "ui", "childcare", "meals", "pell", "va", "liheap", "ctc", "vita", "mow", "para", "nls", "housing"];
const rank = (p: Program) => { const i = ORDER.indexOf(p.id); return i < 0 ? 99 : i; };
type Match = { p: Program; level: "likely" | "maybe" };
function matchesFor(u: U): Match[] {
  return P.map((p): Match | null => {
    const tagOk = p.tags.includes("any") || p.tags.some((t) => u.who.includes(t));
    if (!tagOk) return null;
    const incOk = p.who.includes(u.inc);
    if (!incOk && !p.who.includes("high")) return { p, level: "maybe" };
    return { p, level: incOk && (p.tags.includes("any") ? u.inc === "low" : true) ? "likely" : "maybe" };
  }).filter((m): m is Match => !!m)
    .sort((a, b) => (a.level === "likely" ? 0 : 1) - (b.level === "likely" ? 0 : 1) || rank(a.p) - rank(b.p));
}

type Sheet =
  | { k: "details"; id: string; t: "who" | "apply" | "src" }
  | { k: "comments"; id: string; prog: boolean }
  | { k: "compose" }
  | { k: "how" }
  | { k: "review"; only?: string }
  | { k: "change"; id: string };
type Tab = "home" | "crew" | "plan" | "me";

const WHO: [string, string, string][] = [["senior", "seniors", "I'm 65 or older"], ["parent", "childcare", "I'm raising kids"], ["baby", "childcare", "Pregnant or new baby"], ["student", "school", "I'm a student"], ["work", "jobs", "I work"], ["jobloss", "jobs", "I lost my job"], ["disability", "disability", "I have a disability"], ["veteran", "veterans", "I served in the military"]];
const stLbl: Record<string, string> = { queued: "queued", running: "working", ready: "ready for you", done: "done ✓", stopped: "stopped", skipped: "skipped", need_human: "needs you" };
const stCls: Record<string, string> = { running: "run", ready: "ready", done: "done", stopped: "stopped", skipped: "stopped", need_human: "stopped" };
const StPill = ({ s }: { s?: string }) => <span className={"st " + (s ? stCls[s] || "" : "")}>{s ? stLbl[s] || s : "not started"}</span>;
const Spk = () => <>{[[12, 18], [86, 14], [8, 52], [90, 46], [20, 80]].map(([x, y], i) => <i key={i} className="spk" style={{ left: x + "%", top: y + "%", animationDelay: `-${i}s` }} dangerouslySetInnerHTML={{ __html: IC.star }} />)}</>;
const ModeBadge = ({ mode }: { mode: NS.Mode }) => <span className={"mode " + (mode === "live" ? "live" : "")}>{mode === "live" ? "Live · your iPhone" : "Replay"}</span>;

/* ========================================================= */
export default function App() {
  const [u, setU] = useState<U>(() => ({ ...DEF_U, ...store.get("u", {}) }));
  const [s, setS] = useState<SS>(() => ({ ...DEF_S, ...store.get("s", {}) }));
  const [tab, setTab] = useState<Tab>("home");
  const [feedMode, setFeedMode] = useState<"for" | "com">("for");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetOn, setSheetOn] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [onbStep, setOnbStep] = useState<number | null>(() => (store.get<U>("u", DEF_U).done ? null : 0));
  const ns = NS.useNS();
  const toastT = useRef(0);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToastMsg(null), 2300);
  }, []);
  useEffect(() => { NS.onToast(toast); }, [toast]);
  const [sun, setSun] = useState<"" | "on" | "out">("");
  const [ban, setBan] = useState(false);
  useEffect(() => {
    NS.onMorning(() => {
      const done = () => { go("home"); cheer(); setTimeout(() => { setBan(true); setTimeout(() => setBan(false), 7000); }, 350); };
      if (document.documentElement.classList.contains("calm")) { done(); return; }
      setSun("on"); setTimeout(done, 1500); setTimeout(() => setSun("out"), 1900); setTimeout(() => setSun(""), 2500);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const saveU = (p: Partial<U>) => setU((x) => { const n = { ...x, ...p }; store.set("u", n); return n; });
  const saveS = (f: (x: SS) => SS) => setS((x) => { const n = f(x); store.set("s", n); return n; });

  // prefs → document
  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle("night", u.night);
    r.classList.toggle("calm", u.calm);
    r.style.setProperty("--fs", u.big ? "1.1" : "1");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", u.night ? "#0c1124" : "#e4e9f2");
    NS.setCalm(u.calm);
  }, [u.night, u.calm, u.big]);

  // status + deep links (a push opens /?review=1)
  useEffect(() => {
    NS.resume();
    const q = new URLSearchParams(location.search);
    if (q.get("review")) { setTab("home"); openSheet({ k: "review" }); history.replaceState(null, "", import.meta.env.BASE_URL); }
    const t = setInterval(NS.refreshStatus, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSheet = (sh: Sheet) => { setSheet(sh); requestAnimationFrame(() => setSheetOn(true)); };
  const closeSheet = () => { setSheetOn(false); setTimeout(() => setSheet((x) => (sheetOnRef.current ? x : null)), 420); };
  const sheetOnRef = useRef(false);
  sheetOnRef.current = sheetOn;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { closeSheet(); setPlaying(false); stopRead(); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const go = (t: Tab) => { setTab(t); setPlaying(false); stopRead(); };
  const M = useMemo(() => matchesFor(u), [u]);
  const found = M.filter((m) => m.level === "likely").reduce((a, m) => a + mid(m.p), 0);

  const nsAct = (a: string) => {
    if (a === "run") { go("crew"); NS.runNight(); }
    if (a === "stop") NS.stopRun();
    if (a === "review") openSheet({ k: "review" });
    if (a === "voice") briefing();
    if (a === "how") openSheet({ k: "how" });
  };
  const briefing = async () => {
    const r = TASKS.filter((t) => ns.st[t.id] === "ready");
    const text = `Good morning Rosa! While you slept, your crew got ${r.length} things ready. ` + r.map((t) => t.title + ".").join(" ") + " Nothing was sent. Tap review to say yes.";
    const how = await say(text);
    toast(how === "elevenlabs" ? "🔊 Pip's briefing (ElevenLabs)" : how === "device" ? "🔊 Device voice (ElevenLabs not set up yet)" : "Voice isn't available here");
  };

  return (
    <>
      <div id="app">
        <header className="top">
          <I className="me" h={pipLive()} />
          <div className="tabs" style={{ visibility: tab === "home" ? "visible" : "hidden" }}>
            {(["for", "com"] as const).map((f) => (
              <button key={f} aria-pressed={feedMode === f} onClick={() => setFeedMode(f)}>{f === "for" ? "For you" : "Community"}</button>
            ))}
          </div>
          {tab === "home" && (
            <button className="ib" aria-label="Auto-play: read each card and swipe" aria-pressed={playing} onClick={() => { setPlaying(!playing); if (playing) stopRead(); else toast("Auto-play on: I'll read each card and swipe"); }}>
              <I h={playing ? IC.pause : IC.play} style={{ display: "grid" }} />
            </button>
          )}
          <button className="ib" aria-label="How Night Shift works" style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18 }} onClick={() => openSheet({ k: "how" })}>?</button>
          <button className="ib" aria-label="Switch day and night" onClick={() => saveU({ night: !u.night })}><I h={u.night ? IC.sun : IC.moon} style={{ display: "grid" }} /></button>
        </header>
        <main>
          {tab === "home" && (
            <Feed mode={feedMode} u={u} s={s} M={M} ns={ns} playing={playing} setPlaying={setPlaying}
              onAct={nsAct} openSheet={openSheet} toast={toast} saveS={saveS} />
          )}
          {tab === "crew" && <Crew ns={ns} onAct={nsAct} openSheet={openSheet} />}
          {tab === "plan" && <Plan s={s} go={go} openSheet={openSheet} ns={ns} />}
          {tab === "me" && <Me u={u} s={s} M={M} found={found} saveU={saveU} retake={() => setOnbStep(1)} toast={toast} />}
        </main>
        <nav className="nav" aria-label="Main">
          {([["home", "Home", IC.home], ["crew", "Crew", IC.crew], ["plus", "", IC.plus], ["plan", "Plan", IC.plan], ["me", "Me", IC.me]] as const).map(([k, l, ic]) =>
            k === "plus" ? (
              <button key={k} className="plus" aria-label="Share with the community" onClick={() => openSheet({ k: "compose" })}><I h={ic} style={{ display: "grid" }} /></button>
            ) : (
              <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => go(k as Tab)}><I h={ic} style={{ display: "grid" }} />{l}</button>
            ),
          )}
        </nav>
      </div>

      {onbStep !== null && (
        <Onboarding step={onbStep} setStep={setOnbStep} u={u} saveU={saveU} found={matchesFor(u).filter((m) => m.level === "likely").reduce((a, m) => a + mid(m.p), 0)}
          finish={() => { saveU({ done: true }); setOnbStep(null); go("home"); }} />
      )}

      <div className={"scrim" + (sheetOn ? " on" : "")} onClick={closeSheet} />
      <div className={"sheet" + (sheetOn ? " on" : "")} role="dialog" aria-modal="true" tabIndex={-1}>
        <button className="x" aria-label="Close" onClick={closeSheet}>✕</button>
        {sheet?.k === "details" && <Details key={sheet.id + sheet.t} id={sheet.id} t0={sheet.t} />}
        {sheet?.k === "comments" && <Comments id={sheet.id} prog={sheet.prog} s={s} saveS={saveS} toast={toast} />}
        {sheet?.k === "compose" && <Compose toast={toast} onPost={(p) => { saveS((x) => ({ ...x, myPosts: [p, ...x.myPosts] })); closeSheet(); setFeedMode("com"); go("home"); cheer(); toast("Posted! Thanks for helping others"); }} />}
        {sheet?.k === "how" && <How />}
        {sheet?.k === "review" && <Review ns={ns} only={sheet.only} close={closeSheet} go={go} openSheet={openSheet} toast={toast} />}
        {sheet?.k === "change" && <Change id={sheet.id} close={closeSheet} toast={toast} />}
      </div>
      {sun && <div className={"sunrise" + (sun === "out" ? " out" : "")} aria-hidden="true"><div className="sun" /><b>8:00 AM</b><span>Good morning, Rosa</span></div>}
      <button className={"push" + (ban ? " on" : "")} aria-hidden={!ban} tabIndex={ban ? 0 : -1} onClick={() => { setBan(false); openSheet({ k: "review" }); }}>
        <I h={cr("pip")} style={{ display: "contents" }} /><span><b>Benefeed</b><small>now</small><br />🌙 Your crew is done. {NS.readyN()} things are waiting for your yes.</span>
      </button>
      <div className={"toast" + (toastMsg ? " show" : "")} role="status">{toastMsg}</div>
    </>
  );
}

/* ---------- onboarding ---------- */
function Onboarding({ step, setStep, u, saveU, found, finish }: { step: number; setStep: (n: number) => void; u: U; saveU: (p: Partial<U>) => void; found: number; finish: () => void }) {
  const [city, setCity] = useState(u.city);
  const dots = <div className="dots">{[0, 1, 2, 3].map((i) => <i key={i} className={i === step ? "on" : ""} />)}</div>;
  const Say = ({ t }: { t: string }) => <div className="sayrow"><I h={pipLive()} style={{ display: "contents" }} /><span className="say">{t}</span></div>;
  const [crewI, setCrewI] = useState(0);
  const [amt, setAmt] = useState(0);
  useEffect(() => {
    if (step !== 3) return;
    setCrewI(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setCrewI(i);
      if (i > 4) {
        clearInterval(t);
        cheer();
        if (u.calm) { setAmt(found); return; }
        const t0 = performance.now();
        const f = (now: number) => { const k = Math.min(1, (now - t0) / 1100); setAmt(Math.round(found * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); };
        requestAnimationFrame(f);
      }
    }, u.calm ? 120 : 750);
    return () => clearInterval(t);
  }, [step, found, u.calm]);

  let h: ReactNode = null;
  if (step === 0)
    h = <><div className="hello"><span className="say">Hi! I'm Pip 👋</span><I h={pipLive()} style={{ display: "contents" }} /><span className="lbl">benefeed</span><h1 className="h1">You're on Do Not Disturb. Your crew isn't.</h1><p className="note" style={{ maxWidth: "34ch" }}>Tonight, your crew uses your phone to find help you're missing and fill in the boring parts. Nothing is sent until you say yes.</p></div>
      <div className="foot">{dots}<button className="btn wide" onClick={() => setStep(1)}>Find my help</button></div></>;
  if (step === 1)
    h = <><Say t="Which sound like you? Pick any, or skip." /><h2 className="h1">About you</h2>
      <div className="opts">{WHO.map(([k, ic, l]) => <button key={k} className="opt" aria-pressed={u.who.includes(k)} onClick={() => saveU({ who: u.who.includes(k) ? u.who.filter((x) => x !== k) : [...u.who, k] })}><I h={CATS[ic].ic} style={{ display: "contents" }} /><span>{l}</span></button>)}</div>
      <div className="foot">{dots}<button className="btn wide" onClick={() => setStep(2)}>{u.who.length ? "Next" : "Skip"}</button></div></>;
  if (step === 2)
    h = <><Say t="Roughly how much comes in each month?" /><h2 className="h1">Money in</h2>
      <div className="opts one">{([["low", "Under $2,500 a month", "Tight most months"], ["mid", "$2,500 to $5,000", "Getting by"], ["high", "Over $5,000", "Mostly okay"]] as const).map(([k, l, sm]) => <button key={k} className="opt" aria-pressed={u.inc === k} onClick={() => saveU({ inc: k })}><I h={CATS.money.ic} style={{ display: "contents" }} /><span>{l}<small>{sm}</small></span></button>)}</div>
      <label className="lbl" htmlFor="ct">your city</label><input className="inp" id="ct" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" maxLength={60} />
      <div className="foot">{dots}<button className="btn wide" onClick={() => { saveU({ city: city.trim() || "San Jose" }); setStep(3); }}>Send my crew</button></div></>;
  if (step === 3) {
    const rows: [string, string, string][] = [["pip", "Pip", "reading your answers"], ["fern", "Fern", "checking official sites"], ["bun", "Bun", "getting forms ready"], ["nimbus", "Nimbus", "noting deadlines"]];
    const doneAll = crewI > 4;
    h = <><div className="reveal"><I h={pipLive()} style={{ display: "contents" }} /><span className="lbl">your crew is working</span>
      <ul className="work">{rows.map(([k, n, sm], i) => <li key={k} className={(i < crewI ? "on" : "") + (i < crewI - 1 ? " done" : "")}><I h={cr(k)} style={{ display: "contents" }} /><span><b>{n}</b><small>{sm}</small></span><span className="ck">{i < crewI - 1 ? "✓" : ""}</span></li>)}</ul>
      {doneAll && <div style={{ display: "grid", gap: 6, justifyItems: "center" }}><span className="money">{money(amt)}</span><b>a month you may be missing</b><p className="note">Sample estimate.</p></div>}</div>
      <div className="foot">{dots}<button className="btn wide" disabled={!doneAll} style={{ opacity: doneAll ? 1 : 0.5 }} onClick={finish}>Start swiping</button></div></>;
  }
  return <div className="onb"><div className="in">{h}</div></div>;
}

/* ---------- feed ---------- */
type FeedProps = { mode: "for" | "com"; u: U; s: SS; M: Match[]; ns: ReturnType<typeof NS.useNS>; playing: boolean; setPlaying: (b: boolean) => void; onAct: (a: string) => void; openSheet: (s: Sheet) => void; toast: (m: string) => void; saveS: (f: (x: SS) => SS) => void };
function Feed({ mode, u, s, M, ns, playing, setPlaying, onAct, openSheet, toast, saveS }: FeedProps) {
  const ref = useRef<HTMLElement>(null);
  const cur = useRef<Element | null>(null);
  useEffect(() => {
    const f = ref.current!;
    f.scrollTop = 0;
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { e.target.classList.toggle("on", e.isIntersecting); if (e.isIntersecting) cur.current = e.target; }), { root: f, threshold: 0.6 });
    f.querySelectorAll(".vid").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [mode, M.length, s.myPosts.length]);

  // auto-play: read each card, then swipe
  useEffect(() => {
    if (!playing) return;
    let alive = true;
    const stepPlay = () => {
      if (!alive) return;
      const f = ref.current!, v = (cur.current || f.querySelector(".vid")) as HTMLElement;
      const ok = readEls([...v.querySelectorAll<HTMLElement>("[data-r]")], () => {
        if (!alive) return;
        const nx = v.nextElementSibling as HTMLElement | null;
        if (!nx) { setPlaying(false); return; }
        f.scrollTo({ top: nx.offsetTop, behavior: u.calm ? "auto" : "smooth" });
        cur.current = nx;
        setTimeout(stepPlay, 700);
      });
      if (!ok) toast("Read aloud isn't available here");
    };
    stepPlay();
    return () => { alive = false; stopRead(); };
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const like = (id: string, el: Element | null, force = false) => saveS((x) => {
    const has = x.liked.includes(id);
    if (has && !force) return { ...x, liked: x.liked.filter((k) => k !== id) };
    if (!has) { burst(el, IC.heartBig, 6, u.calm); cheer(); return { ...x, liked: [...x.liked, id] }; }
    return x;
  });
  const dbl = (id: string) => {
    let last = 0;
    return (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - last < 320) {
        const v = (e.currentTarget as HTMLElement).closest(".vid")!;
        like(id, v.querySelector('[data-a="like"]'), true);
        const hp = v.querySelector(".heartpop")!; hp.classList.remove("go"); void (hp as HTMLElement).offsetWidth; hp.classList.add("go");
      }
      last = now;
    };
  };
  const cmsOf = (id: string) => (PCOMMENTS[id] || [...s.myPosts, ...CPOSTS].find((c) => c.id === id)?.comments || []).concat(s.myComments[id] || []);
  const share = async (text: string) => {
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text); toast("Copied. Send it to someone who helps you");
    } catch { toast("Couldn't share on this device"); }
  };
  const readCard = (e: React.MouseEvent) => {
    const v = (e.currentTarget as HTMLElement).closest(".vid")!;
    if (!readEls([...v.querySelectorAll<HTMLElement>("[data-r]")])) toast("Read aloud isn't available here");
  };

  const posts = [...s.myPosts, ...CPOSTS];
  return (
    <section className="feed" ref={ref} aria-label="Feed">
      {mode === "for" && <BriefCard ns={ns} onAct={onAct} />}
      {mode === "for" && M.map((m, i) => {
        const p = m.p, c = CATS[p.cat], liked = s.liked.includes(p.id), saved = s.saved.includes(p.id);
        return (
          <article className="vid" key={p.id}>
            <Spk /><span className="count">{i + 1} of {M.length}</span>
            <I className="heartpop" h={IC.heartBig} />
            <div className="stage" onClick={dbl(p.id)}><I h={c.ic} style={{ display: "contents" }} /><span className="sticker">{c.l}</span></div>
            <h2 data-r>{p.t}</h2>
            <span className="amt"><b data-r>about {p.yearly ? <>{money(p.est[0] * 12)}–{money(p.est[1] * 12)}<small> a year</small></> : <>{money(p.est[0])}–{money(p.est[1])}<small> a month</small></>}</b><small>estimate</small></span>
            {i === 0 && <span className="swipehint"><I h={IC.up} style={{ display: "contents" }} /> swipe up</span>}
            <div className="info">
              <div className="who">{p.prog.split(" (")[0]} <I h={IC.check} style={{ display: "contents" }} /> <span className={"pill " + (m.level === "likely" ? "" : "maybe")}>{m.level === "likely" ? "You likely qualify" : "You might qualify"}</span></div>
              <p data-r>{p.what}</p>
              <div className="ctas"><button className="cta" onClick={() => openSheet({ k: "details", id: p.id, t: "apply" })}>How to apply</button><button className="cta ghost" onClick={() => openSheet({ k: "details", id: p.id, t: "src" })}><I h={IC.doc} style={{ display: "contents" }} />Sources</button></div>
            </div>
            <div className="rail">
              <button className="rb" aria-label="Who it's for" onClick={() => openSheet({ k: "details", id: p.id, t: "who" })}><I className="av" h={c.ic} /></button>
              <button className="rb" data-a="like" aria-pressed={liked} aria-label="Helpful" onClick={(e) => like(p.id, e.currentTarget)}><I className="c" h={IC.heart} /><span className="n">{(likesOf(p) + (liked ? 1 : 0)).toLocaleString()}</span></button>
              <button className="rb" aria-label="Comments" onClick={() => openSheet({ k: "comments", id: p.id, prog: true })}><I className="c" h={IC.comment} /><span>{cmsOf(p.id).length + Math.floor(likesOf(p) / 40)}</span></button>
              <button className="rb save" aria-pressed={saved} aria-label="Save to my plan" onClick={(e) => { const el = e.currentTarget; saveS((x) => x.saved.includes(p.id) ? { ...x, saved: x.saved.filter((k) => k !== p.id) } : (burst(el, IC.heartBig, 5, u.calm), cheer(), { ...x, saved: [...x.saved, p.id] })); toast(saved ? "Removed from My plan" : "Saved to My plan"); }}><I className="c" h={IC.save} /><span>Save</span></button>
              <button className="rb" aria-label="Read to me" onClick={readCard}><I className="c" h={IC.listen} /><span>Listen</span></button>
              <button className="rb" aria-label="Send to a helper" onClick={() => share(`${p.t}: ${p.what} Official info: ${p.src[1]}`)}><I className="c" h={IC.send} /><span>Send</span></button>
            </div>
          </article>
        );
      })}
      {mode === "com" && posts.map((c, i) => {
        const w = PEOPLE[c.who] || PEOPLE.me, liked = s.liked.includes(c.id);
        const prog = c.prog ? P.find((x) => x.id === c.prog) : undefined;
        return (
          <article className="vid" key={c.id}>
            <Spk /><span className="count">{i + 1} of {posts.length}</span><I className="heartpop" h={IC.heartBig} />
            <div className="stage" onClick={dbl(c.id)}><I h={cr(c.crit)} style={{ display: "contents" }} /><span className="sticker">{c.kind}</span></div>
            <p className="quote" data-r>“{c.quote}”</p>
            <div className="info">
              <div className="who">{w[0]} <span style={{ fontWeight: 400, color: "var(--soft)" }}>· {w[2]}</span></div><p data-r>{c.text}</p>
              {c.pip && <div className="pipans"><I h={cr("pip")} style={{ display: "contents" }} /><span><b>Pip:</b> {c.pip.text} <button className="cite" aria-label="Open the official source" onClick={() => openSheet({ k: "details", id: c.pip!.prog, t: "apply" })}>1</button></span></div>}
              {prog && <div className="ctas"><button className="cta" onClick={() => openSheet({ k: "details", id: prog.id, t: "apply" })}>See {prog.prog.split(" (")[0]}</button></div>}
            </div>
            <div className="rail">
              <button className="rb" aria-label={w[0]}><I className="av" h={cr(w[1])} /></button>
              <button className="rb" data-a="like" aria-pressed={liked} aria-label="Heart" onClick={(e) => like(c.id, e.currentTarget)}><I className="c" h={IC.heart} /><span className="n">{(c.likes + (liked ? 1 : 0)).toLocaleString()}</span></button>
              <button className="rb" aria-label="Comments" onClick={() => openSheet({ k: "comments", id: c.id, prog: false })}><I className="c" h={IC.comment} /><span>{cmsOf(c.id).length}</span></button>
              <button className="rb" aria-label="Share" onClick={() => share(`“${c.quote}” on Benefeed`)}><I className="c" h={IC.send} /><span>Send</span></button>
            </div>
          </article>
        );
      })}
      <EndCard onTop={() => ref.current?.scrollTo({ top: 0, behavior: u.calm ? "auto" : "smooth" })} />
    </section>
  );
}

function BriefCard({ ns, onAct }: { ns: ReturnType<typeof NS.useNS>; onAct: (a: string) => void }) {
  const r = NS.readyN(), d = NS.doneN();
  if (!ns.brief && !Object.keys(ns.st).length)
    return (
      <article className="vid">
        <Spk /><span className="count">tonight</span>
        <div className="stage"><I h={cr("nimbus")} style={{ display: "contents" }} /><span className="sticker">Night shift</span></div>
        <h2>Your crew works your phone tonight</h2>
        <span className="nsb">🌙 Night shift: on · 1:00 AM</span>
        <p className="note" style={{ textAlign: "center", maxWidth: "30ch", marginTop: 10 }}>They fill in forms, add deadlines and draft texts. Then they stop before anything final and wait for your yes.</p>
        <div className="info"><div className="who">PhoneUse · your iPhone <ModeBadge mode={ns.mode} /></div>
          <div className="ctas"><button className="cta" onClick={() => onAct("run")}>▶ Watch it now</button><button className="cta ghost" onClick={() => onAct("how")}>How it works</button></div></div>
      </article>
    );
  return (
    <article className="vid">
      <Spk /><span className="count">good morning</span>
      <div className="stage" style={{ width: "min(150px,38vw)" }}><I h={pipLive()} style={{ display: "contents" }} /><span className="sticker">While you slept</span></div>
      <h2 style={{ fontSize: "calc(24px*var(--fs))" }}>{r ? `Your crew got ${r} thing${r > 1 ? "s" : ""} ready` : d ? "All done. Nice work, Rosa!" : "Last night's run"}</h2>
      <div className="brf">{TASKS.map((t) => <div className="brow" key={t.id}><I h={cr(t.ag)} style={{ display: "contents" }} /><span>{t.title}</span><StPill s={ns.st[t.id]} /></div>)}</div>
      <div className="info"><div className="who"><I h={IC.check} style={{ display: "contents" }} /> Nothing was sent without you <ModeBadge mode={ns.mode} /></div>
        <div className="ctas">{r > 0 && <button className="cta" onClick={() => onAct("review")}>Review &amp; say yes</button>}<button className="cta ghost" onClick={() => onAct("voice")}><I h={IC.listen} style={{ display: "contents" }} /> Briefing</button><button className="cta ghost" onClick={() => onAct("run")}>Run again</button></div></div>
    </article>
  );
}

function EndCard({ onTop }: { onTop: () => void }) {
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toDataURL(location.origin + import.meta.env.BASE_URL, { margin: 1, width: 300, color: { dark: "#3e3b4f", light: "#ffffff" } }).then(setQr).catch(() => {}); }, []);
  return (
    <article className="vid">
      <Spk /><div className="stage"><I h={cr("nimbus")} style={{ display: "contents" }} /></div>
      <h2>You're all caught up</h2>
      <p className="note" style={{ textAlign: "center", maxWidth: "30ch" }}>Nimbus checks official sites every week and tells you what changes.</p>
      {qr && <div className="qr" style={{ marginTop: 10 }}><img src={qr} alt="QR code to open Benefeed on your phone" /><small className="note">Open it on your phone</small></div>}
      <button className="cta" style={{ marginTop: 14 }} onClick={onTop}>Back to the top</button>
    </article>
  );
}

/* ---------- sheets ---------- */
function Details({ id, t0 }: { id: string; t0: "who" | "apply" | "src" }) {
  const [t, setT] = useState(t0);
  const [quote, setQuote] = useState(false);
  const [src, setSrc] = useState<Src | null>(null);
  useEffect(() => { loadSources().then((m) => setSrc(m[id] || null)); }, [id]);
  const p = P.find((x) => x.id === id);
  if (!p) return null;
  const ap = p.apply || ["Go to the official site", p.src[1]], two = !!p.apply && p.apply[1] !== p.src[1];
  return (
    <>
      <h3>{p.prog}</h3>
      <div className="stabs">{(["who", "apply", "src"] as const).map((k) => <button key={k} aria-pressed={t === k} onClick={() => setT(k)}>{k === "who" ? "Who it's for" : k === "apply" ? "How to apply" : "Sources"}</button>)}</div>
      <div onClick={(e) => { if ((e.target as HTMLElement).closest(".cite")) setT("src"); }}>
        {t === "who" && <div className="sec"><ul>{(p.whoFor || [p.rule]).map((w) => <li key={w} data-r>{w}<span className="cite">1</span></li>)}</ul><div className="why"><b>Why it showed up for you:</b> {p.rule}</div></div>}
        {t === "apply" && <div className="sec"><ol>{(p.steps || []).map((x) => <li key={x} data-r>{x}<span className="cite">{two ? 2 : 1}</span></li>)}</ol><div className="why"><b>Bring:</b> {p.docs.join(", ")}</div><a className="applyb" href={ap[1]} target="_blank" rel="noopener">{ap[0]} ↗</a><p className="note">Real programs never charge to apply.</p></div>}
        {t === "src" && <div className="sec"><p style={{ margin: 0 }}>Every fact on this card comes from these official pages.</p>
          <div className="src"><span className="n">1</span><div><a href={p.src[1]} target="_blank" rel="noopener">{p.src[0]} ↗</a><small>{dom(p.src[1])} · official program page</small></div></div>
          {two && <div className="src"><span className="n">2</span><div><a href={p.apply![1]} target="_blank" rel="noopener">{p.apply![0]} ↗</a><small>{dom(p.apply![1])} · how to apply</small></div></div>}
          <div className="why"><b>Checked by Fern via Tavily</b> · official domains only · {src ? new Date(src.fetchedAt * 1000).toLocaleDateString() : "sample until Fern's first check"}. {quote ? <><br /><small>{src ? <>“{src.quote}” <a href={src.url} target="_blank" rel="noopener">{dom(src.url)} ↗</a></> : "The saved quote appears here after Fern checks this page."}</small></> : <button className="cite" style={{ width: "auto", padding: "0 8px" }} onClick={() => setQuote(true)}>Show the quote</button>}</div></div>}
      </div>
    </>
  );
}

function Comments({ id, prog, s, saveS, toast }: { id: string; prog: boolean; s: SS; saveS: (f: (x: SS) => SS) => void; toast: (m: string) => void }) {
  const [v, setV] = useState("");
  const list = (PCOMMENTS[id] || [...s.myPosts, ...CPOSTS].find((c) => c.id === id)?.comments || []).concat(s.myComments[id] || []);
  return (
    <>
      <h3>{list.length} comments</h3>
      {prog && <div className="cm pin"><I className="av" h={cr("pip")} /><div><b>Pip <span className="got" style={{ background: "var(--cream)", color: "var(--accent)" }}>pinned</span></b><p>Official facts are in "How to apply" and "Sources". Comments are members' own experiences, not official advice.</p></div></div>}
      <div style={{ display: "grid", gap: 14 }}>
        {list.length ? list.map(([who, text, likes, got], i) => {
          const p = PEOPLE[who] || PEOPLE.me, key = id + ":" + i, lk = s.clikes.includes(key);
          return <div className="cm" key={key}><I className="av" h={cr(p[1])} /><div><b>{p[0]} <small style={{ fontWeight: 400, color: "var(--soft)" }}>{p[2]}</small>{got && <span className="got">got this benefit</span>}</b><p>{text}</p>
            <div className="meta"><button aria-pressed={lk} onClick={(e) => { const el = e.currentTarget; saveS((x) => lk ? { ...x, clikes: x.clikes.filter((k) => k !== key) } : (burst(el, IC.heartBig, 4), { ...x, clikes: [...x.clikes, key] })); }}>♥ Helpful {likes + (lk ? 1 : 0)}</button><button onClick={() => setV("@" + p[0] + " ")}>Reply</button></div></div></div>;
        }) : <p className="note">No comments yet. Share how it went for you!</p>}
      </div>
      <form className="reply" onSubmit={(e) => {
        e.preventDefault(); const t = v.trim(); if (!t) return;
        const bad = piiProblem(t); if (bad) { toast(bad); return; }
        saveS((x) => ({ ...x, myComments: { ...x.myComments, [id]: [...(x.myComments[id] || []), ["me", t.slice(0, 500), 0, false]] } }));
        setV(""); cheer(); toast("Posted. Thanks for helping!");
      }}>
        <input className="inp" value={v} onChange={(e) => setV(e.target.value)} placeholder="Share a tip or ask a question…" aria-label="Write a comment" autoComplete="off" maxLength={500} />
        <button className="btn" style={{ minHeight: 54, padding: "0 16px" }} aria-label="Post comment"><I h={IC.send} style={{ display: "grid" }} /></button>
      </form>
      <p className="note">Be kind. Never share your Social Security number, case number, phone number or address.</p>
    </>
  );
}

function Compose({ onPost, toast }: { onPost: (p: Post) => void; toast: (m: string) => void }) {
  const [kind, setKind] = useState("Question");
  const [q, setQ] = useState(""), [t, setT] = useState("");
  return (
    <>
      <h3>Share with the community</h3>
      <div className="wrap">{["Question", "Win", "Tip"].map((k) => <button key={k} className="chip" aria-pressed={k === kind} onClick={() => setKind(k)}>{k}</button>)}</div>
      <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Headline (e.g. Got approved for CalFresh!)" aria-label="Headline" maxLength={120} />
      <textarea className="inp" value={t} onChange={(e) => setT(e.target.value)} placeholder="Tell your story or ask your question…" aria-label="Details" maxLength={1000} />
      <p className="note">Never post your Social Security number, case number, phone number or address.</p>
      <button className="btn wide" onClick={() => {
        const qq = q.trim(), tt = t.trim();
        if (!qq) { toast("Add a headline first"); return; }
        const bad = piiProblem(qq + " " + tt); if (bad) { toast(bad); return; }
        onPost({ id: "m" + Date.now(), who: "me", kind, crit: "pip", quote: qq, text: tt || qq, likes: 0, comments: [] });
      }}>Post</button>
    </>
  );
}

function How() {
  return (
    <>
      <h3>How Night Shift works</h3>
      <div className="sec"><ol>
        <li><b>You answer 3 questions.</b> No account. No SSN, ever.</li>
        <li><b>Fern checks official pages</b> with Tavily and saves the exact quote behind every fact.</li>
        <li><b>At night, the crew uses your phone</b> through PhoneUse: Safari, Calendar, Messages. You can watch live.</li>
        <li><b>They stop before anything final.</b> Submit, Send and Add wait for you. That's a rule in code (a LangGraph pause), not a promise.</li>
        <li><b>In the morning, one card.</b> Hear it (ElevenLabs), swipe the filmstrip, say yes. Every step is traced in LangSmith.</li>
      </ol></div>
      <table className="cmp2"><tbody>
        <tr><th></th><th>Benefits websites</th><th>A chatbot</th><th>Benefeed</th></tr>
        <tr><td>Finds what you qualify for</td><td>~</td><td>~</td><td className="y">✓</td></tr>
        <tr><td>Fills in the forms for you</td><td>✗</td><td>✗</td><td className="y">✓</td></tr>
        <tr><td>Works in your real apps</td><td>✗</td><td>✗</td><td className="y">✓</td></tr>
        <tr><td>Waits for your yes</td><td>n/a</td><td>✗</td><td className="y">✓</td></tr>
        <tr><td>Official sources on every fact</td><td>✓</td><td>✗</td><td className="y">✓</td></tr>
      </tbody></table>
      <p className="note">Live runs use your real iPhone and a practice portal, not a real agency. When the phone is offline you see a replay. Amounts are estimates.</p>
    </>
  );
}

function Review({ ns, only, close, go, openSheet, toast }: { ns: ReturnType<typeof NS.useNS>; only?: string; close: () => void; go: (t: Tab) => void; openSheet: (s: Sheet) => void; toast: (m: string) => void }) {
  const list = TASKS.filter((t) => (only ? t.id === only : true));
  return (
    <>
      <h3>Say yes, change, or skip</h3>
      <p className="note" style={{ margin: 0 }}>Swipe each filmstrip to see exactly what your crew did on your phone. <ModeBadge mode={ns.mode} /></p>
      {list.map((t) => {
        const frames = ns.film[t.id]?.length ? ns.film[t.id] : t.steps.map((s) => ({ screen: { mock: [s[0], s[1]] as [string, Record<string, unknown>] }, text: s[2] }));
        const ready = ns.st[t.id] === "ready";
        return (
          <div className="task" key={t.id}>
            <div className="th"><I h={cr(t.ag)} style={{ display: "contents" }} /><div><b>{t.title}</b><small>{AG[t.ag][0]} · {t.app} · {t.sub}</small></div></div>
            <div className="film">{frames.map((f, i) => <div key={i}><Phone screen={f.screen} sm /><span>{i + 1}. {f.text}</span></div>)}</div>
            {t.need && <div className="need">{t.need}</div>}
            <div className="acts">
              {ready ? <>
                <Hold label={`Hold to ${t.stop.toLowerCase()}`} onDone={() => { close(); go("crew"); NS.decide(t.id, true); }} />
                <button className="btn ghost" onClick={() => openSheet({ k: "change", id: t.id })}>Change</button>
                <button className="btn ghost" onClick={() => { NS.decide(t.id, false); close(); }}>Skip</button>
              </> : <StPill s={ns.st[t.id]} />}
              {ns.trace[t.id] ? <a className="mini" href={ns.trace[t.id]!} target="_blank" rel="noopener">See trace ↗</a>
                : <button className="mini" onClick={() => toast(ns.mode === "live" ? "The LangSmith trace link appears when the run is traced" : "Replay: traces exist for live runs only")}>See trace ↗</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Change({ id, close, toast }: { id: string; close: () => void; toast: (m: string) => void }) {
  const [v, setV] = useState("");
  const t = TASKS.find((x) => x.id === id)!;
  return (
    <>
      <h3>What should {AG[t.ag][0]} change?</h3>
      <textarea className="inp" value={v} onChange={(e) => setV(e.target.value)} maxLength={300} placeholder="e.g. Best time to call is afternoons" aria-label="What to change" />
      <p className="note">{AG[t.ag][0]} redoes this one and stops again before the final tap.</p>
      <button className="btn wide" onClick={() => {
        const bad = piiProblem(v); if (bad) { toast(bad); return; }
        if (!v.trim()) { toast("Tell Pip what to change first"); return; }
        NS.decide(id, false, v.trim()); close(); toast(`${AG[t.ag][0]} will redo it`);
      }}>Send to {AG[t.ag][0]}</button>
    </>
  );
}

/* ---------- crew ---------- */
function Crew({ ns, onAct, openSheet }: { ns: ReturnType<typeof NS.useNS>; onAct: (a: string) => void; openSheet: (s: Sheet) => void }) {
  const busy = ns.on, r = NS.readyN();
  return (
    <section className="view" aria-label="Crew">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
        <div><span className="lbl">night shift</span><h1 className="h1">{busy ? "Your crew is on your phone" : ns.brief ? "Waiting for your yes" : "Your crew"}</h1></div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}><span className="nsb">🌙 DND on</span><ModeBadge mode={ns.mode} /></div>
      </div>
      <div className="crewrow">{Object.entries(AG).map(([k, a]) => <span key={k} className={ns.agent === k ? "on" : ""}><I h={cr(k)} style={{ display: "contents" }} />{a[0]}<small style={{ fontWeight: 400 }}>{a[1]}</small></span>)}</div>
      <div className="phone-wrap"><Phone screen={ns.cur} badge={ns.mode === "live" ? "via PhoneUse · iPhone" : ns.source === "recording" ? "Replay of a real PhoneUse run" : "Replay · demo run"} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {busy ? <button className="btn red wide" onClick={() => onAct("stop")}>■ Stop everything</button>
          : <><button className="btn" onClick={() => onAct("run")}>▶ Run night shift now</button>{r > 0 && <button className="btn ghost" onClick={() => openSheet({ k: "review" })}>Review ({r})</button>}</>}
      </div>
      <div className="card"><b>Tonight's jobs</b>{TASKS.map((t) => <div className="row" key={t.id} style={{ gridTemplateColumns: "44px 1fr auto" }}><I className="ic" style={{ width: 44, height: 44 }} h={cr(t.ag).replace("<svg", '<svg style="width:38px;height:38px"')} /><div><b>{t.title}</b><small>{t.app} · stops at “{t.stop}”</small></div><StPill s={ns.st[t.id]} /></div>)}</div>
      <div className="card"><b>What happened, in plain words</b>
        <div className="log" style={{ marginTop: 8 }} aria-live="polite">{ns.log.length ? ns.log.map((l, i) => <div key={ns.log.length - i} className={"lg" + (l.stop ? " stop" : "") + (i === 0 && busy ? " new" : "")}><I h={cr(l.ag)} style={{ display: "contents" }} /><span>{l.stop ? "🔒 " : ""}{l.text}</span><small>{l.at}</small></div>) : <p className="note">Tap “Run night shift now” to watch your crew use the phone.</p>}</div></div>
      <div className="card"><b>Who does what</b><div className="prt" style={{ marginTop: 8 }}>
        <b>Hands</b><span>PhoneUse <small>· taps, types and reads your iPhone</small></span>
        <b>Brain</b><span>LangGraph + Claude <small>· pauses before every final tap</small></span>
        <b>Eyes</b><span>Tavily <small>· {ns.pages} official pages checked</small></span>
        <b>Voice</b><span>ElevenLabs <small>· morning briefing and voice notes</small></span>
        <b>Receipts</b><span>LangSmith <small>· {ns.runs} runs, {ns.steps} steps traced</small></span>
        <b>Home</b><span>Replit <small>· open it on any phone</small></span>
      </div></div>
      <div className="card"><p className="note" style={{ margin: 0 }}><b>Safety, in code:</b> the crew can't tap Submit, Send, Pay or Delete without your yes. It only opens Safari, Calendar and Messages. Text on a web page is never treated as an order. Stop works anytime.</p></div>
    </section>
  );
}

/* ---------- plan + me ---------- */
function Plan({ s, go, openSheet, ns }: { s: SS; go: (t: Tab) => void; openSheet: (s: Sheet) => void; ns: ReturnType<typeof NS.useNS> }) {
  const list = P.filter((p) => s.saved.includes(p.id)), tot = list.reduce((a, p) => a + mid(p), 0);
  return (
    <section className="view" aria-label="My plan">
      <div><span className="lbl">my plan</span><h1 className="h1">{list.length ? `${list.length} saved, about ${money(tot)} a month` : "Nothing saved yet"}</h1></div>
      {NS.readyN() > 0 && <button className="card" style={{ textAlign: "left", display: "flex", gap: 12, alignItems: "center" }} onClick={() => openSheet({ k: "review" })}><I h={pipLive()} style={{ width: 54, height: 54, flex: "none" }} /><span><b>{NS.readyN()} things are waiting for your yes</b><small className="note" style={{ display: "block" }}>Tap to review what your crew did</small></span></button>}
      {ns.st.calfresh === "done" && <div className="card row" style={{ gridTemplateColumns: "52px 1fr" }}><I className="ic" h={cr("bun")} /><div><b>CalFresh: short phone interview</b><small>Next step after the practice submit</small></div></div>}
      {list.length ? <>
        <div className="card">{list.map((p) => <div className="row" key={p.id}><I className="ic" h={CATS[p.cat].ic} /><div><b>{p.t}</b><small>Next: {(p.steps || ["Read the official page"])[0]}</small></div><button className="mini" onClick={() => openSheet({ k: "details", id: p.id, t: "apply" })}>Apply</button></div>)}</div>
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}><I h={cr("nimbus").replace("<svg", '<svg style="width:54px;height:54px;flex:none"')} style={{ display: "contents" }} /><p style={{ margin: 0 }}><b>Nimbus is watching your deadlines.</b> You'll get a nudge before renewals.</p></div>
      </> : <div className="empty"><I h={cr("bun")} style={{ display: "contents" }} /><p className="note">Tap Save on any card and it lands here. Bun will help you apply.</p><button className="btn ghost" onClick={() => go("home")}>Back to swiping</button></div>}
    </section>
  );
}

function A2HS() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
  if (!ios || standalone) return null;
  return (
    <div className="card a2hs"><I h={pipLive()} style={{ width: 44, height: 44 }} /><p style={{ margin: 0 }}><b>Add Benefeed to your Home Screen</b><br /><small className="note">Tap <I h={IC.share} style={{ display: "inline-block", width: 16, height: 16, verticalAlign: -3 }} /> Share, then “Add to Home Screen”. iPhone needs this for the morning notification.</small></p></div>
  );
}

function Me({ u, s, M, found, saveU, retake, toast }: { u: U; s: SS; M: Match[]; found: number; saveU: (p: Partial<U>) => void; retake: () => void; toast: (m: string) => void }) {
  return (
    <section className="view" aria-label="Me">
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}><I h={pipLive()} style={{ width: 84, height: 84, flex: "none" }} /><div><h1 className="h1" style={{ fontSize: 22 }}>Your profile</h1><p className="note">{u.city}</p></div></div>
      <A2HS />
      <button className="btn ghost" onClick={async () => toast(await enablePush())}>🌙 Turn on the morning notification</button>
      <div className="card stat3"><div><b>{M.length}</b><small>matches</small></div><div><b>{s.saved.length}</b><small>saved</small></div><div><b>{money(found)}</b><small>/month found</small></div></div>
      <div className="card set">
        {([["night", "Night mode", "Navy, easy on the eyes"], ["big", "Bigger text", "Easier to read"], ["calm", "Calm mode", "No animations"]] as const).map(([k, l, sm]) =>
          <label key={k}>{l}<small>{sm}</small><input type="checkbox" checked={u[k]} onChange={(e) => saveU({ [k]: e.target.checked } as Partial<U>)} /></label>)}
      </div>
      <div className="card"><p className="note" style={{ margin: 0 }}>Program info is general and amounts are estimates. Always confirm on the official source. Community members are sample people. Real programs never charge to apply. The demo uses a test persona: Rosa, 68, San Jose.</p></div>
      <button className="btn ghost" onClick={async () => {
        try { await fetch("/api/erase", { method: "POST" }); } catch { /* offline */ }
        try { Object.keys(localStorage).filter((k) => k.startsWith("bfns_")).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
        toast("Everything erased, including screenshots"); setTimeout(() => location.reload(), 900);
      }}>Erase everything</button>
      <button className="btn ghost" onClick={retake}>Retake the quiz</button>
    </section>
  );
}

/** Hold-to-approve: a final tap needs a deliberate 1.2 s press, so a stray tap can't submit anything. */
function Hold({ label, onDone }: { label: string; onDone: () => void }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const start = () => {
    const t0 = performance.now();
    const f = (now: number) => {
      const k = Math.min(1, (now - t0) / 1200);
      setP(k);
      if (k >= 1) { navigator.vibrate?.(30); cheer(); onDone(); return; }
      raf.current = requestAnimationFrame(f);
    };
    raf.current = requestAnimationFrame(f);
  };
  const cancel = () => { cancelAnimationFrame(raf.current); setP(0); };
  return (
    <button className="btn hold" style={{ ["--p" as string]: p }} aria-label={label + " (press and hold)"}
      onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDone(); } }}>
      {p > 0 && p < 1 ? "Keep holding…" : label}
    </button>
  );
}

type Src = { url: string; quote: string; fetchedAt: number };
let srcCache: Promise<Record<string, Src>> | null = null;
const loadSources = (): Promise<Record<string, Src>> => (srcCache ||= fetch("/api/sources").then((r) => (r.ok ? r.json() : {})).catch(() => ({}))) as Promise<Record<string, Src>>;

async function enablePush(): Promise<string> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "On iPhone, add Benefeed to your Home Screen first";
    if ((await Notification.requestPermission()) !== "granted") return "Notifications are off";
    const { key } = await (await fetch("/api/push/key")).json();
    const raw = Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((key.length + 2) % 4 || 2)), (c) => c.charCodeAt(0));
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    return "Done. Your crew will ping you in the morning";
  } catch { return "Couldn't turn on notifications here"; }
}
