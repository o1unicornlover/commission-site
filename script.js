/*
  Commission Website Refactor - Stage 2
  Loader for the gradually modularized frontend.
*/
(function loadAppScripts() {
  const version = "stage2-clean6";
  [
    "./js/constants.js",
    "./js/utils.js",
    "./js/legacy-app.js",
    "./js/clean-appearance.js",
    "./js/site-customization.js",
    "./js/runtime-stability.js",
    "./js/admin-app.js",
    "./js/autosync.js"
  ].forEach(src => {
    document.write(`<script src="${src}?v=${version}"><\/script>`);
  });
})();
