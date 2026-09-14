/*
  Commission Website Refactor - Stage 2
  Loader for the gradually modularized public frontend.

  Admin/PWA modules intentionally do not load here. The admin app has its own
  post-unlock runtime, so keeping this list public-only avoids shipping inbox,
  dashboard, notification, routing, and mobile-admin code to every visitor.
*/
(function loadAppScripts() {
  const version = "stage2-clean30";
  [
    "./js/constants.js",
    "./js/utils.js",
    "./js/legacy-app.js",
    "./js/clean-appearance.js",
    "./js/character-carousel.js",
    "./js/fixed-visual-system.js",
    "./js/slot-capacity.js",
    "./js/runtime-stability.js",
    "./js/client-progress-tools.js",
    "./js/autosync.js"
  ].forEach(src => {
    document.write(`<script src="${src}?v=${version}"><\/script>`);
  });
})();