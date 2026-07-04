/*
  Commission Website Refactor - Stage 1
  This tiny loader keeps the old global functions working while the codebase
  is gradually moved into organized modules.
*/
(function loadLegacyApp() {
  const version = "stage1-ui39";
  document.write(`<script src="./js/legacy-app.js?v=${version}"><\/script>`);
})();
