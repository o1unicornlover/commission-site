/*
  Commission Website Refactor - Stage 2
  Loader for the gradually modularized frontend.
*/
(function loadAppScripts() {
  const version = "stage2-clean18";
  [
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
    "./js/admin-mobile.js",
    "./js/admin-accessibility.js",
    "./js/autosync.js"
  ].forEach(src => {
    document.write(`<script src="${src}?v=${version}"><\/script>`);
  });
})();
