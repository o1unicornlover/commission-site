const ADMIN_CACHE = "commission-admin-v2";
const ADMIN_SHELL = [
  "./admin.html",
  "./style.css",
  "./script.js",
  "./sb-api.js",
  "./supabase-config.js",
  "./admin-manifest.webmanifest",
  "./admin-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(ADMIN_CACHE)
      .then(cache => cache.addAll(ADMIN_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== ADMIN_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(ADMIN_CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match("./admin.html")))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const commissionId = event.notification?.data?.commissionId || "";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => client.url.includes("admin.html"));
      if (existing) {
        existing.postMessage({ type: "open-inbox-commission", commissionId });
        return existing.focus();
      }
      const suffix = commissionId ? `#message-${encodeURIComponent(commissionId)}` : "";
      return self.clients.openWindow(`./admin.html${suffix}`);
    })
  );
});
