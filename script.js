/*
  Commission Website Refactor - Stage 2
  Loader for the gradually modularized frontend.
*/
(function loadAppScripts() {
  const version = "stage2-ui40";
  [
    "./js/constants.js",
    "./js/utils.js",
    "./js/legacy-app.js",
    "./js/autosync.js"
  ].forEach(src => {
    document.write(`<script src="${src}?v=${version}"><\/script>`);
  });
})();
