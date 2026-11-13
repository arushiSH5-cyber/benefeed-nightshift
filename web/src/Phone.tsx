// The phone frame. Live: the real iPhone screenshot from PhoneUse. Replay/demo: the simulated screens.
import { APPS } from "./data";
import type { Screen } from "./nightshift";

const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tap = `<span class="tapdot" style="left:50%;top:50%"></span>`;
const lock = `<span class="lock">🔒 waiting for your yes</span>`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scr(k: string, d: any = {}) {
  const top = `<span class="clock">1:12</span><span class="dnd" title="Do Not Disturb">🌙</span>`;
  let h = "";
  if (k === "home")
    h = `<div class="apps">${APPS.map((a, i) => `<div class="app ${d.hit === i ? "hit" : ""}"><i style="background:${a[2]}"><span>${a[1]}</span></i>${a[0]}${d.hit === i ? `<span class="tapdot" style="left:50%;top:2.1em"></span>` : ""}</div>`).join("")}</div><p style="margin:auto 0 0;text-align:center;font-size:.9em;color:#7a7686">Do Not Disturb is on · the crew is working</p>`;
  if (k === "form")
    h = `<div class="purl">🔒 practice portal</div><div class="pban">PRACTICE PORTAL · NOT A REAL AGENCY</div><h5>${d.h === "Review" ? "Review &amp; submit" : esc(d.h)}</h5>${(d.f as [string, string, number?][]).map(([l, v, n]) => `<div class="pf ${v ? "" : "empty"} ${n === 2 ? "warn" : ""} ${n === 1 ? "new" : ""}"><small>${esc(l)}</small><b>${esc(v || "—")}</b></div>`).join("")}<div class="pbtn ${d.stop ? "stop" : ""}">${d.stop ? lock : ""}${esc(d.btn)}${d.tap ? tap : ""}</div>`;
  if (k === "cal")
    h = `<h5>December</h5><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:.3em;text-align:center;font-size:.85em;color:#7a7686">${"SMTWTFS".split("").map((x) => `<span>${x}</span>`).join("")}${Array.from({ length: 14 }, (_, i) => `<b style="color:#3e3b4f;${i === 1 ? "background:#6f84b4;color:#fff;border-radius:50%" : ""}">${i || ""}</b>`).join("")}</div>${(d.ev as [string, string, number?][]).map(([t, w, dr]) => `<div class="cev ${dr ? "draft" : ""}"><span><b>${esc(t)}</b><small>${esc(w)}</small></span></div>`).join("")}${d.btn ? `<div class="pbtn ${d.stop ? "stop" : ""}">${d.stop ? lock : ""}${esc(d.btn)}${d.tap ? tap : ""}</div>` : `<p style="margin:auto 0 0;text-align:center;font-weight:700;color:#5e6d3d">✓ 2 events saved</p>`}`;
  if (k === "msg")
    h = `<div style="text-align:center"><div style="width:3.4em;height:3.4em;border-radius:50%;background:#e6e2c6;margin:0 auto;display:grid;place-items:center;font-weight:700">M</div><b>Maria</b><div style="font-size:.85em;color:#7a7686">helper · daughter</div></div><div style="display:flex;flex-direction:column;gap:.5em">${d.sent ? `<div class="bub me">${esc(d.sent)}</div>${d.vn ? `<div class="bub vn">▶ 0:14 voice note</div>` : ""}<small style="align-self:flex-end;color:#7a7686">Delivered</small>` : ""}</div>${d.sent ? "" : `<div class="pin"><div>${esc(d.draft)}${d.vn ? `<br><b>▶ 0:14 voice note</b>` : ""}</div><span class="send" style="${d.stop ? "box-shadow:0 0 0 .25em #fffdf8,0 0 0 .5em #df8f8f" : ""}">↑${d.tap ? tap : ""}</span></div>${d.stop ? `<div class="pban" style="background:#3e3b4f;color:#fff">🔒 Send waits for your yes</div>` : ""}`}`;
  if (k === "done")
    h = `<div class="purl">🔒 practice portal</div><div class="pdone"><i>✓</i><h5>${esc(d.h)}</h5><p style="margin:0">${esc(d.t)}</p></div>`;
  if (k === "idle")
    h = `<div class="pdone"><span style="font-size:3em">🌙</span><h5>Do Not Disturb</h5><p style="margin:0;color:#7a7686">Your phone is resting. Your crew isn't.</p></div>`;
  return top + h;
}

export function Phone({ screen, sm, badge }: { screen: Screen; sm?: boolean; badge?: string }) {
  const body =
    "shot" in screen ? (
      <div className="ps shot"><img src={screen.shot} alt="Screenshot of the iPhone" loading="lazy" /></div>
    ) : (
      <div className="ps" dangerouslySetInnerHTML={{ __html: scr(screen.mock[0], screen.mock[1]) }} />
    );
  return (
    <div className={"phone" + (sm ? " sm" : "")}>
      {body}
      {badge && <span className="viabadge">{badge}</span>}
    </div>
  );
}
