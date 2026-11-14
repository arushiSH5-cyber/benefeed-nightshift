// Renders the explainer video's frames (720x1280): title slides + tilted phone screenshots,
// every scene captioned in English and French. Run: node scripts/explainer.mjs <outdir>
import sharp from "sharp";
const OUT = process.argv[2];
const LIGHT = process.argv[3] === "light";
const PAL = LIGHT ? [["#0c1124","#e4e9f2"],["#18203f","#f3efe4"],["#2a2f5c","#fbf6ea"],["#141b35","#fffdf8"],["#3a4577","#e2dccb"],["#eef0ff","#3e3b4f"],["#ffffff","#3e3b4f"],["#b9c3ff","#566a99"],["#a3a9cf","#7a7686"],["#ffd98a","#b7791f"],["#c9d3ff","#c9cfe6"],["#8c9cff","#6f84b4"]] : [];
const theme = (svg) => PAL.reduce((a, [f, t]) => a.split(f).join(t), svg);
const W = 720, H = 1280, D = "../docs/";
const esc = (s) => s.replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").replace(/\s{2,}/g, " ").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PIP = `<g stroke="#45405a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M60 22c26 0 42 18 42 42 0 22-17 34-42 34S18 86 18 64c0-24 16-42 42-42z" fill="#fff"/><path d="M20 78c4-10 12-15 19-14-2 10-8 17-19 20z" fill="#e6e4ea" stroke-width="2.4"/><path d="M100 78c-4-10-12-15-19-14 2 10 8 17 19 20z" fill="#e6e4ea" stroke-width="2.4"/><path d="M50 98l-2 9M70 98l2 9" fill="none" stroke-width="2.8"/><path d="M56 22c-2-6 2-10 6-9" fill="none" stroke-width="2.4"/><circle cx="51" cy="58" r="4" fill="#45405a" stroke="none"/><circle cx="69" cy="58" r="4" fill="#45405a" stroke="none"/><path d="M55 64q5 8 10 0z" fill="#e59a9a" stroke-width="2"/><ellipse cx="42" cy="68" rx="6" ry="3.6" fill="#efb5b5" opacity=".75" stroke="none"/><ellipse cx="78" cy="68" rx="6" ry="3.6" fill="#efb5b5" opacity=".75" stroke="none"/></g>`;
const stars = Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 137) % W}" cy="${(i * 263) % 700}" r="${(i % 3) + 1}" fill="#c9d3ff" opacity="${0.25 + (i % 4) / 8}"/>`).join("");
const bg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1124"/><stop offset=".65" stop-color="#18203f"/><stop offset="1" stop-color="#2a2f5c"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${stars}${inner}</svg>`;
const T = (x, y, s, size, color = "#eef0ff", weight = 700, anchor = "middle", italic = false) =>
  `<text x="${x}" y="${y}" font-family="Avenir Next, Helvetica, Arial" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" ${italic ? 'font-style="italic"' : ""}>${esc(s)}</text>`;
const lines = (arr, x, y, size, color, gap, weight = 700, anchor = "middle", italic = false) => arr.map((l, i) => T(x, y + i * gap, l, size, color, weight, anchor, italic)).join("");
const tag = (txt, y) => { const w = Math.max(340, txt.length * 15 + 60); return `<rect x="${W / 2 - w / 2}" y="${y - 30}" width="${w}" height="44" rx="22" fill="#8c9cff"/>${T(W / 2, y, txt, 22, "#0c1124", 800)}`; };
const cap = (en, fr) => `<rect x="0" y="${H - 250}" width="${W}" height="250" fill="#0c1124" opacity=".82"/>${lines(en, W / 2, H - 190, 32, "#ffffff", 42)}${lines(fr, W / 2, H - 190 + en.length * 42 + 14, 25, "#b9c3ff", 34, 600, "middle", true)}`;

async function slide(name, inner) { await sharp(Buffer.from(theme(bg(inner)))).png().toFile(`${OUT}/${name}.png`); }
async function screen(name, img, step, en, fr, angle = -6) {
  const shot = await sharp(img.startsWith("/") ? img : D + img).resize(330, 714).composite([{ input: Buffer.from(`<svg width="330" height="714"><rect width="330" height="714" rx="36" fill="none" stroke="#3e3b4f" stroke-width="14"/></svg>`) }])
    .png().toBuffer();
  const tilted = await sharp(shot).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(tilted).metadata();
  const shadow = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(tilted).ensureAlpha().tint("#000").modulate({ brightness: 0 }).png().toBuffer() }]).blur(18).png().toBuffer();
  const base = Buffer.from(theme(bg(tag(step, 92) + cap(en, fr))));
  const left = Math.round((W - meta.width) / 2), top = 130;
  await sharp(base).composite([{ input: tilted, left, top }]).png().toFile(`${OUT}/${name}.png`);
}

