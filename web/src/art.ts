// Crew stickers, category icons and line icons as SVG strings.
// Only white, butter and periwinkle fills; ink outlines.
export const INK = "#45405a";
const W = "#ffffff", B = "#e9e5c9", PV = "#d8e0ee";

const E = (x: number, y: number, g = 11, r = 2.6) =>
  `<circle cx="${x - g / 2}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + g / 2}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x - g / 2 + 0.9}" cy="${y - 0.9}" r=".8" fill="#fff"/><circle cx="${x + g / 2 + 0.9}" cy="${y - 0.9}" r=".8" fill="#fff"/>`;
const C = (x: number, y: number, g = 22) =>
  `<ellipse cx="${x - g / 2}" cy="${y}" rx="4" ry="2.5" fill="#efb5b5" opacity=".75"/><ellipse cx="${x + g / 2}" cy="${y}" rx="4" ry="2.5" fill="#efb5b5" opacity=".75"/>`;
const M = (x: number, y: number) =>
  `<path d="M${x - 2.4} ${y}q1.2 1.8 2.4 0q1.2 1.8 2.4 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
const SV = (i: string) =>
  `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${i}</g></svg>`;
const blob = (fill: string, deco = "") =>
  SV(`<path d="M32 12c12 0 21 8 21 21 0 12-9 19-21 19s-21-7-21-19c0-13 9-21 21-21z" fill="${fill}"/>${deco}${E(32, 32, 12, 2.4)}${C(32, 38, 24)}${M(32, 37)}`);

const CR: Record<string, () => string> = {
  pip: () => SV(`<path d="M32 14c13 0 22 9 22 21 0 11-9 17-22 17S10 46 10 35c0-12 9-21 22-21z" fill="#fff"/><path d="M11 42c2-5 6-8 10-7-1 5-4 9-10 10zM53 42c-2-5-6-8-10-7 1 5 4 9 10 10z" fill="#e6e4ea" stroke-width="1.6"/><path d="M27 52l-1 5M37 52l1 5" fill="none" stroke-width="1.8"/>${E(32, 32, 10, 2.4)}<path d="M30.6 36.2h2.8l-1.4 1.8z" fill="${INK}" stroke-width="1"/>${C(32, 38, 22)}`),
  fern: () => SV(`<path d="M12 46c0-14 8-26 20-26s20 12 20 26c0 6-6 8-20 8s-20-2-20-8z" fill="#e4e7cd"/><circle cx="22" cy="22" r="7" fill="#e4e7cd"/><circle cx="42" cy="22" r="7" fill="#e4e7cd"/><circle cx="22" cy="22" r="2.8" fill="${INK}" stroke="none"/><circle cx="42" cy="22" r="2.8" fill="${INK}" stroke="none"/><path d="M24 38q8 7 16 0" fill="#f2c9c9" stroke-width="2"/>${C(32, 33, 30)}`),
  bun: () => SV(`<path d="M22 22c-3-12 1-16 5-15s4 9 3 15M42 22c3-12-1-16-5-15s-4 9-3 15" fill="${W}"/><path d="M12 40c0-12 9-20 20-20s20 8 20 20c0 9-8 14-20 14s-20-5-20-14z" fill="${W}"/>${E(32, 37, 13)}${C(32, 43, 26)}${M(32, 42)}`),
  nimbus: () => SV(`<path d="M16 46h32a9 9 0 0 0 1-18 14 14 0 0 0-27-3 10 10 0 0 0-6 21z" fill="${W}"/>${E(32, 35, 12)}${C(32, 40, 24)}${M(32, 40)}`),
  bear: () => SV(`<circle cx="17" cy="21" r="7" fill="${B}"/><circle cx="47" cy="21" r="7" fill="${B}"/><path d="M32 16c12 0 21 8 21 20 0 11-9 18-21 18s-21-7-21-18c0-12 9-20 21-20z" fill="${B}"/><ellipse cx="32" cy="40" rx="7" ry="5" fill="#fff" stroke-width="1.8"/>${E(32, 33, 14)}${C(32, 40, 30)}<path d="M30.5 39h3l-1.5 1.8z" fill="${INK}" stroke-width="1.2"/>`),
  fox: () => SV(`<path d="M14 14l12 8-8 8zM50 14l-12 8 8 8z" fill="${B}"/><path d="M32 20c12 0 20 8 20 18 0 10-9 16-20 16s-20-6-20-16c0-10 8-18 20-18z" fill="${B}"/><path d="M22 42c4 7 16 7 20 0-3-3-7-4-10-4s-7 1-10 4z" fill="#fff" stroke-width="1.8"/>${E(32, 35, 14)}<circle cx="32" cy="41" r="1.6" fill="${INK}"/>${C(32, 40, 30)}`),
  cat: () => SV(`<path d="M14 16l12 8-10 6zM50 16l-12 8 10 6z" fill="${PV}"/><path d="M32 20c12 0 20 8 20 18 0 10-9 16-20 16s-20-6-20-16c0-10 8-18 20-18z" fill="${PV}"/>${E(32, 35, 14)}${C(32, 41, 30)}${M(32, 40)}`),
  chick: () => SV(`<path d="M32 12c12 0 21 10 21 23 0 12-9 19-21 19s-21-7-21-19c0-13 9-23 21-23z" fill="${B}"/><path d="M29 33h6l-3 3.6z" fill="#f5b06a" stroke-width="1.6"/>${E(32, 29, 13)}${C(32, 36, 26)}`),
};
export const cr = (k: string) => (CR[k] || CR.pip)();

export const CATS: Record<string, { l: string; ic: string }> = {
  food: { l: "Food", ic: blob(B, `<path d="M22 14c2-5 8-6 10-2 2-4 8-3 10 2" fill="#e4e7cd"/>`) },
  health: { l: "Health", ic: blob(W, `<path d="M32 16v8M28 20h8" stroke="#d98a8a" stroke-width="3"/>`) },
  money: { l: "Money", ic: blob(B, `<path d="M32 15v6M29 17.5h5a2 2 0 0 1 0 4h-4" fill="none" stroke="${INK}" stroke-width="2"/>`) },
  housing: { l: "Housing", ic: SV(`<path d="M12 30 32 12l20 18v22H12z" fill="${PV}"/><path d="M27 52V41a5 5 0 0 1 10 0v11" fill="${B}"/>${E(32, 30, 12, 2.4)}${C(32, 35, 22)}`) },
  utilities: { l: "Bills", ic: blob(PV, `<path d="M35 9l-7 10h6l-4 9" fill="none" stroke="${INK}" stroke-width="2.4"/>`) },
  childcare: { l: "Kids", ic: SV(`<circle cx="32" cy="34" r="18" fill="${W}"/><circle cx="32" cy="15" r="3" fill="${B}"/>${E(32, 33, 12, 2.4)}${C(32, 39, 24)}${M(32, 38)}`) },
  rides: { l: "Rides", ic: SV(`<rect x="10" y="16" width="44" height="30" rx="9" fill="${PV}"/><path d="M10 30h44M18 46v5M46 46v5"/>${E(32, 23, 12, 2.2)}<circle cx="19" cy="38" r="3" fill="${INK}"/><circle cx="45" cy="38" r="3" fill="${INK}"/>`) },
  jobs: { l: "Jobs", ic: SV(`<rect x="10" y="20" width="44" height="30" rx="7" fill="${B}"/><path d="M24 20v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5"/>${E(32, 33, 12, 2.4)}${C(32, 39, 24)}${M(32, 38)}`) },
  school: { l: "School", ic: SV(`<path d="M8 26 32 14l24 12-24 12z" fill="${PV}"/><path d="M18 31v10c0 5 7 8 14 8s14-3 14-8V31" fill="${W}"/>${E(32, 40, 12, 2.2)}${C(32, 45, 22)}`) },
  disability: { l: "Disability", ic: blob(W, `<circle cx="32" cy="17" r="3" fill="${INK}" stroke="none"/>`) },
  seniors: { l: "Seniors", ic: SV(`<path d="M32 12c12 0 21 8 21 21 0 12-9 19-21 19s-21-7-21-19c0-13 9-21 21-21z" fill="${W}"/><circle cx="26" cy="32" r="5" fill="#fff"/><circle cx="38" cy="32" r="5" fill="#fff"/><path d="M31 32h2"/><circle cx="26" cy="32" r="1.8" fill="${INK}"/><circle cx="38" cy="32" r="1.8" fill="${INK}"/>${C(32, 40, 26)}${M(32, 41)}`) },
  veterans: { l: "Veterans", ic: SV(`<path d="M32 10 50 17v12c0 12-8 20-18 24-10-4-18-12-18-24V17z" fill="${PV}"/><path d="M32 18l2.4 5 5.4.6-4 3.6 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.6 5.4-.6z" fill="${B}" stroke-width="1.4"/>${E(32, 38, 12, 2.2)}${C(32, 43, 22)}`) },
};

const L = (i: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${i}</g></svg>`;
export const IC = {
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fillme" d="M12 20.5s-8-5-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 5.6-8 10.6-8 10.6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>`,
  comment: L(`<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z"/>`),
  send: L(`<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>`),
  save: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fillme" d="M6 3.5h12v17l-6-4.2-6 4.2z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>`,
  listen: L(`<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/>`),
  home: L(`<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>`),
  crew: L(`<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0M10.5 19a5.5 5.5 0 0 1 11 0"/>`),
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  plan: L(`<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>`),
  me: L(`<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>`),
  sun: L(`<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>`),
  moon: L(`<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`),
  play: L(`<path d="M8 5.5v13l10-6.5z"/>`),
  pause: L(`<path d="M8 5v14M16 5v14"/>`),
  doc: L(`<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5v4h4M10 12h5M10 16h5"/>`),
  up: L(`<path d="M12 19V6M6 11l6-6 6 6"/>`),
  share: L(`<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>`),
  check: `<svg viewBox="0 0 24 24" aria-label="Official source"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2z" fill="#6f84b4"/><path d="M8 12.3l2.6 2.6L16 9.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heartBig: `<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.4-8.5-11.3A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.5 2.9C20.5 15.6 12 21 12 21z" fill="#df8f8f"/><path d="M8 8.5a2.5 2.5 0 0 0-2 2" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.3l-6.1 3.4 1.5-6.7L2.3 9.4l6.8-.7z" fill="none" stroke="#c9d3ff" stroke-width="1.4"/></svg>`,
};

