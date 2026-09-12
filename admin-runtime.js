/*
  Dedicated admin runtime.
  Keeps the installed admin app and desktop admin dashboard on the same UI,
  while avoiding public-only page helpers from the general site loader.
*/
(function loadAdminScripts() {
  const version = "admin-runtime-1";
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

  for (const src of modules) {
    document.write(`<script src="${src}?v=${version}"><\/script>`);
  }
})();
