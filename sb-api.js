/*
  Commission Website API Loader - Stage 2
  Public pages keep the compatibility loader. The admin page loads its API
  modules lazily from admin-runtime.js after unlock so admin.html can paint and
  accept input immediately instead of blocking on ten extra scripts.
*/
(function loadApiScripts() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");

  if (onAdmin) {
    let liveSyncLoaded = false;

    function loadAdminLiveSync() {
      if (liveSyncLoaded) return;
      liveSyncLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/autosync.js?v=admin-live1";
      script.async = false;
      script.onload = () => {
        if (typeof window.setupRealtime === "function") {
          try { window.setupRealtime(); }
          catch (error) { console.warn("Admin realtime setup failed", error); }
        }
      };
      script.onerror = () => {
        liveSyncLoaded = false;
        console.warn("Admin live sync module failed to load");
      };
      document.body.appendChild(script);
    }

    window.addEventListener("admin-runtime-ready", loadAdminLiveSync, { once: true });
    if (document.documentElement.dataset.adminBoot === "ready") {
      queueMicrotask(loadAdminLiveSync);
    }
    return;
  }

  const version = "stage2-api21";
  [
    "./api/site-api.js",
    "./api/slots-api.js",
    "./api/socials-api.js",
    "./api/gallery-api.js",
    "./api/tos-api.js",
    "./api/uploads-api.js",
    "./api/pricing-api.js",
    "./api/commissions-api.js",
    "./api/progress-api.js",
    "./api/chat-api.js"
  ].forEach(src => {
    document.write(`<script src="${src}?v=${version}"><\/script>`);
  });
})();
