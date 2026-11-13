// TTS interface: ElevenLabs through the server (/api/tts) when it's configured, Web Speech as the fallback.
const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
let tok = 0;
let audio: HTMLAudioElement | null = null;
let rate = 1;
export const setRate = (r: number) => { rate = r; };

export function stopRead() {
  tok++;
  if (synth) synth.cancel();
  if (audio) { audio.pause(); audio = null; }
  document.querySelectorAll(".reading").forEach((e) => e.classList.remove("reading"));
}

function deviceSay(text: string, lang = "en-US"): Promise<void> {
  return new Promise((res) => {
    if (!synth) return res();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.onend = () => res();
    u.onerror = () => res();
    synth.speak(u);
  });
}

/** Speak with Pip's ElevenLabs voice if the server has it; otherwise the device voice. Returns which one played. */
export async function say(text: string, lang: "en" | "es" = "en"): Promise<"elevenlabs" | "device" | "none"> {
  stopRead();
  const my = ++tok;
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (r.ok && my === tok) {
      const blob = await r.blob();
      audio = new Audio(URL.createObjectURL(blob));
      await audio.play();
      return "elevenlabs";
    }
  } catch { /* fall back */ }
  if (my !== tok) return "none";
  if (!synth) return "none";
  void deviceSay(text, lang === "es" ? "es-US" : "en-US");
  return "device";
}

/** Read card elements one by one, highlighting each (device voice, so it's instant and offline). */
export function readEls(els: HTMLElement[], done?: () => void) {
  stopRead();
  const my = ++tok;
  if (!synth) { done && setTimeout(done, 5000); return false; }
  let i = 0;
  const next = () => {
    if (my !== tok) return;
    document.querySelectorAll(".reading").forEach((e) => e.classList.remove("reading"));
    if (i >= els.length) { done?.(); return; }
    const el = els[i++];
    el.classList.add("reading");
    deviceSay(el.innerText).then(next);
  };
  next();
  return true;
}
