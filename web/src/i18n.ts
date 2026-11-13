// French mode. Translates the UI text in place (a text-node pass + observer), so every screen
// switches without touching each component. Program facts stay US (CalFresh, Medi-Cal) and are labelled so.
const FR: Record<string, string> = {
  "Hi! I'm Pip 👋": "Salut ! Moi c'est Pip 👋",
  "You're on Do Not Disturb. Your crew isn't.": "Vous êtes en Ne pas déranger. Votre équipe, non.",
  "Tonight, your crew uses your phone to find help you're missing and fill in the boring parts. Nothing is sent until you say yes.":
    "Cette nuit, votre équipe utilise votre téléphone pour trouver les aides que vous ratez et remplir la paperasse. Rien n'est envoyé sans votre oui.",
  "Find my help": "Trouver mes aides",
  "Which sound like you? Pick any, or skip.": "Qu'est-ce qui vous correspond ? Choisissez, ou passez.",
  "About you": "À propos de vous", "Skip": "Passer", "Next": "Suivant",
  "I'm 65 or older": "J'ai 65 ans ou plus", "I'm raising kids": "J'élève des enfants", "Pregnant or new baby": "Enceinte ou bébé",
  "I'm a student": "Je suis étudiant·e", "I work": "Je travaille", "I lost my job": "J'ai perdu mon emploi",
  "I have a disability": "J'ai un handicap", "I served in the military": "J'ai servi dans l'armée",
  "Roughly how much comes in each month?": "Combien gagnez-vous à peu près par mois ?",
  "Money in": "Revenus", "Under $2,500 a month": "Moins de 2 500 $ par mois", "Tight most months": "Serré la plupart du temps",
  "$2,500 to $5,000": "2 500 $ à 5 000 $", "Getting by": "Ça va", "Over $5,000": "Plus de 5 000 $", "Mostly okay": "Plutôt bien",
  "your city": "votre ville", "Send my crew": "Envoyer mon équipe", "your crew is working": "votre équipe travaille",
  "reading your answers": "lit vos réponses", "checking official sites": "vérifie les sites officiels",
  "getting forms ready": "prépare les formulaires", "noting deadlines": "note les échéances",
  "a month you may be missing": "par mois que vous ratez peut-être", "Sample estimate.": "Estimation indicative.",
  "Start swiping": "Commencer", "For you": "Pour vous", "Community": "Communauté",
  "tonight": "cette nuit", "Night shift": "Équipe de nuit", "Your crew works your phone tonight": "Votre équipe travaille sur votre téléphone cette nuit",
  "They fill in forms, add deadlines and draft texts. Then they stop before anything final and wait for your yes.":
    "Elle remplit les formulaires, ajoute les échéances et rédige les messages. Puis elle s'arrête avant toute action finale et attend votre oui.",
  "▶ Watch it now": "▶ Regarder maintenant", "How it works": "Comment ça marche", "Replay": "Rediffusion",
  "Home": "Accueil", "Crew": "Équipe", "Plan": "Plan", "Me": "Moi",
  "night shift": "équipe de nuit", "Your crew": "Votre équipe", "Your crew is on your phone": "Votre équipe est sur votre téléphone",
  "Waiting for your yes": "En attente de votre oui", "🌙 DND on": "🌙 Ne pas déranger",
  "finder": "chercheur", "checker": "vérificatrice", "form filler": "formulaires", "reminders": "rappels",
  "▶ Run night shift now": "▶ Lancer l'équipe de nuit", "■ Stop everything": "■ Tout arrêter", "Stop everything": "Tout arrêter", "Replay · demo run": "Rediffusion · démo", "Household": "Foyer", "Income": "Revenus", "Contact": "Contact", "Review & submit": "Vérifier et envoyer", "Submit": "Envoyer", "now": "maintenant", "🌙 Night shift: on · 1:00 AM": "🌙 Équipe de nuit : 1 h", "PhoneUse · your iPhone": "PhoneUse · votre téléphone",
  "Tonight's jobs": "Les tâches de la nuit", "What happened, in plain words": "Ce qui s'est passé, en clair",
  "Who does what": "Qui fait quoi", "Do Not Disturb": "Ne pas déranger", "Your phone is resting. Your crew isn't.": "Votre téléphone se repose. Votre équipe, non.",
  "Do Not Disturb is on · the crew is working": "Ne pas déranger activé · l'équipe travaille",
  "🔒 waiting for your yes": "🔒 attend votre oui", "PRACTICE PORTAL · NOT A REAL AGENCY": "PORTAIL D'ENTRAÎNEMENT · PAS UNE VRAIE ADMINISTRATION",
  "good morning": "bonjour", "While you slept": "Pendant votre sommeil", "Your crew got 3 things ready": "Votre équipe a préparé 3 choses",
  "Your CalFresh application is filled in": "Votre demande CalFresh (aide alimentaire, Californie) est remplie",
  "2 deadlines are ready for your Calendar": "2 échéances sont prêtes pour votre agenda",
  "A text to Maria is drafted": "Un message pour Maria est rédigé", "ready for you": "prêt pour vous",
  "Nothing was sent without you": "Rien n'a été envoyé sans vous", "Review & say yes": "Vérifier et dire oui",
  "Briefing": "Résumé vocal", "Run again": "Relancer", "Say yes, change, or skip": "Oui, modifier ou passer",
  "Swipe each filmstrip to see exactly what your crew did on your phone.": "Faites défiler chaque pellicule pour voir exactement ce que l'équipe a fait.",
  "Hold to submit": "Maintenir pour envoyer", "Hold to add": "Maintenir pour ajouter", "Hold to send": "Maintenir pour envoyer",
  "Keep holding…": "Continuez d'appuyer…", "Change": "Modifier", "See trace ↗": "Voir la trace ↗",
  "How to apply": "Comment demander", "Sources": "Sources", "Who it's for": "Pour qui", "Save": "Garder", "Listen": "Écouter", "Send": "Envoyer",
  "You likely qualify": "Vous êtes probablement éligible", "You might qualify": "Vous êtes peut-être éligible", "estimate": "estimation",
  "swipe up": "glissez vers le haut", "You're all caught up": "Vous êtes à jour", "Back to the top": "Retour en haut",
  "Open it on your phone": "Ouvrez-le sur votre téléphone", "How Night Shift works": "Comment fonctionne l'équipe de nuit",
  "Night mode": "Mode nuit", "Bigger text": "Texte plus grand", "Calm mode": "Mode calme", "Erase everything": "Tout effacer",
  "Retake the quiz": "Refaire le questionnaire", "about": "environ", "a month": "par mois", "a year": "par an", "of": "sur", "Food": "Alimentation", "Health": "Santé", "Money": "Argent", "Housing": "Logement", "Bills": "Factures", "Kids": "Enfants", "Rides": "Transport", "Jobs": "Emploi", "School": "Études", "Disability": "Handicap", "Seniors": "Seniors", "Veterans": "Anciens combattants", "your country": "votre pays", "quick question": "petite question", "Do you rent your home?": "Vous êtes locataire ?", "Are energy bills hard to pay?": "Les factures d'énergie sont dures à payer ?", "Swipe right for yes, left for no": "Glissez à droite pour oui, à gauche pour non", "👈 No": "👈 Non", "Yes 👉": "Oui 👉", "🏛️ Federal": "🏛️ Fédéral", "🗺️ State": "🗺️ État", "🏘️ Local": "🏘️ Local", "Got it! Your matches updated": "Compris ! Vos aides sont à jour", "Okay, noted": "D'accord, c'est noté", "Your profile": "Votre profil",
};
const EN: Record<string, string> = Object.fromEntries(Object.entries(FR).map(([k, v]) => [v, k]));
const PART: [RegExp, string][] = [
  [/^Bun opens Safari on your phone$/, "Bun ouvre Safari sur votre téléphone"],
  [/^Bun opens the practice benefits portal$/, "Bun ouvre le portail d'entraînement"],
  [/^Bun fills your household from your answers$/, "Bun remplit votre foyer d'après vos réponses"],
  [/^Bun fills income and notes the missing pay stub$/, "Bun remplit les revenus et note la fiche de paie manquante"],
  [/^Bun fills contact info \(never an SSN\)$/, "Bun remplit le contact (jamais de n° de sécu)"],
  [/^Hard stop: “(.+)” needs Rosa's yes$/, "Arrêt obligatoire : « $1 » attend le oui de Rosa"],
  [/^Nimbus opens Calendar$/, "Nimbus ouvre l'agenda"], [/^Pip opens Messages$/, "Pip ouvre Messages"],
  [/^Pip writes Maria a plain note in Spanish$/, "Pip écrit un message simple à Maria, en espagnol"],
  [/^Fern checks 3 official pages via Tavily/, "Fern vérifie 3 pages officielles avec Tavily"],
  [/^Pip asks PhoneUse for your iPhone/, "Pip réserve votre téléphone via PhoneUse pendant 10 minutes"],
  [/^All 3 paused before the final tap/, "Les 3 tâches se sont arrêtées avant l'action finale. Le téléphone se rendort"],
  [/^(\d+) of (\d+)$/, "$1 sur $2"],
  [/^🌙 Your crew is done\. (\d+) things are waiting for your yes\.$/, "🌙 Votre équipe a fini. $1 choses attendent votre oui."],
  [/^Your crew is done\. (\d+) things are waiting for your yes\.$/, "Votre équipe a fini. $1 choses attendent votre oui."],
  [/^Rosa said yes\. (.+)$/, "Rosa a dit oui. $1"],
];

let lang: "en" | "fr" = "en";
try { lang = (localStorage.getItem("bfns_lang") as "fr") || (navigator.language.startsWith("fr") ? "fr" : "en"); } catch { /* */ }
export const getLang = () => lang;

function tr(s: string, to: "en" | "fr") {
  const t = s.trim();
  if (!t) return s;
  const map = to === "fr" ? FR : EN;
  if (map[t]) return s.replace(t, map[t]);
  if (to === "fr") for (const [re, rep] of PART) if (re.test(t)) return s.replace(t, t.replace(re, rep));
  return s;
}
function walk(root: Node, to: "en" | "fr") {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const v = n.nodeValue || "";
    const out = tr(v, to);
    if (out !== v) n.nodeValue = out;
  }
}
let obs: MutationObserver | null = null;
let tick = 0;
export function setLang(l: "en" | "fr") {
  lang = l;
  try { localStorage.setItem("bfns_lang", l); } catch { /* */ }
  document.documentElement.lang = l;
  walk(document.body, l);
  obs?.disconnect();
  clearInterval(tick);
  if (l === "fr") {
    obs = new MutationObserver((ms) => { for (const m of ms) { m.addedNodes.forEach((n) => walk(n, "fr")); if (m.type === "characterData") walk(m.target, "fr"); } });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    clearInterval(tick);
    tick = window.setInterval(() => walk(document.body, "fr"), 400); // catch React's in-place text updates
  }
}