/** Pip, alive: bobbing body, flapping wings, blinking eyes that follow the pointer. */
export function pipLive() {
  return `<svg class="bea-live" viewBox="0 0 120 120" aria-hidden="true"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
 <ellipse cx="60" cy="112" rx="28" ry="4" fill="rgba(40,40,90,.12)" stroke="none"/>
 <g class="bl-body"><path d="M60 22c26 0 42 18 42 42 0 22-17 34-42 34S18 86 18 64c0-24 16-42 42-42z" fill="#fff"/>
  <path class="bl-wing l" d="M20 78c4-10 12-15 19-14-2 10-8 17-19 20z" fill="#e6e4ea" stroke-width="2.4"/><path class="bl-wing r" d="M100 78c-4-10-12-15-19-14 2 10 8 17 19 20z" fill="#e6e4ea" stroke-width="2.4"/>
  <path d="M50 98l-2 9M70 98l2 9" fill="none" stroke-width="2.8"/><path d="M56 22c-2-6 2-10 6-9" fill="none" stroke-width="2.4"/>
  <g class="bl-eyes"><g class="bl-pupils"><circle cx="51" cy="58" r="4" fill="${INK}" stroke="none"/><circle cx="69" cy="58" r="4" fill="${INK}" stroke="none"/><circle cx="52.4" cy="56.6" r="1.3" fill="#fff" stroke="none"/><circle cx="70.4" cy="56.6" r="1.3" fill="#fff" stroke="none"/></g></g>
  <path class="bl-beak" d="M57.5 64.5h5l-2.5 3.2z" fill="${INK}" stroke-width="1.4"/><path class="bl-happy" d="M55 64q5 8 10 0z" fill="#e59a9a" stroke-width="2"/>
  <ellipse cx="42" cy="68" rx="6" ry="3.6" fill="#efb5b5" opacity=".75" stroke="none"/><ellipse cx="78" cy="68" rx="6" ry="3.6" fill="#efb5b5" opacity=".75" stroke="none"/>
 </g></g></svg>`;
}

