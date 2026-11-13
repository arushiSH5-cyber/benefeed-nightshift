import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

// On Vercel the API lives elsewhere (the Mac, through a tunnel). VITE_API_BASE points at it.
const API = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";
export const apiUrl = (p: string) => (API && /^\/(api|media)\//.test(p) ? API + p : p);
if (API) {
  const f = window.fetch.bind(window);
  window.fetch = (i: RequestInfo | URL, init?: RequestInit) => f(typeof i === "string" ? apiUrl(i) : i, init);
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
