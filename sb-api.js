/*
  Commission Website API Loader - Stage 2
  Public pages keep the compatibility loader. The admin page now has one
  canonical boot owner: admin-runtime.js. Keeping admin enhancement loading out
  of this compatibility file prevents duplicate script tags, listeners, polling,
  and realtime setup while the unlocked runtime loads modules serially.
*/
(function loadApiScripts() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");

  if (onAdmin) return;

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