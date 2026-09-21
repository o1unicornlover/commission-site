const ADMIN_CACHE = "commission-admin-v102";
const ADMIN_CACHE_PREFIX = "commission-admin-";
const ADMIN_SHELL = [
  "./admin.html", "./style.css", "./admin-runtime.js", "./admin-manifest.webmanifest",
  "./admin-icon.svg", "./admin-icon-192.svg", "./admin-icon-512.svg", "./supabase-config.js", "./sb-api.js",
  "./api/site-api.js", "./api/slots-api.js", "./api/socials-api.js", "./api/gallery-api.js", "./api/tos-api.js",
  "./api/uploads-api.js", "./api/pricing-api.js", "./api/commissions-api.js", "./api/progress-api.js", "./api/chat-api.js",
  "./js/constants.js", "./js/utils.js", "./js/legacy-app.js", "./js/admin-dashboard-core.js", "./js/admin-controls-core.js",
  "./js/admin-app.js", "./js/admin-mobile.js", "./js/autosync.js", "./js/clean-appearance.js",
  "./js/admin-routing.js", "./js/admin-productivity.js", "./js/admin-dashboard-lite.js", "./js/admin-inbox-workspace.js",
  "./js/admin-inbox-tools.js", "./js/admin-read-sync.js", "./js/admin-app-health.js", "./js/admin-pwa-updates.js", "./js/admin-accessibility.js"
];
const ADMIN_PATH = new URL("./admin.html", self.location.href).pathname;
const ADMIN_ASSET_PATHS = new Set(ADMIN_SHELL.map(path => new URL(path, self.location.href).pathname));
const normalizeCommissionId = value => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const id = String(value).trim();
  return id && id.length <= 128 && !/[\u0000-\u001F\u007F]/.test(id) ? id : "";
};
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(ADMIN_CACHE);
    try {
      await cache.addAll(ADMIN_SHELL);
      await self.skipWaiting();
    } catch (error) {
      // Do not leave a partially populated new-version cache behind. The
      // currently active worker/cache remains usable if an update download is
      // interrupted or one shell asset temporarily fails.
      await caches.delete(ADMIN_CACHE);
      throw error;
    }
  })());
});
self.addEventListener("activate", event => { event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(ADMIN_CACHE_PREFIX) && key !== ADMIN_CACHE).map(key => caches.delete(key)))), self.registration.navigationPreload?.enable?.().catch(() => {})]).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isAdminNavigation = event.request.mode === "navigate" && url.pathname === ADMIN_PATH;
  const isAdminAsset = ADMIN_ASSET_PATHS.has(url.pathname);
  if (!isAdminNavigation && !isAdminAsset) return;
  if (isAdminNavigation) {
    event.respondWith((async () => {
      const cached = await caches.match("./admin.html");
      try {
        const response = (await event.preloadResponse) || await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(ADMIN_CACHE);
          await cache.put("./admin.html", response.clone());
          return response;
        }
        return cached || response;
      } catch (_) {
        return cached || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(ADMIN_CACHE);
        await cache.put(event.request, response.clone());
        return response;
      }
      return cached || response;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const commissionId = normalizeCommissionId(event.notification?.data?.commissionId);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const adminClients = clients.filter(client => {
      try { const url = new URL(client.url); return url.origin === self.location.origin && url.pathname === ADMIN_PATH; }
      catch (_) { return false; }
    });
    const existing = adminClients.find(client => client.focused) || adminClients.find(client => client.visibilityState === "visible") || adminClients[0];
    if (existing) { existing.postMessage({ type: "open-inbox-commission", commissionId }); return existing.focus(); }
    const suffix = commissionId ? `#message-${encodeURIComponent(commissionId)}` : "#inbox";
    return self.clients.openWindow(`./admin.html${suffix}`);
  }));
});