/** Pip hops and smiles. */
export function cheer() {
  document.querySelectorAll<SVGElement>(".bea-live").forEach((b) => {
    b.classList.remove("cheer");
    void b.getBoundingClientRect();
    b.classList.add("cheer");
    setTimeout(() => b.classList.remove("cheer"), 800);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointermove",
    (e) => {
      document.querySelectorAll<SVGElement>(".bea-live").forEach((b) => {
        const r = b.getBoundingClientRect();
        if (!r.width) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.45);
        const d = Math.hypot(dx, dy) || 1, m = Math.min(3, d / 40);
        b.style.setProperty("--ex", ((dx / d) * m).toFixed(2) + "px");
        b.style.setProperty("--ey", ((dy / d) * m).toFixed(2) + "px");
      });
    },
    { passive: true },
  );
}

/** Little hearts that fly out of an element. */
export function burst(el: Element | null, svg: string, n = 6, calm = false) {
  if (calm || !el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "fx";
    s.innerHTML = svg;
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.45;
    s.style.left = r.left + r.width / 2 + "px";
    s.style.top = r.top + r.height / 2 + "px";
    s.style.setProperty("--dx", Math.cos(a) * 60 + "px");
    s.style.setProperty("--dy", Math.sin(a) * 60 - 18 + "px");
    s.style.setProperty("--r", Math.random() * 50 - 25 + "deg");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1050);
  }
}
