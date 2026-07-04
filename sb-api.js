/*
  Commission Website API Loader - Stage 1
  The original Supabase API functions now live in /api/core.js.
  This wrapper keeps all existing HTML script tags working.
*/
(function loadApiCore() {
  const version = "stage1-api19";
  document.write(`<script src="./api/core.js?v=${version}"><\/script>`);
})();