await slide("00-title", `<g transform="translate(240 170) scale(2)">${PIP}</g>${T(W / 2, 520, "Benefeed", 84, "#ffffff", 800)}${T(W / 2, 580, "NIGHT SHIFT", 30, "#8c9cff", 800)}
${lines(["You're on Do Not Disturb.", "Your crew isn't."], W / 2, 700, 44, "#ffffff", 56)}${lines(["Vous êtes en Ne pas déranger.", "Votre équipe, non."], W / 2, 850, 32, "#b9c3ff", 42, 600, "middle", true)}
${T(W / 2, 1180, "Do Not Disturb Hackathon × PhoneUse · San Francisco", 22, "#a3a9cf", 600)}`);
await slide("01-problem", `${tag("THE PROBLEM · LE PROBLÈME", 160)}${T(W / 2, 360, "$58 billion", 92, "#ffd98a", 800)}${lines(["a year in benefits older adults", "qualify for, but never get."], W / 2, 450, 36, "#ffffff", 48)}
${T(W / 2, 600, "9.1M older adults (NCOA)", 30, "#a3a9cf", 600)}${lines(["58 milliards de dollars d'aides", "jamais réclamées chaque année."], W / 2, 720, 30, "#b9c3ff", 40, 600, "middle", true)}
${lines(["Why? Forms, portals and deadlines", "on a tiny screen."], W / 2, 900, 32, "#ffffff", 44, 600)}${lines(["Formulaires, portails, échéances…", "sur un petit écran."], W / 2, 1010, 27, "#b9c3ff", 36, 600, "middle", true)}`);
await slide("02-idea", `${tag("THE IDEA · L'IDÉE", 160)}${lines(["A crew of 4 AI helpers", "works YOUR phone overnight"], W / 2, 300, 40, "#ffffff", 52)}
${lines(["Une équipe de 4 assistants IA travaille", "sur VOTRE téléphone pendant la nuit"], W / 2, 430, 27, "#b9c3ff", 36, 600, "middle", true)}
${[["🐦 Pip", "finds help · trouve les aides"], ["🐸 Fern", "checks official sites · vérifie"], ["🐰 Bun", "fills the forms · remplit"], ["☁️ Nimbus", "adds deadlines · échéances"]].map(([a, b], i) => `<rect x="80" y="${540 + i * 120}" width="560" height="96" rx="24" fill="#141b35" stroke="#3a4577"/>${T(120, 600 + i * 120, a, 34, "#ffffff", 800, "start")}${T(320, 600 + i * 120, b, 23, "#a3a9cf", 600, "start")}`).join("")}
${lines(["…and they STOP before every final tap.", "…et s'arrêtent avant chaque action finale."], W / 2, 1080, 28, "#ffd98a", 44, 700)}`);
await screen("03-hello", "1-hello.jpg", "1 · MEET PIP", ["Meet Pip. No account, no SSN."], ["Voici Pip. Sans compte, sans n° de sécu."]);
await screen("04-quiz", "fr/quiz.jpg", "2 · SWIPE QUIZ", ["Swipe right for yes, left for no."], ["Glissez : à droite oui, à gauche non."], 5);
await screen("05-found", "3-crew-finds.jpg", "3 · YOUR CREW", ["The crew finds help you're missing."], ["L'équipe trouve les aides que vous ratez."]);
await screen("06-feed", "5-feed.jpg", "4 · FEED", ["Swipe your matches. Every fact", "links to an official site."], ["Chaque info vient d'un site officiel."], 5);
await screen("07-france", "fr/feed.jpg", "5 · 🇫🇷 FRANCE · 🇬🇧 UK · 🇺🇸 USA", ["3 countries, Federal/State/Local levels,", "English ⇄ Français in one tap."], ["APL, RSA, Prime d'activité… en français."]);
await screen("08-tonight", "4-tonight.jpg", "6 · NIGHT SHIFT", ["Tap Watch it now: the crew", "takes the phone."], ["« Regarder maintenant » : l'équipe prend le téléphone."], 5);
await slide("09-how", `${tag("HOW IT WORKS · COMMENT", 140)}
${[["👀 Observe", "read the screen (ui tree + screenshot)", "lire l'écran"], ["🧠 Decide", "Claude picks 1 of 9 safe actions", "Claude choisit 1 action sûre"], ["👆 Act", "PhoneUse taps & types on the phone", "PhoneUse tape et écrit"], ["✅ Verify", "look again, retry once, else ask", "revérifier, sinon demander"]].map(([a, b, c], i) => `<rect x="70" y="${210 + i * 170}" width="580" height="140" rx="26" fill="#141b35" stroke="#3a4577"/>${T(110, 268 + i * 170, a, 36, "#ffffff", 800, "start")}${T(110, 308 + i * 170, b, 23, "#a3a9cf", 600, "start")}${T(110, 336 + i * 170, c, 21, "#b9c3ff", 600, "start", true)}`).join("")}
${T(W / 2, 950, "⟲  LangGraph loop · checkpointed in SQLite", 26, "#8c9cff", 700)}
${lines(["Final button? → 🔒 HardStop → interrupt()", "Bouton final ? → arrêt → attend votre oui"], W / 2, 1040, 27, "#ffd98a", 42, 700)}`);
await slide("10-live", `${tag("7 · REAL AUTOMATION · EN DIRECT", 92)}${cap(["Real run: Claude + LangGraph fill the form,", "then stop by themselves at Submit."], ["Vraie démo : l'IA remplit puis s'arrête seule."])}`); // the recorded run is overlaid here
await screen("11-stop", "7-hard-stop.jpg", "8 · 🔒 HARD STOP", ["The AI cannot press Add / Send / Submit.", "Enforced in code, not in a prompt."], ["L'IA ne peut pas valider seule : règle dans le code."]);
await screen("12-morning", "8-morning.jpg", "9 · GOOD MORNING", ["Morning: 3 things ready.", "Nothing was sent without you."], ["Au matin : 3 choses prêtes, rien d'envoyé sans vous."], 5);
await screen("13-review", "9-review.jpg", "10 · HOLD TO APPROVE", ["See every real screenshot,", "then hold to say yes."], ["Revoyez chaque écran, puis maintenez pour dire oui."]);
await slide("14-safety", `${tag("SAFETY · SÉCURITÉ", 140)}
${[["🔒", "Hard stop before Submit / Send / Add / Pay", "Arrêt avant toute action finale"], ["📵", "Only 3 apps, only .gov + practice portal", "3 apps, sites officiels seulement"], ["🛡️", "Page text is data, never orders", "Le texte d'une page n'est jamais un ordre"], ["🧪", "25 tests · injection page ignored", "25 tests · page piégée ignorée"], ["🧹", "Test persona · screenshots erased in 24 h", "Données fictives · effacées en 24 h"]].map(([e, a, b], i) => `<circle cx="105" cy="${263 + i * 160}" r="12" fill="#8c9cff"/>${T(140, 255 + i * 160, a, 25, "#ffffff", 700, "start")}${T(140, 292 + i * 160, b, 22, "#b9c3ff", 600, "start", true)}`).join("")}`);
await slide("15-stack", `${tag("BUILT WITH · CONSTRUIT AVEC", 140)}
${[["PhoneUse", "the crew's hands on a real phone", "#ffd98a"], ["LangGraph", "the brain + interrupt() hard stop", "#ffffff"], ["Claude", "decides every next step", "#ffffff"], ["LangSmith", "traces every run", "#ffffff"], ["Tavily", "official-site fact checks", "#ffffff"], ["ElevenLabs", "Pip's voice, EN / ES", "#ffffff"], ["GitHub Pages", "installable app + QR", "#ffffff"]].map(([a, b, c], i) => `${T(90, 270 + i * 112, a, 38, c, 800, "start")}${T(90, 306 + i * 112, b, 23, "#a3a9cf", 600, "start")}`).join("")}
${lines(["💛 Merci PhoneUse — this demo only exists", "because of what you built."], W / 2, 1110, 27, "#ffd98a", 40, 700)}`);
const qr = await sharp(D + "qr.png").resize(330, 330).png().toBuffer();
await sharp(Buffer.from(theme(bg(`<g transform="translate(300 120) scale(1)">${PIP}</g>${T(W / 2, 330, "Try it on your phone", 46, "#ffffff", 800)}${T(W / 2, 382, "Essayez-le sur votre téléphone", 30, "#b9c3ff", 600, "middle", true)}
<rect x="${W / 2 - 185}" y="430" width="370" height="370" rx="28" fill="#fff"/>${T(W / 2, 880, "arushish5-cyber.github.io/benefeed-nightshift", 22, "#eef0ff", 600)}
${T(W / 2, 960, "github.com/arushiSH5-cyber/benefeed-nightshift", 22, "#a3a9cf", 600)}${lines(["Her phone is on Do Not Disturb.", "Her crew isn't."], W / 2, 1090, 36, "#ffffff", 48)}`))))
  .composite([{ input: qr, left: W / 2 - 165, top: 450 }]).png().toFile(`${OUT}/16-end.png`);
