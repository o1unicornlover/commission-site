const ADMIN_CACHE = "commission-admin-v25";
const ADMIN_SHELL = [
  "./admin.html",
  "./style.css",
  "./admin-runtime.js",
  "./sb-api.js",
  "./supabase-config.js",
  "./admin-manifest.webmanifest",
  "./admin-icon.svg",
  "./admin-icon-192.svg",
  "./admin-icon-512.svg",
  "./api/site-api.js",
  "./api/slots-api.js",
  "./api/socials-api.js",
  "./api/gallery-api.js",
  "./api/tos-api.js",
  "./api/uploads-api.js",
  "./api/pricing-api.js",
  "./api/commissions-api.js",
  "./api/progress-api.js",
  "./api/chat-api.js",
  "./js/constants.js",
  "./js/utils.js",
  "./js/legacy-app.js",
  "./js/clean-appearance.js",
  "./js/site-customization.js",
  "./js/runtime-stability.js",
  "./js/admin-app.js",
  "./js/admin-dashboard.js",
  "./js/admin-routing.js",
  "./js/admin-productivity.js",
  "./js/admin-inbox-workspace.js",
  "./js/admin-inbox-tools.js",
  "./js/admin-app-health.js",
  "./js/admin-pwa-updates.js",
  "./js/admin-mobile.js",
  "./js/admin-accessibility.js",
  "./js/autosync.js"
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
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(ADMIN_CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(event.request);
        if (hit) return hit;
        if (event.request.mode === "navigate") return caches.match("./admin.html");
        return Response.error();
      })
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
