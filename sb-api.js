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
    let adminAppLoaded = false;
    let mobileNavLoaded = false;
    let appHealthLoaded = false;
    let pwaUpdatesLoaded = false;
    let appearanceGuardLoaded = false;
    let adminRoutingLoaded = false;
    let adminProductivityLoaded = false;
    let adminDashboardLoaded = false;
    let inboxWorkspaceLoaded = false;
    let inboxToolsLoaded = false;

    function loadAdminAppShell() {
      if (adminAppLoaded || document.querySelector('script[data-admin-app-shell]')) return;
      adminAppLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-app.js?v=admin-inbox1";
      script.async = false;
      script.dataset.adminAppShell = "true";
      script.onerror = () => {
        adminAppLoaded = false;
        script.remove();
        console.warn("Admin inbox/alert module failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminMobileNav() {
      if (mobileNavLoaded || document.querySelector('script[data-admin-mobile-nav]')) return;
      mobileNavLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-mobile.js?v=admin-mobile2";
      script.async = false;
      script.dataset.adminMobileNav = "true";
      script.onerror = () => {
        mobileNavLoaded = false;
        script.remove();
        console.warn("Admin mobile navigation failed to load");
      };
      document.body.appendChild(script);
    }

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

    function loadAdminAppearanceGuard() {
      if (appearanceGuardLoaded || document.querySelector('script[data-admin-appearance-guard]')) return;
      appearanceGuardLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/clean-appearance.js?v=admin-appearance2";
      script.async = false;
      script.dataset.adminAppearanceGuard = "true";
      script.onerror = () => {
        appearanceGuardLoaded = false;
        script.remove();
        console.warn("Admin single-appearance guard failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminRouting() {
      if (adminRoutingLoaded || document.querySelector('script[data-admin-routing]')) return;
      adminRoutingLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-routing.js?v=admin-routing2";
      script.async = false;
      script.dataset.adminRouting = "true";
      script.onerror = () => {
        adminRoutingLoaded = false;
        script.remove();
        console.warn("Admin routing module failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminProductivity() {
      if (adminProductivityLoaded || document.querySelector('script[data-admin-productivity]')) return;
      adminProductivityLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-productivity.js?v=admin-productivity2";
      script.async = false;
      script.dataset.adminProductivity = "true";
      script.onerror = () => {
        adminProductivityLoaded = false;
        script.remove();
        console.warn("Admin productivity tools failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminDashboard() {
      if (adminDashboardLoaded || document.querySelector('script[data-admin-dashboard-lite]')) return;
      adminDashboardLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-dashboard-lite.js?v=admin-dashboard1";
      script.async = false;
      script.dataset.adminDashboardLite = "true";
      script.onerror = () => {
        adminDashboardLoaded = false;
        script.remove();
        console.warn("Admin dashboard overview failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminInboxWorkspace() {
      if (inboxWorkspaceLoaded || document.querySelector('script[data-admin-inbox-workspace]')) return;
      inboxWorkspaceLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-inbox-workspace.js?v=admin-inbox-workspace2";
      script.async = false;
      script.dataset.adminInboxWorkspace = "true";
      script.onload = loadAdminInboxTools;
      script.onerror = () => {
        inboxWorkspaceLoaded = false;
        script.remove();
        console.warn("Admin inline inbox workspace failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminInboxTools() {
      if (inboxToolsLoaded || document.querySelector('script[data-admin-inbox-tools]')) return;
      inboxToolsLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-inbox-tools.js?v=admin-inbox-tools2";
      script.async = false;
      script.dataset.adminInboxTools = "true";
      script.onerror = () => {
        inboxToolsLoaded = false;
        script.remove();
        console.warn("Admin inbox tools failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminAppHealth() {
      if (appHealthLoaded || document.querySelector('script[data-admin-app-health]')) return;
      appHealthLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-app-health.js?v=admin-health2";
      script.async = false;
      script.dataset.adminAppHealth = "true";
      script.onload = loadAdminPwaUpdates;
      script.onerror = () => {
        appHealthLoaded = false;
        script.remove();
        console.warn("Admin app status module failed to load");
      };
      document.body.appendChild(script);
    }

    function loadAdminPwaUpdates() {
      if (pwaUpdatesLoaded || document.querySelector('script[data-admin-pwa-updates]')) return;
      pwaUpdatesLoaded = true;

      const script = document.createElement("script");
      script.src = "./js/admin-pwa-updates.js?v=admin-updates2";
      script.async = false;
      script.dataset.adminPwaUpdates = "true";
      script.onerror = () => {
        pwaUpdatesLoaded = false;
        script.remove();
        console.warn("Admin app update controls failed to load");
      };
      document.body.appendChild(script);
    }

    function loadUnlockedAdminLayers() {
      loadAdminMobileNav();
      loadAdminLiveSync();
      loadAdminAppearanceGuard();
      loadAdminRouting();
      loadAdminProductivity();
      loadAdminDashboard();
      loadAdminInboxWorkspace();
      loadAdminAppHealth();
    }

    // admin-app.js is intentionally lightweight before unlock: it wires the
    // install/inbox/notification shell, but its data reads safely no-op until
    // admin-runtime.js has loaded the API layer. Keep the heavier feature stack
    // out of startup while responsiveness is being rebuilt module by module.
    loadAdminAppShell();

    window.addEventListener("admin-runtime-ready", loadUnlockedAdminLayers, { once: true });
    if (document.documentElement.dataset.adminBoot === "ready") {
      queueMicrotask(loadUnlockedAdminLayers);
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