const box = (rows, y0, gap) => rows.map(([a, b, c], i) => `<rect x="70" y="${y0 + i * gap}" width="580" height="${gap - 24}" rx="24" fill="#141b35" stroke="#3a4577"/>${T(105, y0 + 52 + i * gap, a, 30, "#ffffff", 800, "start")}${T(105, y0 + 88 + i * gap, b, 22, "#a3a9cf", 600, "start")}${c ? T(105, y0 + 116 + i * gap, c, 20, "#b9c3ff", 600, "start", true) : ""}`).join("");
await slide("08b-app", `${tag("OUR REAL APP · L'APP EN VRAI", 92)}${cap(["Recorded live: quiz, feed, crew, sunrise,", "hold to approve, night mode, Français."], ["Enregistrée en direct, de bout en bout."])}`);
await slide("10b-human", `${tag("HUMAN IN THE LOOP · VOUS DÉCIDEZ", 140)}${box([["1. The crew stops", "the guard raises HardStop → LangGraph interrupt()", "l'équipe s'arrête toute seule"], ["2. Morning notification", "the run is saved (SQLite), even for hours", "notification au réveil"], ["3. You review the filmstrip", "every real screenshot, step by step", "vous voyez chaque écran"], ["4. Hold 1.2 s to say yes", "Yes → resume · Skip → never taps · Change → redo", "maintenez pour dire oui"]], 210, 190)}`);
await slide("10c-phone", `${tag("ON A REAL PHONE · SUR UN VRAI TÉLÉPHONE", 140)}${lines(["PhoneUse gives the crew real hands"], W / 2, 250, 34, "#ffffff", 44)}${lines(["PhoneUse donne de vraies mains à l'équipe"], W / 2, 300, 25, "#b9c3ff", 34, 600, "middle", true)}
${box([["Cloud phone (MCP)", "ui_snapshot · tap · type_text · open_app", "téléphone Android dans le cloud"], ["Lease → act → re-check → release", "every action verified on a fresh screen", "chaque action revérifiée"], ["./demo.sh hosted", "same crew, same hard stop, real device", "même équipe, même arrêt"], ["Approve from YOUR phone", "owner link · judges can only watch", "vous seul validez"]], 360, 190)}`);
await slide("13b-standout", `${tag("WHY WE STAND OUT · POURQUOI NOUS", 140)}
${T(70, 260, "", 24, "#fff", 700, "start")}${["", "Benefit sites", "Chatbots", "Benefeed"].map((h, i) => T(360 + (i - 1) * 140, 260, h, 22, i === 3 ? "#ffd98a" : "#a3a9cf", 800)).join("")}
${[["Finds your help", "~", "~", "yes"], ["Fills the forms", "no", "no", "yes"], ["Works in real apps", "no", "no", "yes"], ["Waits for your yes", "-", "no", "yes"], ["Official source per fact", "yes", "no", "yes"], ["English + Français", "~", "~", "yes"]].map((r, i) => `<rect x="40" y="${290 + i * 100}" width="640" height="84" rx="18" fill="#141b35"/>${T(60, 342 + i * 100, r[0], 24, "#ffffff", 700, "start")}${r.slice(1).map((v, j) => T(390 + j * 140 - 140 + 110, 342 + i * 100, v === "yes" ? "✓" : v === "no" ? "X" : v, 34, v === "yes" ? "#86dbb4" : v === "no" ? "#df8f8f" : "#a3a9cf", 800)).join("")}`).join("")}
${lines(["It doesn't chat. It does the work, safely.", "Elle ne discute pas : elle agit, en sécurité."], W / 2, 980, 28, "#ffd98a", 44, 700)}`);
await slide("15b-done", `${tag("WHAT WE BUILT TODAY · BILAN", 140)}${[["3", "countries · pays"], ["30", "programs · aides"], ["25", "safety tests · tests"], ["11", "real steps, 1 live run"], ["0", "taps without your yes"]].map(([n, l], i) => `${T(200, 330 + i * 150, n, 92, "#ffd98a", 800, "end")}${T(240, 310 + i * 150, l, 30, "#ffffff", 700, "start")}`).join("")}
${lines(["Built solo, in one afternoon.", "Seule, en un après-midi."], W / 2, 1110, 30, "#b9c3ff", 44, 700)}`);
// ---- automation, step by step, from the real run's screenshots ----
const SD = process.env.STEPS_DIR;
const STEPS = [
  ["s03", "STEP 1 · OPEN THE WEBSITE", 'open_url("…/practice")', ["Opens the website in the phone's browser,", "exactly like a person would."], ["Ouvre le site dans le navigateur, comme vous."]],
  ["s04", "STEP 2 · READ + TYPE", 'fill("How many people live with you?", "2")', ["Reads the labels on screen", "and types Rosa's answer."], ["Lit l'écran et tape la réponse de Rosa."]],
  ["s05", "STEP 3 · DROPDOWN", 'fill("Anyone 60 or older?", "Yes")', ["Dropdowns too: picks “Yes”."], ["Les menus aussi : « Oui »."]],
  ["s06", "STEP 4 · GUARD CHECK ✓", 'tap("Next")  → not final → allowed', ["“Next” isn't a final button,", "so the safety guard lets it tap."], ["« Suivant » n'est pas final : autorisé."]],
  ["s07", "STEP 5 · INCOME", 'fill("Money in each month", "Under $2,500")', ["Page 2: income from Rosa's answers."], ["Page 2 : les revenus de Rosa."]],
  ["s08", "STEP 6 · NO FAKE DOCUMENTS", 'fill("Pay stub", "later")', ["No pay stub yet, so it writes “later”.", "It never invents documents."], ["Pas de fiche de paie : « plus tard »."]],
  ["s10", "STEP 7 · CONTACT", 'fill("City", "San Jose")', ["Page 3: contact. Never an SSN."], ["Page 3 : contact. Jamais de n° de sécu."]],
  ["s11", "STEP 8 · DROPDOWN", 'fill("Best time to call", "Mornings")', ["Best time to call: mornings."], ["Meilleur moment : le matin."]],
  ["s13", "STEP 9 · 🔒 HARD STOP", 'tap("Submit")  → FINAL → HardStop → interrupt()', ["It tries “Submit”. The guard blocks it", "and LangGraph pauses the whole run."], ["Bloqué : l'équipe attend votre oui."]],
  ["s14", "STEP 10 · AFTER YOUR YES", 'approval #1 → tap("Submit") → tap("Confirm")', ["Only after Rosa holds to approve:", "Submit, Confirm. Saved."], ["Après votre oui seulement : envoyé."]],
];
if (SD) for (const [id, tg, cmd, en, fr] of STEPS) {
  await screen("step-" + id, `${SD}/${id}.png`, tg, en, fr, 0);
  const img = await sharp(`${OUT}/step-${id}.png`).composite([{ input: Buffer.from(theme(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="70"><rect x="30" y="8" width="${W - 60}" height="54" rx="14" fill="#0c1124" opacity=".92"/><text x="${W / 2}" y="44" font-family="Menlo, monospace" font-size="19" fill="#86dbb4" text-anchor="middle">${esc(cmd)}</text></svg>`)), left: 0, top: 960 }]).toBuffer();
  await sharp(img).toFile(`${OUT}/step-${id}.png`);
}
await slide("10a-connect", `${tag("HOW IT CONNECTS · LA CONNEXION", 140)}${lines(["No API. No backdoor.", "It uses the website like you do."], W / 2, 250, 36, "#ffffff", 48)}${lines(["Pas d'API cachée : il utilise le site comme vous."], W / 2, 370, 25, "#b9c3ff", 34, 600, "middle", true)}
${box([["1. A real phone (PhoneUse)", "opens the site in its normal browser", "un vrai téléphone, un vrai navigateur"], ["2. Reads the screen", "labels, fields, buttons (UI tree) + a screenshot", "lit les champs et les boutons"], ["3. Claude picks ONE action", "type, pick, tap, scroll: validated JSON", "une seule action à la fois"], ["4. PhoneUse taps & types", "then a fresh look to check it worked", "puis revérifie l'écran"]], 420, 170)}`);
await slide("10d-real", `${tag("REAL PORTALS · LES VRAIS SITES", 140)}${box([["Same steps on a real site", "e.g. BenefitsCal: open, read, fill, stop", "mêmes étapes sur un vrai site"], ["You log in yourself", "the crew never sees or stores passwords", "vous vous connectez vous-même"], ["CAPTCHA, 2FA code, ID upload?", "it stops and hands the phone back to you", "CAPTCHA ? Il vous rend la main"], ["Final Submit = your yes", "always, enforced in code", "l'envoi final = votre oui"]], 230, 175)}
${lines(["Today's demo uses a practice portal:", "no fake data ever goes to a real agency."], W / 2, 1000, 26, "#ffd98a", 40, 700)}`);
console.log("frames ok");
