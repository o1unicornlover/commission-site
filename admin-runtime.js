/*
  Dedicated admin runtime.
  Keeps the installed admin app and desktop admin dashboard on the same UI,
  while avoiding public-only page helpers from the general site loader.
*/
(function loadAdminScripts() {
  const version = "admin-runtime-2";
  const modules = [
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

  async function boot() {
    document.documentElement.dataset.adminBoot = "loading";
    try {
      for (const src of modules) await loadOne(src);
      document.documentElement.dataset.adminBoot = "ready";
      window.dispatchEvent(new CustomEvent("admin-runtime-ready"));
    } catch (error) {
      document.documentElement.dataset.adminBoot = "error";
      console.error("Admin runtime failed to load", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
