/*
  Dedicated admin runtime.
  Keeps the installed admin app and desktop admin dashboard on the same UI,
  while avoiding public-only page helpers from the general site loader.
*/
(function loadAdminScripts() {
  const version = "admin-runtime-5";
  const foundationModules = [
    "./js/constants.js",
    "./js/utils.js",
    "./js/legacy-app.js"
  ];
  const featureModules = [
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
    "./js/admin-accessibility.js"
  ];

  function wirePwaShell() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = "./admin-manifest.webmanifest";
      document.head.appendChild(manifest);
    }

    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement("meta");
      theme.name = "theme-color";
      theme.content = "#ff4da8";
      document.head.appendChild(theme);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./admin-sw.js")
        .catch(error => console.warn("Admin service worker registration failed", error));
    }
  }

  function loadOne(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}?v=${version}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadSerial(sources) {
    for (const src of sources) await loadOne(src);
  }

  function adminUnlocked() {
    const dashboard = document.getElementById("adminDashboard");
    return Boolean(dashboard && !dashboard.classList.contains("hidden"));
  }

  function gateRead(name, emptyValue) {
    const original = window[name];
    if (typeof original !== "function" || original.__adminLoginGate) return;

    const wrapped = function (...args) {
      if (!adminUnlocked()) return Promise.resolve(emptyValue);
      return original.apply(this, args);
    };
    wrapped.__adminLoginGate = true;
    wrapped.__adminOriginal = original;
    window[name] = wrapped;
  }

  function gateHeavyAdminReads() {
    /*
      Several optional admin widgets initialize together and each used to start
      its own commission/chat refresh while the login screen was still visible.
      On larger histories that created a burst of duplicate Supabase requests
      before the user could even press Enter. Keep those reads dormant until
      the existing admin dashboard is actually unlocked; after login the exact
      same API functions and data behavior are used.
    */
    gateRead("getCommissions", []);
    gateRead("getChatMessages", []);
    gateRead("getSlots", []);
  }

  async function boot() {
    document.documentElement.dataset.adminBoot = "loading";
    try {
      /*
        Load the dependency foundation in order, then fetch independent admin
        feature modules together. They attach their DOMContentLoaded handlers
        before the single replay below, so the dashboard initializes once while
        avoiding a long serial waterfall.
      */
      await loadSerial(foundationModules);
      gateHeavyAdminReads();
      await Promise.all(featureModules.map(loadOne));
      await loadOne("./js/autosync.js");

      if (document.readyState !== "loading") {
        document.dispatchEvent(new Event("DOMContentLoaded"));
      }

      document.documentElement.dataset.adminBoot = "ready";
      window.dispatchEvent(new CustomEvent("admin-runtime-ready"));
    } catch (error) {
      document.documentElement.dataset.adminBoot = "error";
      console.error("Admin runtime failed to load", error);
    }
  }

  /* Manifest + service worker must not depend on the heavier admin modules. */
  wirePwaShell();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
