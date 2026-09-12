/*
  Admin-only runtime.
  Keep admin.html immediately responsive by loading the heavy Supabase/API/admin
  stack only after the admin session is unlocked. Public pages keep their own
  loader and visual system.
*/
(function initAdminRuntime() {
  const version = "admin-runtime-6";
  const TEMP_ADMIN_PASSWORD = "admin123"; // Temporary compatibility until Supabase Auth launch pass.
  let bootPromise = null;

  const apiModules = [
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
  ];

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
    "./js/admin-accessibility.js",
    "./js/autosync.js"
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

  function loadOne(src, { external = false } = {}) {
    const existing = [...document.scripts].find(script => {
      try {
        return new URL(script.src, location.href).pathname === new URL(src, location.href).pathname;
      } catch {
        return false;
      }
    });
    if (existing) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = external ? src : `${src}?v=${version}`;
      script.async = false;
      script.dataset.adminRuntime = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadSerial(sources) {
    for (const src of sources) await loadOne(src);
  }

  function setBootStatus(message, failed = false) {
    const login = document.getElementById("adminLogin");
    if (!login) return;
    let status = document.getElementById("adminBootStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "adminBootStatus";
      status.className = "small";
      status.setAttribute("role", "status");
      login.appendChild(status);
    }
    status.textContent = message || "";
    status.dataset.state = failed ? "error" : "loading";
  }

  function setLoginBusy(busy) {
    const button = document.querySelector('#adminLogin button[onclick*="adminLogin"]');
    const input = document.getElementById("adminPassword");
    if (button) {
      button.disabled = busy;
      button.textContent = busy ? "Opening studio…" : "Enter";
    }
    if (input) input.disabled = busy;
  }

  async function ensureSupabaseAndApi() {
    if (!window.supabase) {
      await loadOne("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", { external: true });
    }

    if (!window.supabaseClient) {
      await loadOne("./supabase-config.js");
    }

    if (typeof window.getCommissions !== "function") {
      await loadSerial(apiModules);
    }
  }

  function revealDashboard() {
    document.getElementById("adminLogin")?.classList.add("hidden");
    document.getElementById("adminDashboard")?.classList.remove("hidden");
  }

  async function initializeAdminViews() {
    revealDashboard();

    const tasks = [
      window.renderAdmin?.(),
      window.renderAdminGallery?.(),
      window.renderSlotAdmin?.(),
      window.loadSettingsAdmin?.(),
      window.updateAdminOverview?.()
    ].filter(Boolean);

    if (tasks.length) await Promise.allSettled(tasks);
  }

  async function bootAdminApplication() {
    if (bootPromise) return bootPromise;

    bootPromise = (async () => {
      document.documentElement.dataset.adminBoot = "loading";
      setLoginBusy(true);
      setBootStatus("Loading the admin workspace…");

      try {
        await ensureSupabaseAndApi();
        await loadSerial(foundationModules);

        /*
          Reliability over startup cleverness: the admin add-ons now load in one
          deterministic order after unlock. This avoids cross-module races and
          eliminates the previous pile-up of DOMContentLoaded replays at page load.
        */
        await loadSerial(featureModules);

        document.dispatchEvent(new Event("DOMContentLoaded"));
        await initializeAdminViews();

        document.documentElement.dataset.adminBoot = "ready";
        setBootStatus("");
        window.dispatchEvent(new CustomEvent("admin-runtime-ready"));
      } catch (error) {
        document.documentElement.dataset.adminBoot = "error";
        sessionStorage.removeItem("adminOpen");
        setLoginBusy(false);
        setBootStatus("The admin workspace could not finish loading. Refresh and try again.", true);
        console.error("Admin runtime failed to load", error);
        throw error;
      }
    })();

    return bootPromise;
  }

  async function loginShell() {
    const input = document.getElementById("adminPassword");
    const password = input?.value || "";
    if (password !== TEMP_ADMIN_PASSWORD) return alert("Wrong admin password.");

    sessionStorage.setItem("adminOpen", "true");
    await bootAdminApplication();
  }

  /*
    Define the login handler immediately. Heavy admin code is deliberately not
    loaded here; admin.html stays interactive even on a slow connection/device.
  */
  window.adminLogin = loginShell;
  wirePwaShell();

  const resumeExistingSession = () => {
    if (sessionStorage.getItem("adminOpen") === "true") {
      bootAdminApplication().catch(() => {});
    } else {
      document.documentElement.dataset.adminBoot = "idle";
      document.getElementById("adminPassword")?.focus();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resumeExistingSession, { once: true });
  } else {
    resumeExistingSession();
  }
})();
