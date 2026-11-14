/// <reference lib="webworker" />
// Service worker: caches the app shell, network-first for /api/*, and shows the morning push.
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// App shell for navigations, except server-rendered pages (practice portal) and the API.
// Pages always come from the network when online (so a new deploy never leaves a stale, blank shell); cache is the offline fallback.
const pages = new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 3 });
registerRoute(new NavigationRoute(async (o) => {
  try { return await pages.handle(o); } catch { return (await caches.match(import.meta.env.BASE_URL + "index.html", { ignoreSearch: true })) || Response.error(); }
}, { denylist: [/\/api\//, /\/practice/, /\/media\//, /\/about/] }));
// Network-first API, so offline still shows the last briefing and plan.
registerRoute(({ url }) => url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/tts"), new NetworkFirst({ cacheName: "api", networkTimeoutSeconds: 4 }), "GET");
registerRoute(({ url }) => url.origin.includes("fonts.g"), new CacheFirst({ cacheName: "fonts" }));

self.addEventListener("push", (e) => {
  let d: { title?: string; body?: string; url?: string } = {};
  try { d = e.data?.json() ?? {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Benefeed", {
    body: d.body || "🌙 Your crew is done. 3 things are waiting for your yes.",
    icon: import.meta.env.BASE_URL + "icons/icon-192.png", badge: import.meta.env.BASE_URL + "icons/icon-192.png", tag: "night-shift",
    data: { url: d.url || "/?review=1" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/?review=1";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) { await (c as WindowClient).navigate(url); return (c as WindowClient).focus(); } }
    return self.clients.openWindow(url);
  })());
});
