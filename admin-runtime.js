/* Admin-only runtime: hard-clean boot. */
(function initAdminRuntime() {
  const version = "admin-runtime-16";
  const demoPass = ["admin", "123"].join("");
  let bootPromise = null;

  const apiModules = [
    "./api/site-api.js", "./api/slots-api.js", "./api/socials-api.js",
    "./api/gallery-api.js", "./api/tos-api.js", "./api/uploads-api.js",
    "./api/pricing-api.js", "./api/commissions-api.js", "./api/progress-api.js",
    "./api/chat-api.js"
  ];
  const coreModules = [
    "./js/constants.js",
    "./js/utils.js",
    "./js/legacy-app.js",
    "./js/admin-dashboard-core.js",
    "./js/admin-controls-core.js"
  ];
  const enhancementModules = [
    "./js/admin-mobile.js",
    "./js/autosync.js",
    "./js/clean-appearance.js",
    "./js/admin-routing.js",
    "./js/admin-productivity.js",
    "./js/admin-dashboard-lite.js",
    "./js/admin-inbox-workspace.js",
    "./js/admin-inbox-tools.js",
    "./js/admin-read-sync.js",
    "./js/admin-app-health.js",
    "./js/admin-pwa-updates.js",
    "./js/admin-accessibility.js"
  ];

  function standaloneAdminMode() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }

  function isolateInstalledAdmin() {
    if (!standaloneAdminMode()) return;
    document.documentElement.dataset.adminStandalone = "true";
    document.querySelectorAll(".admin-header nav a").forEach(link => {
      if (!/admin\.html(?:$|[?#])/i.test(link.getAttribute("href") || "")) link.hidden = true;
    });
  }

  async function registerAdminServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const desiredScope = new URL("./admin.html", location.href).href;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => {
        const workerUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "";
        const isAdminWorker = /\/admin-sw\.js(?:$|[?#])/.test(workerUrl);
        if (isAdminWorker && registration.scope !== desiredScope) return registration.unregister();
        return Promise.resolve(false);
      }));
      await navigator.serviceWorker.register("./admin-sw.js", { scope: "./admin.html" });
    } catch (error) {
      console.warn("Admin service worker registration failed", error);
    }
  }

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
    isolateInstalledAdmin();
    registerAdminServiceWorker();
    setTimeout(registerAdminServiceWorker, 1800);
    loadOne("./js/admin-app.js").catch(error => {
      console.warn("Admin PWA shell failed to load", error);
    });
  }

  function loadOne(src, { external = false } = {}) {
    const target = new URL(src, location.href).pathname;
    const existing = [...document.scripts].find(script => {
      try { return new URL(script.src, location.href).pathname === target; }
      catch { return false; }
    });
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = external ? src : `${src}?v=${version}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadSerial(sources) {
    for (const src of sources) await loadOne(src);
  }

  async function loadEnhancementsBestEffort() {
    const failures = [];
    for (const src of enhancementModules) {
      try { await loadOne(src); }
      catch (error) {
        failures.push(src);
        console.warn(`Optional admin enhancement failed to load: ${src}`, error);
      }
    }
    return failures;
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

  async function ensureDataLayer() {
    if (!window.supabase) await loadOne("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", { external: true });
    if (!window.supabaseClient) await loadOne("./supabase-config.js");
    if (typeof window.getCommissions !== "function") await loadSerial(apiModules);
  }

  function revealDashboard() {
    document.getElementById("adminLogin")?.classList.add("hidden");
    document.getElementById("adminDashboard")?.classList.remove("hidden");
  }

  async function initializeCoreAdmin() {
    if (typeof window.initializeApp === "function") {
      try { window.initializeApp(); } catch (error) { console.warn("Core initializeApp failed", error); }
    }
    revealDashboard();
    window.installAdminDashboardNavigationRefresh?.();
    const jobs = [
      window.renderAdmin?.(), window.renderAdminGallery?.(), window.renderSlotAdmin?.(),
      window.loadSettingsAdmin?.(), window.updateAdminOverview?.(), window.refreshAdminDashboardCore?.()
    ].filter(Boolean);
    if (jobs.length) await Promise.allSettled(jobs);
  }

  async function bootAdminApplication() {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      document.documentElement.dataset.adminBoot = "loading";
      setLoginBusy(true);
      setBootStatus("Loading core admin tools…");
      try {
        await ensureDataLayer();
        await loadSerial(coreModules);
        await initializeCoreAdmin();
        setBootStatus("Loading workspace tools…");
        const enhancementFailures = await loadEnhancementsBestEffort();
        document.documentElement.dataset.adminBoot = enhancementFailures.length ? "ready-partial" : "ready";
        setBootStatus("");
        window.dispatchEvent(new CustomEvent("admin-runtime-ready", { detail: { enhancementFailures: [...enhancementFailures] } }));
      } catch (error) {
        document.documentElement.dataset.adminBoot = "error";
        sessionStorage.removeItem("adminOpen");
        setLoginBusy(false);
        setBootStatus("The core admin could not finish loading. Refresh and try again.", true);
        console.error("Admin runtime failed to load", error);
        bootPromise = null;
        throw error;
      }
    })();
    return bootPromise;
  }

  window.adminLogin = async function adminLoginShell() {
    const input = document.getElementById("adminPassword");
    if ((input?.value || "") !== demoPass) return alert("Wrong admin password.");
    sessionStorage.setItem("adminOpen", "true");
    await bootAdminApplication();
  };

  function prepareLogin() {
    const input = document.getElementById("adminPassword");
    if (!input) return;
    input.setAttribute("autocomplete", "current-password");
    input.setAttribute("enterkeyhint", "go");
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.repeat || input.disabled) return;
      event.preventDefault();
      window.adminLogin();
    });
    input.focus();
  }

  async function restoreOrPrepareLogin() {
    if (sessionStorage.getItem("adminOpen") === "true") {
      setBootStatus("Restoring studio…");
      try {
        await bootAdminApplication();
        return;
      } catch (_) {
        // bootAdminApplication clears the stale flag and exposes retry UI.
      }
    }
    prepareLogin();
  }

  wirePwaShell();
  document.documentElement.dataset.adminBoot = "idle";

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", restoreOrPrepareLogin, { once: true });
  else restoreOrPrepareLogin();
})();
