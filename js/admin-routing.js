/* Admin app routing + commission message shortcuts. Keeps the single style.css visual system intact. */
(function initAdminRouting() {
  const onAdmin = /(^|\/)admin\.html$/i.test(location.pathname) || location.pathname.endsWith("/admin.html");
  if (!onAdmin || window.__adminRoutingReady) return;
  window.__adminRoutingReady = true;

  let routeTimer = null;
  let commissionListObserver = null;
  let pendingCommissionRoute = "";
  const PENDING_ROUTE_KEY = "adminPendingMessageRoute";
  const PAGE_HASHES = new Map([
    ["#home", "overview"],
    ["#inbox", "inbox"],
    ["#commissions", "commissions"]
  ]);

  function decodeMessageHash() {
    if (!location.hash.startsWith("#message-")) return "";
    try { return decodeURIComponent(location.hash.slice("#message-".length)); }
    catch { return location.hash.slice("#message-".length); }
  }

  function consumePreloginRoute() {
    const id = String(sessionStorage.getItem(PENDING_ROUTE_KEY) || "").trim();
    if (id) sessionStorage.removeItem(PENDING_ROUTE_KEY);
    return id;
  }

  async function openInboxConversation(commissionId, options = {}) {
    const id = String(commissionId || "").trim();
    window.showAdminPage?.("inbox", "message-route");
    if (!id) return;

    clearTimeout(routeTimer);
    if (options.updateHash !== false) history.replaceState(null, "", `#message-${encodeURIComponent(id)}`);

    if (typeof window.openAdminInboxThread === "function") {
      pendingCommissionRoute = "";
      await window.openAdminInboxThread(id);
      return;
    }

    let attempts = 0;
    const tryOpen = () => {
      attempts += 1;
      if (typeof window.openAdminInboxThread === "function") {
        pendingCommissionRoute = "";
        window.openAdminInboxThread(id);
        return;
      }
      const escapedId = window.CSS?.escape ? CSS.escape(id) : id.replace(/["\\]/g, "\\$&");
      const card = document.querySelector(`[data-inbox-commission="${escapedId}"]`);
      const openButton = card?.querySelector("[data-open-inbox-commission]");
      if (openButton) {
        pendingCommissionRoute = "";
        openButton.click();
        return;
      }
      if (attempts < 25) routeTimer = setTimeout(tryOpen, 120);
      else pendingCommissionRoute = id;
    };
    tryOpen();
  }

  function flushPendingCommissionRoute() {
    if (!pendingCommissionRoute) return;
    const id = pendingCommissionRoute;
    pendingCommissionRoute = "";
    openInboxConversation(id);
  }

  window.openAdminInboxConversation = openInboxConversation;

  function addCommissionQuickLinks() {
    const list = document.getElementById("adminList");
    if (!list) return;
    list.querySelectorAll("[data-commission-id]").forEach(card => {
      if (card.querySelector("[data-quick-open-inbox]")) return;
      const id = card.getAttribute("data-commission-id");
      if (!id) return;
      const actionRow = card.querySelector(".button-row");
      if (!actionRow) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.dataset.quickOpenInbox = id;
      button.textContent = "Open Messages";
      button.addEventListener("click", event => {
        event.stopPropagation();
        openInboxConversation(id);
      });
      actionRow.appendChild(button);
    });
  }

  function observeCommissionList() {
    const list = document.getElementById("adminList");
    if (!list || commissionListObserver) return;
    commissionListObserver = new MutationObserver(addCommissionQuickLinks);
    commissionListObserver.observe(list, { childList: true, subtree: true });
  }

  function routeFromHash() {
    const id = decodeMessageHash();
    if (id) {
      pendingCommissionRoute = id;
      setTimeout(() => openInboxConversation(id, { updateHash: false }), 700);
      return;
    }
    const page = PAGE_HASHES.get(location.hash.toLowerCase());
    if (page) setTimeout(() => window.showAdminPage?.(page, "pwa-route"), 100);
  }

  function startRouting() {
    addCommissionQuickLinks();
    observeCommissionList();
    const preloginId = consumePreloginRoute();
    if (preloginId) {
      pendingCommissionRoute = preloginId;
      setTimeout(() => openInboxConversation(preloginId), 100);
    } else routeFromHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startRouting, { once: true });
  } else {
    startRouting();
  }

  window.addEventListener("admin-runtime-ready", () => {
    addCommissionQuickLinks();
    observeCommissionList();
    flushPendingCommissionRoute();
    if (!pendingCommissionRoute) routeFromHash();
  });
  window.addEventListener("admin-page-change", event => {
    if (event.detail?.page === "commissions") queueMicrotask(addCommissionQuickLinks);
    if (event.detail?.page === "inbox") queueMicrotask(flushPendingCommissionRoute);
  });
  window.addEventListener("hashchange", routeFromHash);

  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.data?.type !== "open-inbox-commission") return;
    const id = String(event.data?.commissionId || "").trim();
    if (id) {
      pendingCommissionRoute = id;
      openInboxConversation(id);
    } else window.showAdminPage?.("inbox", "notification-route");
  });
})();