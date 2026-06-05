/* 곁에 service worker v3 — shell cache + push notifications */
const CACHE = "gyeotae-shell-v3";
const PRECACHE = ["/", "/home"];
const PWA_CRITICAL = /^\/(sw\.js|manifest\.json|icon-\d+\.png|apple-touch-icon\.png|favicon\.png|og-image\.png)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (PWA_CRITICAL.test(url.pathname)) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match("/"))));
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => {
    const net = fetch(e.request).then((res) => {
      // Only cache real successes — never persist a 404/500 for an asset.
      if (res.ok && res.type === "basic") caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});

/* ---- Push notifications ---- */
self.addEventListener("push", (e) => {
  let data = { title: "곁에 알림", body: "", url: "/family" };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: "gyeotae-alert",
      requireInteraction: true,
      data: { url: data.url },
    })
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/family";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
